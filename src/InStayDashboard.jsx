import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, MapPin, CreditCard, Calendar,
  Home, ShieldCheck, Clock, Wrench, MessageCircle, FileText,
  AlertCircle, Loader2, ChevronRight, CheckCircle2,
  AlertTriangle, Circle, LogOut, X,
} from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
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

// â”€â”€â”€ Brand tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BRAND   = "#F36C6C";
const CORAL   = "#E8735A";
const LIGHT   = "#FF8A80";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  // normalizeContract gives payment as a single camelCased object (or null)
  const lastPaid = contract.payment?.paidAt ?? contract.startDate;
  if (!lastPaid) return null;
  const base = new Date(lastPaid);
  const due  = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate());
  return due;
}

function daysUntilDue(dueDate) {
  if (!dueDate) return null;
  return Math.ceil((dueDate - new Date()) / 86400000);
}

function dueChip(days) {
  if (days === null) return { label: "No prior payment", color: "#6B7280" };
  if (days < 0)      return { label: `${-days}d overdue`,  color: "#EF4444" };
  if (days === 0)    return { label: "Due today",          color: "#F59E0B" };
  if (days <= 5)     return { label: `Due in ${days}d`,    color: "#F59E0B" };
  return               { label: `Due in ${days}d`,         color: "#22C55E" };
}

const REPORT_STATUS = {
  open:        { label: "Open",        color: "#F59E0B", Icon: Circle },
  in_progress: { label: "In Progress", color: "#3B82F6", Icon: AlertTriangle },
  resolved:    { label: "Resolved",    color: "#22C55E", Icon: CheckCircle2 },
};

const REPORT_CATEGORIES = [
  { value: "plumbing",     label: "Plumbing" },
  { value: "electrical",   label: "Electrical" },
  { value: "structural",   label: "Structural" },
  { value: "appliance",    label: "Appliance" },
  { value: "pest",         label: "Pest Control" },
  { value: "cleanliness",  label: "Cleanliness" },
  { value: "other",        label: "Other" },
];

