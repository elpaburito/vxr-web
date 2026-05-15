import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw, MapPin, CreditCard, Calendar,
  Home, ShieldCheck, Clock, Wrench, MessageCircle, FileText,
  AlertCircle, Loader2, ChevronRight, CheckCircle2,
  AlertTriangle, Circle, LogOut, X,
} from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import AppHeader from "./components/AppHeader.jsx";
import { fetchMyActiveContract, normalizeContract } from "./lib/contractsService";
import { fetchMyReports } from "./lib/reportsService";
import { getOrCreateConversation } from "./lib/messagingService";
import {
  getTermination,
  requestTermination,
  acceptMutualTermination,
  withdrawMutualTermination,
  confirmTenantVacated,
} from "./lib/postRentService";
import { Card, Button, Badge } from "./components/vxr";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};
const fmtMoney = (n) => {
  if (n == null || Number(n) === 0) return "Not set";
  return `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

function nextDueDate(contract) {
  const lastPaid = contract.payment?.paidAt ?? contract.startDate;
  if (!lastPaid) return null;
  const base = new Date(lastPaid);
  return new Date(base.getFullYear(), base.getMonth() + 1, base.getDate());
}

function daysUntilDue(dueDate) {
  if (!dueDate) return null;
  return Math.ceil((dueDate - new Date()) / 86400000);
}

function dueChip(days) {
  if (days === null) return { label: "No prior payment", tone: "neutral" };
  if (days < 0) return { label: `${-days}d overdue`, tone: "danger" };
  if (days === 0) return { label: "Due today", tone: "warning" };
  if (days <= 5) return { label: `Due in ${days}d`, tone: "warning" };
  return { label: `Due in ${days}d`, tone: "success" };
}

const REPORT_STATUS = {
  open: { label: "Open", tone: "warning", Icon: Circle },
  in_progress: { label: "In Progress", tone: "info", Icon: AlertTriangle },
  resolved: { label: "Resolved", tone: "success", Icon: CheckCircle2 },
};

const REPORT_PRIORITIES = [
  { value: "low", label: "Low", color: "text-vxr-success" },
  { value: "medium", label: "Medium", color: "text-vxr-warning" },
  { value: "high", label: "High", color: "text-vxr-danger" },
];

export default function InStayDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState(null);
  const [rawContract, setRawContract] = useState(null);
  const [termination, setTermination] = useState(null);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [terminateModal, setTerminateModal] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (isAuthenticated === false) navigate("/login");
  }, [isAuthenticated, navigate]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: contractRow, error: cErr }, { data: rpts, error: rErr }] =
        await Promise.all([
          fetchMyActiveContract(user.id),
          fetchMyReports(user.id),
        ]);
      if (cErr) throw cErr;
      if (rErr) throw rErr;
      setRawContract(contractRow ?? null);
      setContract(contractRow ? normalizeContract(contractRow) : null);
      setReports(rpts ?? []);

      if (contractRow?.id) {
        const { data: term } = await getTermination(contractRow.id);
        setTermination(term ?? null);
      } else {
        setTermination(null);
      }
    } catch (e) {
      setError(e?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const listing = contract?.listings ?? {};
  const listingLocation =
    listing.full_address ||
    [listing.city, listing.province].filter(Boolean).join(", ") ||
    contract?.propertyAddress ||
    "Address unavailable";
  const due = contract ? nextDueDate(contract) : null;
  const days = daysUntilDue(due);
  const chip = dueChip(days);
  const movedIn = contract?.startDate ? new Date(contract.startDate) : null;
  const daysIn = movedIn
    ? Math.max(0, Math.ceil((new Date() - movedIn) / 86400000))
    : null;
  const recentRpts = reports.slice(0, 3);

  const handleChatLandlord = async () => {
    if (!contract?.landlordId) return;
    const { data, error } = await getOrCreateConversation(
      user.id,
      contract.landlordId,
      contract.listingId
    );
    if (error || !data?.id) {
      alert("Could not open chat. Try again.");
      return;
    }
    navigate(`/messages?c=${data.id}`);
  };

  const contractStatus = rawContract?.status ?? null;
  const isMTM = rawContract?.listing_type === "rent";
  const inTerminationFlow = ["terminating", "expiring", "terminated", "ended", "closed"].includes(contractStatus);
  const mutualPending =
    !!termination &&
    termination.type === "mutual" &&
    !(termination.mutual_accepted_by_tenant_at && termination.mutual_accepted_by_landlord_at) &&
    !termination.mutual_withdrawn_at;
  const tenantProposedMutual = mutualPending && termination?.initiated_by === "tenant";
  const landlordProposedMutual = mutualPending && termination?.initiated_by === "landlord";
  const effectiveDate = termination?.effective_date ? new Date(termination.effective_date) : null;
  const daysUntilEffective = effectiveDate
    ? Math.ceil((effectiveDate - new Date()) / 86400000)
    : null;
  const canConfirmVacated =
    !!termination &&
    !termination.tenant_vacated_confirmed_at &&
    (daysUntilEffective === null || daysUntilEffective <= 0);

  const submitTermination = async ({ type, reason }) => {
    if (!rawContract?.id) return;
    setActionBusy(true);
    const { error: tErr } = await requestTermination({
      contractId: rawContract.id,
      type,
      reason,
      initiatedBy: "tenant",
    });
    setActionBusy(false);
    if (tErr) {
      alert(tErr.message);
      return;
    }
    setTerminateModal(false);
    await load();
  };

  const onAcceptMutual = async () => {
    setActionBusy(true);
    const { error: aErr } = await acceptMutualTermination({
      contractId: rawContract.id,
      role: "tenant",
    });
    setActionBusy(false);
    if (aErr) {
      alert(aErr.message);
      return;
    }
    await load();
  };

  const onWithdrawMutual = async () => {
    if (!confirm("Withdraw your termination proposal?")) return;
    setActionBusy(true);
    const { error: wErr } = await withdrawMutualTermination({ contractId: rawContract.id });
    setActionBusy(false);
    if (wErr) {
      alert(wErr.message);
      return;
    }
    await load();
  };

  const onConfirmVacated = async () => {
    if (!confirm("Confirm you have fully vacated the unit? This cannot be undone.")) return;
    setActionBusy(true);
    const { error: vErr } = await confirmTenantVacated({ contractId: rawContract.id });
    setActionBusy(false);
    if (vErr) {
      alert(vErr.message);
      return;
    }
    await load();
  };

  const onOverrideMoveOut = async () => {
    const daysLeft = daysUntilEffective ?? 0;
    if (
      !confirm(
        `You are confirming early move-out — ${daysLeft} day${daysLeft === 1 ? "" : "s"} before the effective date.\n\nRent obligations may still apply until the effective date. This action cannot be undone.`
      )
    )
      return;
    setActionBusy(true);
    const { error: vErr } = await confirmTenantVacated({ contractId: rawContract.id });
    setActionBusy(false);
    if (vErr) {
      alert(vErr.message);
      return;
    }
    await load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vxr-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-vxr-accent" size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-vxr-bg flex flex-col items-center justify-center gap-3 px-6">
        <AlertCircle size={36} className="text-vxr-danger" />
        <p className="font-body text-vxr-text text-sm text-center">{error}</p>
        <Button variant="ghost" size="sm" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  if (!contract) {
    return <EmptyContractView onBack={() => navigate(-1)} />;
  }

  return (
    <div className="min-h-screen bg-vxr-bg flex flex-col">
      <AppHeader showBack />

      {/* Hero */}
      <div className="relative bg-vxr-gradient overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -left-8 w-36 h-36 rounded-full bg-white/[0.07]" />
        <div className="relative max-w-7xl mx-auto px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-body text-[11px] font-bold uppercase tracking-wider text-white/80 mb-2">
                ViewxRent · Tenant
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {listing.title ?? contract.propertyAddress ?? "My Rental"}
              </h1>
              <div className="flex items-center gap-1.5 mt-2 text-white/90">
                <MapPin size={14} />
                <span className="font-body text-sm">{listingLocation}</span>
              </div>
            </div>
            <button
              onClick={load}
              className="w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="-mt-8 flex-1 max-w-7xl mx-auto w-full px-6 pb-12 space-y-4 relative z-10">
        {/* Banners */}
        {inTerminationFlow && (
          <TerminationBanner
            status={contractStatus}
            termination={termination}
            daysUntilEffective={daysUntilEffective}
            canConfirmVacated={canConfirmVacated}
            actionBusy={actionBusy}
            onConfirmVacated={onConfirmVacated}
            onOverrideMoveOut={onOverrideMoveOut}
          />
        )}

        {mutualPending && tenantProposedMutual && (
          <InfoBanner
            tone="warning"
            title="Mutual termination — waiting on landlord"
            body="You've proposed an early end to your fixed-term lease. The landlord must accept before it takes effect."
            actionLabel="Withdraw proposal"
            onAction={onWithdrawMutual}
            actionBusy={actionBusy}
          />
        )}

        {mutualPending && landlordProposedMutual && (
          <InfoBanner
            tone="warning"
            title="Landlord proposed mutual termination"
            body={
              termination?.reason ||
              "Review and respond to the landlord's request to end your fixed-term lease early."
            }
            actionLabel="Accept proposal"
            onAction={onAcceptMutual}
            actionBusy={actionBusy}
          />
        )}

        {(!contract.monthlyRent || !contract.startDate) && (
          <InfoBanner
            tone="info"
            title="Some lease details are missing"
            body="Your contract is missing rent, deposit, or move-in info. Contact your landlord to update it — once they save, your dashboard will reflect the correct numbers."
          />
        )}

        {/* Next Payment */}
        <Card className="p-6 shadow-vxr-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-vxr-accent" />
              <span className="font-body text-[11px] font-bold tracking-wider text-vxr-text-sub uppercase">
                Next Rent Cycle
              </span>
            </div>
            <Badge tone={chip.tone}>{chip.label}</Badge>
          </div>

          <div className="flex items-end gap-1 mb-1">
            {contract.monthlyRent ? (
              <>
                <span className="font-display text-lg font-semibold text-vxr-text">₱</span>
                <span className="font-display text-4xl font-extrabold text-vxr-text leading-none">
                  {Number(contract.monthlyRent).toLocaleString("en-PH")}
                </span>
                <span className="font-body text-sm text-vxr-text-muted mb-1 ml-1">/month</span>
              </>
            ) : (
              <span className="font-display text-2xl font-bold text-vxr-text-muted leading-none">
                Not set
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 font-body text-xs text-vxr-text-muted mb-5">
            <Calendar size={13} />
            <span>Due {due ? fmtDate(due.toISOString()) : "—"}</span>
          </div>

          <Button
            fullWidth
            icon={CreditCard}
            onClick={() => navigate("/my-payments")}
          >
            Pay Next Month
          </Button>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon={Calendar} label="Days in stay" value={daysIn ?? "—"} />
          <StatTile icon={Clock} label="Lease term" value={contract.duration || "—"} />
          <StatTile
            icon={ShieldCheck}
            label="Deposit"
            value={
              contract.securityDeposit
                ? `₱${Number(contract.securityDeposit).toLocaleString()}`
                : "—"
            }
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          <ActionTile
            icon={CreditCard}
            label="Pay Rent"
            onClick={() => navigate("/my-payments")}
          />
          <ActionTile icon={Wrench} label="Report" onClick={() => navigate("/reports")} />
          <ActionTile icon={MessageCircle} label="Chat" onClick={handleChatLandlord} />
          <ActionTile
            icon={FileText}
            label="Contract"
            onClick={() => navigate(`/contract/${contract.id}`)}
          />
        </div>

        {/* Lease Details */}
        <SectionCard title="Lease Details">
          <DetailRow
            label="Type"
            value={contract.type === "month_to_month" ? "Month-to-Month" : "Fixed-Term"}
          />
          <DetailRow label="Term" value={contract.duration || "—"} />
          <DetailRow label="Move-in" value={fmtDate(contract.startDate)} />
          <DetailRow label="Move-out" value={fmtDate(contract.endDate)} />
          <hr className="border-vxr-border my-2" />
          <DetailRow label="Monthly rent" value={fmtMoney(contract.monthlyRent)} />
          <DetailRow label="Security deposit" value={fmtMoney(contract.securityDeposit)} />
          <DetailRow label="Advance rent" value={fmtMoney(contract.advanceRent)} />
          {contract.paymentDueDate && (
            <DetailRow label="Due day" value={`${contract.paymentDueDate}th of each month`} />
          )}
          {contract.gracePeriodDays > 0 && (
            <DetailRow label="Grace period" value={`${contract.gracePeriodDays} days`} />
          )}
          {contract.lateFee > 0 && (
            <DetailRow label="Late fee" value={fmtMoney(contract.lateFee)} />
          )}
        </SectionCard>

        {/* Recent Maintenance Reports */}
        <SectionCard
          title="Maintenance Reports"
          action={
            <Button size="sm" onClick={() => navigate("/reports")}>
              + New
            </Button>
          }
        >
          {recentRpts.length === 0 ? (
            <p className="font-body text-vxr-text-muted text-sm text-center py-4">
              No reports yet.
            </p>
          ) : (
            <div className="space-y-2">
              {recentRpts.map((r, i) => (
                <ReportRow
                  key={r.id}
                  report={r}
                  last={i === recentRpts.length - 1}
                  onClick={() => navigate("/reports")}
                />
              ))}
            </div>
          )}
          {reports.length > 3 && (
            <button
              onClick={() => navigate("/reports")}
              className="mt-3 w-full text-center font-body text-xs font-semibold text-vxr-accent hover:underline"
            >
              See all {reports.length} reports
            </button>
          )}
        </SectionCard>

        {contractStatus === "paid" && !termination && (
          <SectionCard title="Lease Actions">
            <button
              onClick={() => setTerminateModal(true)}
              className="w-full flex items-center justify-between gap-3 py-3 px-3 rounded-vxr-md border border-vxr-danger/20 hover:bg-vxr-danger-soft transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-vxr-danger-soft flex items-center justify-center">
                  <LogOut size={16} className="text-vxr-danger" />
                </div>
                <div className="text-left">
                  <p className="font-display text-sm font-bold text-vxr-text">
                    Terminate Contract
                  </p>
                  <p className="font-body text-[11px] text-vxr-text-sub">
                    {isMTM
                      ? "30-day notice required for month-to-month."
                      : "Fixed-term — request mutual termination from your landlord."}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-vxr-text-muted" />
            </button>
          </SectionCard>
        )}
      </div>

      {terminateModal && (
        <TerminationModal
          isMTM={isMTM}
          busy={actionBusy}
          onClose={() => setTerminateModal(false)}
          onSubmit={submitTermination}
        />
      )}
    </div>
  );
}

function EmptyContractView({ onBack }) {
  return (
    <div className="min-h-screen bg-vxr-bg flex flex-col">
      <AppHeader showBack />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="w-24 h-24 rounded-full bg-vxr-accent-soft flex items-center justify-center">
          <Home size={40} className="text-vxr-accent" />
        </div>
        <h2 className="font-display text-xl font-extrabold text-vxr-text">
          No active rental yet
        </h2>
        <p className="font-body text-vxr-text-sub text-sm leading-relaxed max-w-xs">
          Apply to a listing, sign the contract, and complete your first payment — your
          in-stay dashboard will appear here.
        </p>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <Card className="p-4">
      <div className="w-9 h-9 rounded-vxr-sm bg-vxr-accent-soft flex items-center justify-center mb-2.5">
        <Icon size={15} className="text-vxr-accent" />
      </div>
      <p className="font-display text-sm font-bold text-vxr-text leading-tight truncate">
        {value}
      </p>
      <p className="font-body text-[11px] text-vxr-text-muted mt-0.5">{label}</p>
    </Card>
  );
}

function ActionTile({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-vxr-surface rounded-vxr border border-vxr-border shadow-vxr-sm py-4 flex flex-col items-center gap-2 hover:shadow-vxr-md transition active:scale-95"
    >
      <div className="w-11 h-11 rounded-full bg-vxr-accent-soft flex items-center justify-center">
        <Icon size={20} className="text-vxr-accent" />
      </div>
      <span className="font-body text-[11px] font-semibold text-vxr-text">{label}</span>
    </button>
  );
}

function SectionCard({ title, action, children }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-vxr-accent" />
          <span className="font-display text-sm font-bold text-vxr-text">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="font-body text-xs text-vxr-text-muted w-36 flex-shrink-0">{label}</span>
      <span className="font-body text-sm font-semibold text-vxr-text text-right">{value}</span>
    </div>
  );
}

function ReportRow({ report, last, onClick }) {
  const status = REPORT_STATUS[report.status] ?? REPORT_STATUS.open;
  const priority = REPORT_PRIORITIES.find((p) => p.value === report.priority);
  const hasResponse = !!report.landlord_response;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 py-2 hover:bg-vxr-surface2/50 transition rounded ${
        !last ? "border-b border-vxr-border" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm font-bold text-vxr-text truncate">
          {report.title}
        </p>
        <div className="flex items-center gap-1.5 font-body text-[11px] text-vxr-text-muted">
          <span>{fmtDate(report.created_at)}</span>
          {priority && (
            <>
              <span>·</span>
              <span className={priority.color}>{priority.label}</span>
            </>
          )}
          {hasResponse && (
            <>
              <span>·</span>
              <span className="text-vxr-accent font-semibold">Reply</span>
            </>
          )}
        </div>
      </div>
      <Badge tone={status.tone}>{status.label}</Badge>
      <ChevronRight size={14} className="text-vxr-text-muted flex-shrink-0" />
    </button>
  );
}

const STATUS_COPY = {
  terminating: { tone: "warning", title: "Termination in progress" },
  expiring: { tone: "warning", title: "Lease ending soon — non-renewal" },
  terminated: { tone: "warning", title: "Contract terminated — awaiting close-out" },
  ended: { tone: "warning", title: "Lease ended — awaiting close-out" },
  closed: { tone: "neutral", title: "Contract closed" },
};

function TerminationBanner({
  status,
  termination,
  daysUntilEffective,
  canConfirmVacated,
  actionBusy,
  onConfirmVacated,
  onOverrideMoveOut,
}) {
  const copy = STATUS_COPY[status] ?? STATUS_COPY.terminating;
  const isWarn = copy.tone === "warning";
  const containerCls = isWarn
    ? "bg-vxr-warning-soft border-vxr-warning/30 text-vxr-warning"
    : "bg-vxr-surface2 border-vxr-border text-vxr-text";

  const effective = termination?.effective_date
    ? new Date(termination.effective_date)
    : null;
  const effectiveLabel = effective ? fmtDate(effective.toISOString()) : "—";
  const reason = termination?.reason;
  const vacatedAt = termination?.tenant_vacated_confirmed_at;

  return (
    <div className={`rounded-vxr-md p-4 border ${containerCls}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-bold">{copy.title}</p>
          <div className="mt-1 font-body text-xs leading-relaxed">
            <span>
              Effective: <strong>{effectiveLabel}</strong>
            </span>
            {daysUntilEffective !== null && status === "terminating" && (
              <span className="ml-2">
                {daysUntilEffective > 0
                  ? `(${daysUntilEffective} day${daysUntilEffective === 1 ? "" : "s"} remaining)`
                  : "(notice period elapsed)"}
              </span>
            )}
            {reason && <p className="mt-1">Reason: {reason}</p>}
            {vacatedAt && <p className="mt-1">You confirmed vacated on {fmtDate(vacatedAt)}.</p>}
          </div>

          {!vacatedAt && (
            <Button
              size="sm"
              icon={actionBusy ? Loader2 : CheckCircle2}
              disabled={!canConfirmVacated || actionBusy}
              onClick={onConfirmVacated}
              className="mt-3"
            >
              Confirm I have vacated
            </Button>
          )}
          {!vacatedAt && !canConfirmVacated && daysUntilEffective > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              <p className="font-body text-[11px] opacity-80">
                Confirm vacated available on or after the effective date.
              </p>
              <Button
                size="sm"
                variant="secondary"
                icon={actionBusy ? Loader2 : LogOut}
                disabled={actionBusy}
                onClick={onOverrideMoveOut}
              >
                Move out early (override)
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBanner({ tone = "warning", title, body, actionLabel, onAction, actionBusy }) {
  const cls =
    tone === "warning"
      ? "bg-vxr-warning-soft border-vxr-warning/30 text-vxr-warning"
      : "bg-blue-50 border-blue-200 text-blue-700";
  return (
    <div className={`rounded-vxr-md p-4 border ${cls}`}>
      <p className="font-display text-sm font-bold">{title}</p>
      <p className="mt-1 font-body text-xs leading-relaxed">{body}</p>
      {actionLabel && (
        <Button
          size="sm"
          disabled={actionBusy}
          onClick={onAction}
          className="mt-3"
          icon={actionBusy ? Loader2 : undefined}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function TerminationModal({ isMTM, busy, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [confirmCk, setConfirmCk] = useState(false);

  const type = isMTM ? "notice" : "mutual";
  const title = isMTM ? "Give 30-day notice" : "Request mutual termination";
  const description = isMTM
    ? "Your tenancy will end 30 days from today. You remain responsible for rent and the unit until that date."
    : "Your fixed-term lease can only end early if both parties agree. Your landlord will be notified to accept or decline.";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!confirmCk) return;
    await onSubmit({ type, reason: reason.trim() || null });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-vxr-text/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-vxr-surface rounded-vxr-sheet w-full max-w-md p-6 shadow-vxr-lg"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-display text-xl font-extrabold text-vxr-text">{title}</h3>
            <p className="font-body text-xs text-vxr-text-sub mt-1">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-vxr-sm hover:bg-vxr-surface2 text-vxr-text-sub"
          >
            <X size={18} />
          </button>
        </div>

        <label className="block">
          <span className="font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub">
            Reason (optional)
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Relocating, change of plans, etc."
            className="mt-1.5 w-full bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md px-3.5 py-3 font-body text-sm outline-none focus:border-vxr-accent transition-colors"
          />
        </label>

        <label className="mt-4 flex items-start gap-2 font-body text-xs text-vxr-text-sub cursor-pointer">
          <input
            type="checkbox"
            checked={confirmCk}
            onChange={(e) => setConfirmCk(e.target.checked)}
            className="mt-0.5 accent-vxr-accent"
          />
          <span>
            {isMTM
              ? "I understand the 30-day notice period and that rent obligations continue until the effective date."
              : "I understand this is a proposal that requires my landlord's acceptance, and the lease remains active until both parties agree."}
          </span>
        </label>

        <div className="mt-5 flex gap-2 justify-end">
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!confirmCk || busy}
            icon={busy ? Loader2 : undefined}
          >
            {isMTM ? "Submit notice" : "Send proposal"}
          </Button>
        </div>
      </form>
    </div>
  );
}