const REPORT_PRIORITIES = [
  { value: "low",    label: "Low",    color: "#22C55E" },
  { value: "medium", label: "Medium", color: "#F59E0B" },
  { value: "high",   label: "High",   color: "#EF4444" },
];

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function InStayDashboard() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [contract, setContract]         = useState(null);   // normalized
  const [rawContract, setRawContract]   = useState(null);   // raw row (for status + listing_type)
  const [termination, setTermination]   = useState(null);
  const [reports, setReports]           = useState([]);
  const [error, setError]               = useState(null);
  const [terminateModal, setTerminateModal] = useState(false);
  const [actionBusy, setActionBusy]     = useState(false);


  const initial = (profile?.full_name || user?.email || "?").charAt(0).toUpperCase();

  // Redirect unauthenticated users
  useEffect(() => {
    if (isAuthenticated === false) navigate("/login");
  }, [isAuthenticated, navigate]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: contractRow, error: cErr }, { data: rpts, error: rErr }] = await Promise.all([
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

  useEffect(() => { load(); }, [load]);

  // â”€â”€ Derived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const listing   = contract?.listings ?? {};
  const listingLocation =
    listing.full_address ||
    [listing.city, listing.province].filter(Boolean).join(", ") ||
    contract?.propertyAddress ||
    "Address unavailable";
  const due       = contract ? nextDueDate(contract) : null;
  const days      = daysUntilDue(due);
  const chip      = dueChip(days);
  const movedIn   = contract?.startDate ? new Date(contract.startDate) : null;
  const daysIn    = movedIn ? Math.max(0, Math.ceil((new Date() - movedIn) / 86400000)) : null;
  const recentRpts = reports.slice(0, 3);

  const handleChatLandlord = async () => {
    if (!contract?.landlordId) return;
    const { data, error } = await getOrCreateConversation(user.id, contract.landlordId, contract.listingId);
    if (error || !data?.id) { alert("Could not open chat. Try again."); return; }
    navigate(`/messages?c=${data.id}`);
  };

  // ── Termination handlers ──
  const contractStatus = rawContract?.status ?? null;
  const isMTM = rawContract?.listing_type === "rent";
  const inTerminationFlow = ["terminating", "expiring", "terminated", "ended", "closed"].includes(contractStatus);
  const mutualPending = !!termination
    && termination.type === "mutual"
    && !(termination.mutual_accepted_by_tenant_at && termination.mutual_accepted_by_landlord_at)
    && !termination.mutual_withdrawn_at;
  const tenantProposedMutual    = mutualPending && termination?.initiated_by === "tenant";
  const landlordProposedMutual  = mutualPending && termination?.initiated_by === "landlord";
  const effectiveDate = termination?.effective_date ? new Date(termination.effective_date) : null;
  const daysUntilEffective = effectiveDate
    ? Math.ceil((effectiveDate - new Date()) / 86400000)
    : null;
  const canConfirmVacated = !!termination
    && !termination.tenant_vacated_confirmed_at
    && (daysUntilEffective === null || daysUntilEffective <= 0);

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
    if (tErr) { alert(tErr.message); return; }
    setTerminateModal(false);
    await load();
  };

  const onAcceptMutual = async () => {
    setActionBusy(true);
    const { error: aErr } = await acceptMutualTermination({ contractId: rawContract.id, role: "tenant" });
    setActionBusy(false);
    if (aErr) { alert(aErr.message); return; }
    await load();
  };

  const onWithdrawMutual = async () => {
    if (!confirm("Withdraw your termination proposal?")) return;
    setActionBusy(true);
    const { error: wErr } = await withdrawMutualTermination({ contractId: rawContract.id });
    setActionBusy(false);
    if (wErr) { alert(wErr.message); return; }
    await load();
  };

  const onConfirmVacated = async () => {
    if (!confirm("Confirm you have fully vacated the unit? This cannot be undone.")) return;
    setActionBusy(true);
    const { error: vErr } = await confirmTenantVacated({ contractId: rawContract.id });
    setActionBusy(false);
    if (vErr) { alert(vErr.message); return; }
    await load();
  };

  const onOverrideMoveOut = async () => {
    const daysLeft = daysUntilEffective ?? 0;
    if (!confirm(
      `You are confirming early move-out — ${daysLeft} day${daysLeft === 1 ? "" : "s"} before the effective date.\n\nRent obligations may still apply until the effective date. This action cannot be undone.`
    )) return;
    setActionBusy(true);
    const { error: vErr } = await confirmTenantVacated({ contractId: rawContract.id });
    setActionBusy(false);
    if (vErr) { alert(vErr.message); return; }
    await load();
  };

  // â”€â”€ Skeleton / error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F6] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#F36C6C]" size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF7F6] flex flex-col items-center justify-center gap-3 px-6">
        <AlertCircle size={36} className="text-red-400" />
        <p className="text-slate-600 text-sm text-center">{error}</p>
        <button onClick={load} className="text-[#F36C6C] text-sm underline">Retry</button>
      </div>
    );
  }

  if (!contract) {
    return <EmptyState onBack={() => navigate(-1)} />;
  }

  return (
    <div className="min-h-screen bg-[#FAF7F6] flex flex-col">
      {/* â”€â”€ Hero â”€â”€ */}
      <div
        className="relative pt-0 pb-16"
        style={{ background: `linear-gradient(135deg, ${LIGHT}, ${BRAND}, ${CORAL})` }}
      >
        {/* Decorative circles */}
        <div className="absolute top-[-48px] right-[-44px] w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute bottom-[-60px] left-[-32px] w-36 h-36 rounded-full bg-white/7 pointer-events-none" />

        {/* Nav row */}
        <div className="relative z-30 flex items-center justify-between px-4 pt-4 pb-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold tracking-widest text-white/80 uppercase">
              ViewxRent · Tenant
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition"
            >
              <RefreshCw size={18} />
            </button>
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-1.5 bg-white/20 rounded-full pl-1.5 pr-3 py-1 text-white"
                >
                  <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center font-bold text-[#F36C6C] text-sm">
                    {initial}
                  </div>
                  <span className="text-[11px]">▾</span>
                </button>
                {dropdownOpen && <ProfileDropdown />}
              </div>
            )}
          </div>
        </div>

        {/* Property title */}
        <div className="relative z-10 px-5 pt-5 pb-2">
          <h1 className="text-2xl font-extrabold text-white leading-tight line-clamp-2">
            {listing.title ?? contract.propertyAddress ?? "My Rental"}
          </h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <MapPin size={14} className="text-white/90 flex-shrink-0" />
            <span className="text-[13px] text-white/90 truncate">
              {listingLocation}
            </span>
          </div>
        </div>
      </div>

      {/* ── Scrollable content pulled up over hero ── */}
      <div className="-mt-8 flex-1 px-4 pb-12 space-y-4 relative z-10">

        {/* ── Termination banner ── */}
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
            tone="amber"
            title="Mutual termination — waiting on landlord"
            body="You've proposed an early end to your fixed-term lease. The landlord must accept before it takes effect."
            actionLabel="Withdraw proposal"
            onAction={onWithdrawMutual}
            actionBusy={actionBusy}
          />
        )}

        {mutualPending && landlordProposedMutual && (
          <InfoBanner
            tone="amber"
            title="Landlord proposed mutual termination"
            body={termination?.reason || "Review and respond to the landlord's request to end your fixed-term lease early."}
            actionLabel="Accept proposal"
            onAction={onAcceptMutual}
            actionBusy={actionBusy}
          />
        )}

        {(!contract.monthlyRent || !contract.startDate) && (
          <InfoBanner
            tone="blue"
            title="Some lease details are missing"
            body="Your contract is missing rent, deposit, or move-in info. Contact your landlord to update it — once they save, your dashboard will reflect the correct numbers."
          />
        )}

        {/* ── Next Payment Card ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5"
          style={{ boxShadow: "0 8px 22px rgba(243,108,108,0.18)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ background: BRAND }} />
              <span className="text-xs font-bold text-slate-500 tracking-wide uppercase">Next Rent Cycle</span>
            </div>
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: `${chip.color}20`, color: chip.color }}
            >
              {chip.label}
            </span>
          </div>

          <div className="flex items-end gap-1 mb-1">
            {contract.monthlyRent ? (
              <>
                <span className="text-[18px] font-semibold text-slate-900">₱</span>
                <span className="text-4xl font-extrabold text-slate-900 leading-none">
                  {Number(contract.monthlyRent).toLocaleString("en-PH")}
                </span>
                <span className="text-sm text-slate-400 mb-1 ml-1">/month</span>
              </>
            ) : (
              <span className="text-2xl font-bold text-slate-400 leading-none">Not set</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-5">
            <Calendar size={13} />
            <span>Due {due ? fmtDate(due.toISOString()) : "—"}</span>
          </div>

          <button
            onClick={() => navigate("/my-payments")}
            className="w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:opacity-90"
            style={{ background: BRAND }}
          >
            <CreditCard size={16} />
            Pay Next Month
          </button>
        </div>

        {/* â”€â”€ Quick Stats â”€â”€ */}
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon={Calendar}   color={BRAND}  label="Days in stay" value={daysIn ?? "—"} />
          <StatTile icon={Clock}      color={CORAL}  label="Lease term"   value={contract.duration || "—"} />
          <StatTile icon={ShieldCheck} color={LIGHT}  label="Deposit"     value={contract.securityDeposit ? `₱${Number(contract.securityDeposit).toLocaleString()}` : "—"} />
        </div>

        {/* â”€â”€ Quick Actions â”€â”€ */}
        <div className="grid grid-cols-4 gap-2">
          <ActionTile
            icon={CreditCard}
            color={BRAND}
            label="Pay Rent"
            onClick={() => navigate("/my-payments")}
          />
          <ActionTile
            icon={Wrench}
            color={CORAL}
            label="Report"
            onClick={() => navigate("/reports")}
          />
          <ActionTile
            icon={MessageCircle}
            color={LIGHT}
            label="Chat"
            onClick={handleChatLandlord}
          />
          <ActionTile
            icon={FileText}
            color="#8B5CF6"
            label="Contract"
            onClick={() => navigate(`/contract/${contract.id}`)}
          />
        </div>

        {/* â”€â”€ Lease Details â”€â”€ */}
        <SectionCard title="Lease Details">
          <DetailRow label="Type"            value={contract.type === "month_to_month" ? "Month-to-Month" : "Fixed-Term"} />
          <DetailRow label="Term"            value={contract.duration || "—"} />
          <DetailRow label="Move-in"         value={fmtDate(contract.startDate)} />
          <DetailRow label="Move-out"        value={fmtDate(contract.endDate)} />
          <hr className="border-slate-100 my-2" />
          <DetailRow label="Monthly rent"    value={fmtMoney(contract.monthlyRent)} />
          <DetailRow label="Security deposit" value={fmtMoney(contract.securityDeposit)} />
          <DetailRow label="Advance rent"    value={fmtMoney(contract.advanceRent)} />
          {contract.paymentDueDate && (
            <DetailRow label="Due day"       value={`${contract.paymentDueDate}th of each month`} />
          )}
          {contract.gracePeriodDays > 0 && (
            <DetailRow label="Grace period"  value={`${contract.gracePeriodDays} days`} />
          )}
          {contract.lateFee > 0 && (
            <DetailRow label="Late fee"      value={fmtMoney(contract.lateFee)} />
          )}
        </SectionCard>

        {/* â”€â”€ Recent Maintenance Reports â”€â”€ */}
        <SectionCard
          title="Maintenance Reports"
          action={
            <button
              onClick={() => navigate("/reports")}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition hover:opacity-90"
              style={{ background: BRAND }}
            >
              + New
            </button>
          }
        >
          {recentRpts.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">No reports yet.</p>
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
              className="mt-3 w-full text-center text-xs font-semibold text-[#F36C6C] hover:underline"
            >
              See all {reports.length} reports
            </button>
          )}
        </SectionCard>

        {/* ── Lease Actions (terminate) ── */}
        {contractStatus === "paid" && !termination && (
          <SectionCard title="Lease Actions">
            <button
              onClick={() => setTerminateModal(true)}
              className="w-full flex items-center justify-between gap-3 py-3 px-3 rounded-xl border border-red-100 hover:bg-red-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                  <LogOut size={16} className="text-red-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900">Terminate Contract</p>
                  <p className="text-[11px] text-slate-500">
                    {isMTM
                      ? "30-day notice required for month-to-month."
                      : "Fixed-term — request mutual termination from your landlord."}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
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

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function EmptyState({ onBack }) {
  return (
    <div className="min-h-screen bg-[#FAF7F6] flex flex-col">
      <header className="bg-white border-b border-slate-100 h-14 flex items-center px-4 gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 transition">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <span className="font-bold text-slate-900">My Rental</span>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="w-24 h-24 rounded-full bg-[#FFF0EE] flex items-center justify-center">
          <Home size={40} style={{ color: `${BRAND}60` }} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">No active rental yet</h2>
        <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
          Apply to a listing, sign the contract, and complete your first payment — your in-stay dashboard will appear here.
        </p>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, color, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-3.5">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
        style={{ background: `${color}22` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <p className="text-sm font-bold text-slate-900 leading-tight truncate">{value}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function ActionTile({ icon: Icon, color, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 py-4 flex flex-col items-center gap-2 hover:shadow-md transition active:scale-95"
    >
      <div className="w-11 h-11 rounded-full flex items-center justify-center"
        style={{ background: `${color}22` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <span className="text-[11px] font-semibold text-slate-700">{label}</span>
    </button>
  );
}

function SectionCard({ title, action, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: BRAND }} />
          <span className="text-sm font-bold text-slate-900">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-slate-400 w-36 flex-shrink-0">{label}</span>
      <span className="text-sm font-semibold text-slate-900 text-right">{value}</span>
    </div>
  );
}

function ReportRow({ report, last, onClick }) {
  const { label, color } = REPORT_STATUS[report.status] ?? REPORT_STATUS.open;
  const priority = REPORT_PRIORITIES.find((p) => p.value === report.priority);
  const hasResponse = !!report.landlord_response;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 py-2 hover:bg-slate-50 transition rounded ${!last ? "border-b border-slate-100" : ""}`}
    >
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{report.title}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>{fmtDate(report.created_at)}</span>
          {priority && (
            <>
              <span>·</span>
              <span style={{ color: priority.color }}>{priority.label}</span>
            </>
          )}
          {hasResponse && (
            <>
              <span>·</span>
              <span className="text-[#F36C6C] font-semibold">Reply</span>
            </>
          )}
        </div>
      </div>
      <span className="text-[11px] font-bold flex-shrink-0" style={{ color }}>{label}</span>
      <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
    </button>
  );
}

// ─── Termination UI ──────────────────────────────────────────────────────────

const STATUS_COPY = {
  terminating: { tone: "amber", title: "Termination in progress" },
  expiring:    { tone: "amber", title: "Lease ending soon — non-renewal" },
  terminated:  { tone: "amber", title: "Contract terminated — awaiting close-out" },
  ended:       { tone: "amber", title: "Lease ended — awaiting close-out" },
  closed:      { tone: "slate", title: "Contract closed" },
};

function TerminationBanner({ status, termination, daysUntilEffective, canConfirmVacated, actionBusy, onConfirmVacated, onOverrideMoveOut }) {
  const copy = STATUS_COPY[status] ?? STATUS_COPY.terminating;
  const palette = copy.tone === "amber"
    ? { bg: "#FEF3C7", border: "#FCD34D", text: "#92400E", accent: "#D97706" }
    : { bg: "#F1F5F9", border: "#CBD5E1", text: "#334155", accent: "#475569" };
  const effective = termination?.effective_date ? new Date(termination.effective_date) : null;
  const effectiveLabel = effective ? fmtDate(effective.toISOString()) : "—";
  const reason = termination?.reason;
  const vacatedAt = termination?.tenant_vacated_confirmed_at;

  return (
    <div className="rounded-2xl p-4 border" style={{ background: palette.bg, borderColor: palette.border }}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" style={{ color: palette.accent }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: palette.text }}>{copy.title}</p>
          <div className="mt-1 text-[12px] leading-relaxed" style={{ color: palette.text }}>
            <span>Effective: <strong>{effectiveLabel}</strong></span>
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
            <button
              onClick={onConfirmVacated}
              disabled={!canConfirmVacated || actionBusy}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
              style={{ background: palette.accent }}
            >
              {actionBusy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Confirm I have vacated
            </button>
          )}
          {!vacatedAt && !canConfirmVacated && daysUntilEffective > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              <p className="text-[11px]" style={{ color: palette.text, opacity: 0.7 }}>
                Confirm vacated available on or after the effective date.
              </p>
              <button
                onClick={onOverrideMoveOut}
                disabled={actionBusy}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-50 transition hover:opacity-80"
                style={{
                  background: "transparent",
                  borderColor: palette.accent,
                  color: palette.accent,
                }}
              >
                {actionBusy ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
                Move out early (override)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBanner({ tone = "amber", title, body, actionLabel, onAction, actionBusy }) {
  const palette = tone === "amber"
    ? { bg: "#FEF3C7", border: "#FCD34D", text: "#92400E", accent: "#D97706" }
    : { bg: "#DBEAFE", border: "#93C5FD", text: "#1E40AF", accent: "#1D4ED8" };
  return (
    <div className="rounded-2xl p-4 border" style={{ background: palette.bg, borderColor: palette.border }}>
      <p className="text-sm font-bold" style={{ color: palette.text }}>{title}</p>
      <p className="mt-1 text-[12px] leading-relaxed" style={{ color: palette.text }}>{body}</p>
      {actionLabel && (
        <button
          onClick={onAction}
          disabled={actionBusy}
          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
          style={{ background: palette.accent }}
        >
          {actionBusy && <Loader2 size={12} className="animate-spin" />}
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function TerminationModal({ isMTM, busy, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);

  const type = isMTM ? "notice" : "mutual";
  const title = isMTM ? "Give 30-day notice" : "Request mutual termination";
  const description = isMTM
    ? "Your tenancy will end 30 days from today. You remain responsible for rent and the unit until that date."
    : "Your fixed-term lease can only end early if both parties agree. Your landlord will be notified to accept or decline.";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!confirm) return;
    await onSubmit({ type, reason: reason.trim() || null });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="text-[12px] text-slate-500 mt-1">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Reason (optional)</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Relocating, change of plans, etc."
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F36C6C]/40"
          />
        </label>

        <label className="mt-4 flex items-start gap-2 text-[12px] text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            {isMTM
              ? "I understand the 30-day notice period and that rent obligations continue until the effective date."
              : "I understand this is a proposal that requires my landlord's acceptance, and the lease remains active until both parties agree."}
          </span>
        </label>

        <div className="mt-5 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!confirm || busy}
            className="px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
            style={{ background: BRAND }}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {isMTM ? "Submit notice" : "Send proposal"}
          </button>
        </div>
      </form>
    </div>
  );
}
