import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw, Search, Users, AlertCircle,
  Home, Mail, Phone, MessageCircle, CreditCard,
  FileText, Calendar, Clock, Building2, Loader2,
  LogOut, X, ShieldAlert, CheckCircle2, XCircle, PlusCircle,
  Send, Link as LinkIcon, Copy,
} from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import AppHeader from "./components/AppHeader.jsx";
import {
  Card, Button, Badge, Avatar, Input, Modal, Stat, EmptyState, Section,
} from "./components/vxr";
import { fetchActiveTenants, fetchLandlordReports } from "./lib/tenantManagementService";
import { getOrCreateConversation, sendMessage } from "./lib/messagingService";
import {
  requestTermination,
  acceptMutualTermination,
  withdrawMutualTermination,
} from "./lib/postRentService";
import { recordOfflinePayment, createLandlordPaymentLink } from "./lib/paymentsService";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function daysSince(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function resolveName(profile, app) {
  const full = profile?.full_name?.trim();
  if (full) return full;
  return `${app?.first_name ?? ""} ${app?.last_name ?? ""}`.trim();
}

function TenantAvatar({ name, url }) {
  return <Avatar name={name || "?"} src={url || null} gradient size={52} />;
}

function statusPill(tenant) {
  const t = tenant?.contract_termination;
  const term = Array.isArray(t) ? t[0] : t;
  const status = tenant.status;
  if (status === "paid" && !term) return { label: "Active", tone: "success" };
  if (term?.type === "mutual" && !term.mutual_accepted_by_landlord_at && !term.mutual_withdrawn_at) {
    return { label: "Mutual proposal", tone: "warning" };
  }
  if (status === "terminating") return { label: "Terminating", tone: "warning" };
  if (status === "expiring")    return { label: "Non-renewal", tone: "warning" };
  if (status === "terminated" || status === "ended") return { label: "Awaiting close-out", tone: "warning" };
  if (status === "closed")      return { label: "Closed", tone: "neutral" };
  return { label: "Active", tone: "success" };
}

function tenantTermination(tenant) {
  const t = tenant?.contract_termination;
  return Array.isArray(t) ? t[0] : t;
}

function TenantCard({ tenant, openReports, chatLoading, onReports, onPayments, onRecordPayment, onSendLink, onChat,
  onTerminateMTM, onProposeMutual, onNonRenewal, onEvict, onAcceptMutual, onWithdrawMutual,
  onMoveOut, actionBusy,
}) {
  const listing = tenant.listings ?? {};
  const app     = tenant.application ?? {};
  const profile = tenant.tenant_profile ?? {};

  const name    = resolveName(profile, app);
  const title   = listing.title || "Property";
  const email   = app.email || "";
  const phone   = app.phone_number || "";
  const dateIso = tenant.landlord_signed_at || tenant.start_date;
  const days    = daysSince(dateIso);
  const isMTM   = tenant.listing_type === "rent";
  const term    = tenantTermination(tenant);
  const pill    = statusPill(tenant);

  const tenantProposedMutual = term?.type === "mutual"
    && term.initiated_by === "tenant"
    && !term.mutual_accepted_by_landlord_at
    && !term.mutual_withdrawn_at;
  const landlordProposedMutual = term?.type === "mutual"
    && term.initiated_by === "landlord"
    && !term.mutual_accepted_by_tenant_at
    && !term.mutual_withdrawn_at;

  const isActiveNoTerm = tenant.status === "paid" && !term;
  const inMoveOutFlow = ["terminating","expiring","terminated","ended"].includes(tenant.status);

  const stats = [
    { icon: Calendar,     label: "Move-in",      value: fmtDate(dateIso) },
    { icon: Clock,        label: "Days in stay",  value: days !== null ? `${days}d` : "—" },
    { icon: AlertCircle,  label: "Open reports",  value: String(openReports), accent: openReports > 0 },
  ];

  const actions = [
    { icon: FileText,      label: "Reports",  onClick: onReports },
    { icon: CreditCard,    label: "Payments", onClick: onPayments },
    { icon: PlusCircle,    label: "Record",   onClick: onRecordPayment },
    { icon: Send,          label: "Send link", onClick: onSendLink },
    { icon: MessageCircle, label: "Chat",     onClick: onChat, loading: chatLoading },
  ];

  return (
    <Card className="p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <TenantAvatar name={name} url={profile.avatar_url || ""} />
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-base text-vxr-text truncate">
            {name || "Tenant"}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Home size={12} className="text-vxr-text-sub" />
            <p className="font-body text-xs text-vxr-text-sub truncate">{title}</p>
          </div>
        </div>
        <Badge tone={pill.tone}>{pill.label}</Badge>
      </div>

      {/* Termination summary line */}
      {term && (
        <div className="text-[11px] mb-3 px-2.5 py-2 rounded-vxr-sm bg-vxr-warning-soft text-vxr-warning font-body">
          {term.type === "mutual" && !term.mutual_accepted_by_landlord_at && !term.mutual_withdrawn_at && term.initiated_by === "tenant" && (
            <>Tenant proposed mutual termination effective <strong>{fmtDate(term.effective_date)}</strong>.</>
          )}
          {term.type === "mutual" && !term.mutual_accepted_by_tenant_at && !term.mutual_withdrawn_at && term.initiated_by === "landlord" && (
            <>You proposed mutual termination — awaiting tenant acceptance.</>
          )}
          {term.type === "notice" && <>30-day notice — effective <strong>{fmtDate(term.effective_date)}</strong>.</>}
          {term.type === "non_renewal" && <>Non-renewal — lease ends <strong>{fmtDate(term.effective_date)}</strong>.</>}
          {term.type === "eviction" && <>Eviction in progress — effective <strong>{fmtDate(term.effective_date)}</strong>.</>}
          {term.tenant_vacated_confirmed_at && <p className="mt-1">Tenant has confirmed vacated.</p>}
        </div>
      )}

      {/* Info row */}
      <div className="flex rounded-vxr-md overflow-hidden mb-3 bg-vxr-surface2 border border-vxr-border">
        {stats.map((s, i) => (
          <div key={s.label} className="flex-1 flex flex-col items-center py-3 relative">
            {i > 0 && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-[30px] bg-vxr-border" />
            )}
            <s.icon size={14} className="text-vxr-accent" />
            <p
              className={`font-display text-sm font-bold mt-1 truncate max-w-full px-1 ${
                s.accent ? "text-vxr-accent" : "text-vxr-text"
              }`}
            >
              {s.value}
            </p>
            <p className="font-body text-[10px] text-vxr-text-sub">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Contact chips */}
      {(email || phone) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {email && (
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-body text-vxr-text bg-vxr-accent-soft border border-vxr-accent/20">
              <Mail size={11} className="text-vxr-accent" />
              {email}
            </span>
          )}
          {phone && (
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-body text-vxr-text bg-vxr-accent-soft border border-vxr-accent/20">
              <Phone size={11} className="text-vxr-accent" />
              {phone}
            </span>
          )}
        </div>
      )}

      {/* Quick-action row */}
      <div className="flex rounded-vxr-md overflow-hidden border border-vxr-border">
        {actions.map((a, i) => (
          <button
            key={a.label}
            onClick={a.onClick}
            disabled={a.loading}
            className="flex-1 flex flex-col items-center py-2.5 gap-1 hover:bg-vxr-accent-soft active:bg-vxr-accent-soft transition-colors relative disabled:opacity-60"
          >
            {i > 0 && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-[22px] bg-vxr-border" />
            )}
            {a.loading
              ? <Loader2 size={18} className="text-vxr-accent animate-spin" />
              : <a.icon size={18} className="text-vxr-accent" />
            }
            <span className="font-body text-xs font-semibold text-vxr-accent">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Lease actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {tenantProposedMutual && (
          <>
            <Button
              variant="success"
              size="sm"
              icon={CheckCircle2}
              onClick={() => onAcceptMutual(tenant)}
              disabled={actionBusy}
              className="flex-1 min-w-[120px]"
            >
              Accept proposal
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={XCircle}
              onClick={() => onWithdrawMutual(tenant)}
              disabled={actionBusy}
            >
              Decline
            </Button>
          </>
        )}
        {landlordProposedMutual && (
          <Button
            variant="secondary"
            size="sm"
            icon={X}
            onClick={() => onWithdrawMutual(tenant)}
            disabled={actionBusy}
            className="flex-1 min-w-[120px]"
          >
            Withdraw proposal
          </Button>
        )}
        {isActiveNoTerm && (
          <>
            {isMTM && (
              <Button
                variant="danger"
                size="sm"
                icon={LogOut}
                onClick={() => onTerminateMTM(tenant)}
                disabled={actionBusy}
                className="flex-1 min-w-[120px]"
              >
                30-day Notice
              </Button>
            )}
            {!isMTM && (
              <Button
                variant="secondary"
                size="sm"
                icon={LogOut}
                onClick={() => onProposeMutual(tenant)}
                disabled={actionBusy}
                className="flex-1 min-w-[120px]"
              >
                Propose mutual
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNonRenewal(tenant)}
              disabled={actionBusy}
            >
              Do Not Renew
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={ShieldAlert}
              onClick={() => onEvict(tenant)}
              disabled={actionBusy}
            >
              Evict
            </Button>
          </>
        )}
        {inMoveOutFlow && (
          <Button
            size="sm"
            icon={FileText}
            onClick={() => onMoveOut(tenant)}
            className="flex-1"
          >
            Move-out checklist
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function TenantManagement() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [loading,      setLoading]      = useState(true);
  const [tenants,      setTenants]      = useState([]);
  const [openReports,  setOpenReports]  = useState([]);
  const [query,        setQuery]        = useState("");
  const [chatLoading,  setChatLoading]  = useState(null);
  const [actionBusy,   setActionBusy]   = useState(false);
  const [terminationModal, setTerminationModal] = useState(null);
  const [recordPaymentModal, setRecordPaymentModal] = useState(null);
  const [sendLinkModal, setSendLinkModal] = useState(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated === false) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const [{ data: tData }, { data: rData }] = await Promise.all([
      fetchActiveTenants(user.id),
      fetchLandlordReports(user.id),
    ]);
    setTenants(tData ?? []);
    setOpenReports(
      (rData ?? []).filter((r) => r.status === "open" || r.status === "in_progress"),
    );
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const activeTenants = tenants.filter((t) => t.status !== "closed");
  const closedTenants = tenants.filter((t) => t.status === "closed");

  const applySearch = (list) =>
    query.trim()
      ? list.filter((t) => {
          const q   = query.toLowerCase();
          const app = t.application    ?? {};
          const p   = t.tenant_profile ?? {};
          const l   = t.listings       ?? {};
          const name = `${app.first_name ?? ""} ${app.last_name ?? ""} ${p.full_name ?? ""}`.toLowerCase();
          return (
            name.includes(q) ||
            (l.title  ?? "").toLowerCase().includes(q) ||
            (app.email ?? "").toLowerCase().includes(q)
          );
        })
      : list;

  const filteredActive = applySearch(activeTenants);
  const filteredClosed = applySearch(closedTenants);

  const openCountFor = (contractId) =>
    openReports.filter((r) => r.contract_id === contractId).length;

  const uniqueProps = new Set(activeTenants.map((t) => t.listing_id).filter(Boolean)).size;

  async function handleChat(tenant) {
    if (!user?.id || !tenant.tenant_id) return;
    setChatLoading(tenant.id);
    const { data: conv } = await getOrCreateConversation(
      tenant.tenant_id,
      user.id,
      tenant.listing_id ?? null,
    );
    setChatLoading(null);
    if (conv?.id) navigate(`/messages?c=${conv.id}`);
  }

  const onTerminateMTM   = (tenant) => setTerminationModal({ tenant, kind: "notice" });
  const onProposeMutual  = (tenant) => setTerminationModal({ tenant, kind: "mutual" });
  const onNonRenewal     = (tenant) => setTerminationModal({ tenant, kind: "non_renewal" });
  const onEvict          = (tenant) => setTerminationModal({ tenant, kind: "eviction" });
  const onMoveOut        = (tenant) => navigate(`/contract/${tenant.id}/move-out`);
  const onRecordPayment  = (tenant) => setRecordPaymentModal({ tenant });
  const onSendLink       = (tenant) => setSendLinkModal({ tenant });

  const submitRecordPayment = async ({ amountPhp, methodType, billingMonth, paidAt, note }) => {
    const tenant = recordPaymentModal?.tenant;
    if (!tenant) return;
    setActionBusy(true);
    const res = await recordOfflinePayment({
      contractId: tenant.id,
      amountPhp,
      methodType,
      billingMonth,
      paidAt,
      note,
    });
    setActionBusy(false);
    if (res?.error) { alert(res.error); return; }
    setRecordPaymentModal(null);
    await load();
  };

  const onAcceptMutual = async (tenant) => {
    setActionBusy(true);
    const { error } = await acceptMutualTermination({ contractId: tenant.id, role: "landlord" });
    setActionBusy(false);
    if (error) { alert(error.message); return; }
    await load();
  };

  const onWithdrawMutual = async (tenant) => {
    if (!confirm("Withdraw / decline this mutual termination proposal?")) return;
    setActionBusy(true);
    const { error } = await withdrawMutualTermination({ contractId: tenant.id });
    setActionBusy(false);
    if (error) { alert(error.message); return; }
    await load();
  };

  const submitTermination = async ({ kind, reason, effectiveDate }) => {
    const tenant = terminationModal?.tenant;
    if (!tenant) return;
    setActionBusy(true);
    const { error } = await requestTermination({
      contractId:   tenant.id,
      type:         kind,
      reason,
      effectiveDate,
      initiatedBy:  "landlord",
    });
    setActionBusy(false);
    if (error) { alert(error.message); return; }
    setTerminationModal(null);
    await load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vxr-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-vxr-accent" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vxr-bg flex flex-col">
      <AppHeader showBack />

      {/* Hero */}
      <div className="relative bg-vxr-gradient overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-16 -left-8 w-36 h-36 rounded-full bg-white/[0.07] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 md:px-8 py-12">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-body text-[11px] font-bold uppercase tracking-wider text-white/80 mb-2">
                ViewxRent · Landlord
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Tenants &amp; Stays
              </h1>
              <p className="mt-2 font-body text-[15px] text-white/85">
                {activeTenants.length === 0
                  ? "You have no active tenants yet"
                  : `Manage ${activeTenants.length} active tenant${activeTenants.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <button
              onClick={load}
              aria-label="Refresh"
              className="w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition shrink-0"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="-mt-8 flex-1 max-w-7xl mx-auto w-full px-6 pb-12 relative z-10">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <Stat label="Active tenants" value={activeTenants.length} icon={Users} />
          <Stat label="Open reports"   value={openReports.length} icon={AlertCircle} />
          <Stat label="Properties"     value={uniqueProps}        icon={Building2} />
        </div>

        {/* Search */}
        <div className="mb-5">
          <Input
            icon={Search}
            placeholder="Search tenant, property, email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Section header */}
        <Section
          title="Active Tenants"
          action={
            <span className="font-mono text-xs font-semibold text-vxr-text-sub">
              {filteredActive.length}
            </span>
          }
        />

        {/* Tenant grid / empty state */}
        {filteredActive.length === 0 ? (
          <Card>
            <EmptyState
              icon={Users}
              title="No active tenants yet"
              message={
                query
                  ? "No tenants match your search."
                  : "Tenants appear here once their contract is fully signed and paid."
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredActive.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                openReports={openCountFor(tenant.id)}
                chatLoading={chatLoading === tenant.id}
                onReports={() => navigate("/reports")}
                onPayments={() => navigate(`/contract/${tenant.id}`)}
                onRecordPayment={() => onRecordPayment(tenant)}
                onSendLink={() => onSendLink(tenant)}
                onChat={() => handleChat(tenant)}
                onTerminateMTM={onTerminateMTM}
                onProposeMutual={onProposeMutual}
                onNonRenewal={onNonRenewal}
                onEvict={onEvict}
                onAcceptMutual={onAcceptMutual}
                onWithdrawMutual={onWithdrawMutual}
                onMoveOut={onMoveOut}
                actionBusy={actionBusy}
              />
            ))}
          </div>
        )}

        {/* Past Tenants — closed contracts */}
        {filteredClosed.length > 0 && (
          <>
            <div className="mt-8">
              <Section
                title="Past Tenants"
                action={
                  <span className="font-mono text-xs font-semibold text-vxr-text-sub">
                    {filteredClosed.length}
                  </span>
                }
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredClosed.map((tenant) => (
                <TenantCard
                  key={tenant.id}
                  tenant={tenant}
                  openReports={openCountFor(tenant.id)}
                  chatLoading={chatLoading === tenant.id}
                  onReports={() => navigate("/reports")}
                  onPayments={() => navigate(`/contract/${tenant.id}`)}
                  onRecordPayment={() => onRecordPayment(tenant)}
                  onSendLink={() => onSendLink(tenant)}
                  onChat={() => handleChat(tenant)}
                  onTerminateMTM={onTerminateMTM}
                  onProposeMutual={onProposeMutual}
                  onNonRenewal={onNonRenewal}
                  onEvict={onEvict}
                  onAcceptMutual={onAcceptMutual}
                  onWithdrawMutual={onWithdrawMutual}
                  onMoveOut={onMoveOut}
                  actionBusy={actionBusy}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Chat loading overlay */}
      {chatLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-vxr-text/40 backdrop-blur-sm">
          <div className="bg-vxr-surface rounded-vxr-md p-6 flex flex-col items-center gap-3 shadow-vxr-lg">
            <Loader2 className="animate-spin text-vxr-accent" size={32} />
            <p className="font-body text-sm font-medium text-vxr-text">Opening chat…</p>
          </div>
        </div>
      )}

      {terminationModal && (
        <LandlordTerminationModal
          tenant={terminationModal.tenant}
          kind={terminationModal.kind}
          busy={actionBusy}
          onClose={() => setTerminationModal(null)}
          onSubmit={submitTermination}
        />
      )}

      {recordPaymentModal && (
        <RecordPaymentModal
          tenant={recordPaymentModal.tenant}
          busy={actionBusy}
          onClose={() => setRecordPaymentModal(null)}
          onSubmit={submitRecordPayment}
        />
      )}

      {sendLinkModal && (
        <SendPaymentLinkModal
          tenant={sendLinkModal.tenant}
          landlordId={user?.id}
          onClose={() => setSendLinkModal(null)}
        />
      )}
    </div>
  );
}

function LandlordTerminationModal({ tenant, kind, busy, onClose, onSubmit }) {
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [effectiveDate, setEffectiveDate] = useState(() => {
    if (kind === "notice")      return new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    if (kind === "non_renewal") return tenant.end_date ?? new Date().toISOString().slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  });
  const [reason, setReason]               = useState("");
  const [confirmAck, setConfirmAck]       = useState(false);

  const config = {
    notice:      { title: "30-day notice (month-to-month)", needReason: false, evidence: false },
    mutual:      { title: "Propose mutual termination",     needReason: true,  evidence: false },
    non_renewal: { title: "Do not renew this lease",         needReason: false, evidence: false },
    eviction:    { title: "Initiate eviction",               needReason: true,  evidence: true },
  }[kind];

  const handleSubmit = async () => {
    if (!confirmAck) return;
    if (config.needReason && !reason.trim()) return;
    await onSubmit({ kind, reason: reason.trim() || null, effectiveDate });
  };

  const submitDisabled =
    !confirmAck || busy || (config.needReason && !reason.trim());

  return (
    <Modal
      open
      onClose={onClose}
      title={config.title}
      subtitle={
        <>Tenant: <strong>{resolveName(tenant.tenant_profile, tenant.application)}</strong></>
      }
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitDisabled}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            {kind === "mutual" ? "Send proposal" : "Confirm"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          type="date"
          label="Effective date"
          value={effectiveDate}
          min={today}
          onChange={(e) => setEffectiveDate(e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub">
            Reason {config.needReason && <span className="text-vxr-danger">*</span>}
          </label>
          <div className="bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md px-3.5 py-3 focus-within:border-vxr-accent transition-colors duration-150">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={
                config.evidence
                  ? "Lease violation details — include evidence reference if applicable"
                  : "Optional"
              }
              className="w-full bg-transparent border-none outline-none font-body text-sm text-vxr-text placeholder:text-vxr-text-muted resize-y"
            />
          </div>
        </div>

        <label className="flex items-start gap-2 text-[12px] font-body text-vxr-text-sub cursor-pointer">
          <input
            type="checkbox"
            checked={confirmAck}
            onChange={(e) => setConfirmAck(e.target.checked)}
            className="mt-0.5 accent-vxr-accent"
          />
          <span>
            {kind === "mutual"
              ? "I understand this is a proposal that requires the tenant to accept before it takes effect."
              : kind === "non_renewal"
              ? "I am giving notice that the lease will not be renewed past its end date."
              : kind === "eviction"
              ? "I attest that this eviction is supported by a documented lease violation and applicable law."
              : "I confirm the 30-day notice and that the tenancy will end on the effective date."}
          </span>
        </label>
      </div>
    </Modal>
  );
}

// Landlord logs a rent payment they received outside the app (cash,
// direct GCash, manual bank transfer). The Edge Function gates writes
// on auth.uid() === contract.landlord_id, so this UI doesn't need to
// re-check role — but it does default sensible values from the
// tenant's contract to keep entry quick.
const OFFLINE_METHODS = [
  { value: "cash",          label: "Cash"            },
  { value: "bank_transfer", label: "Bank transfer"   },
  { value: "gcash",         label: "GCash (direct)"  },
  { value: "paymaya",       label: "Maya (direct)"   },
  { value: "grab_pay",      label: "GrabPay"         },
  { value: "offline_other", label: "Other / off-platform" },
];

function firstOfMonthIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function RecordPaymentModal({ tenant, busy, onClose, onSubmit }) {
  const defaultAmount = Number(tenant?.monthly_rent || 0);
  const tenantName = resolveName(tenant?.tenant_profile, tenant?.application);

  const [amount, setAmount]               = useState(defaultAmount > 0 ? String(defaultAmount) : "");
  const [method, setMethod]               = useState("cash");
  const [billingMonth, setBillingMonth]   = useState(firstOfMonthIso());
  const [paidAt, setPaidAt]               = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote]                   = useState("");
  const [confirmAck, setConfirmAck]       = useState(false);

  const amountNum = Number(amount);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;
  const submitDisabled = !confirmAck || busy || !amountValid;

  const handleSubmit = async () => {
    if (submitDisabled) return;
    await onSubmit({
      amountPhp:    amountNum,
      methodType:   method,
      billingMonth,                                // 'YYYY-MM-01'
      paidAt:       new Date(`${paidAt}T12:00:00`).toISOString(),
      note:         note.trim() || null,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Record off-platform payment"
      subtitle={<>Tenant: <strong>{tenantName || "Tenant"}</strong></>}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitDisabled}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            Save payment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          label="Amount (PHP)"
          placeholder={defaultAmount > 0 ? String(defaultAmount) : "0.00"}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub">
            Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md px-3.5 py-3 font-body text-sm text-vxr-text focus:outline-none focus:border-vxr-accent transition-colors"
          >
            {OFFLINE_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="month"
            label="Rent month covered"
            value={billingMonth.slice(0, 7)}
            onChange={(e) => setBillingMonth(`${e.target.value}-01`)}
          />
          <Input
            type="date"
            label="Date received"
            value={paidAt}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setPaidAt(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub">
            Note (optional)
          </label>
          <div className="bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md px-3.5 py-3 focus-within:border-vxr-accent transition-colors duration-150">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. cash, receipt #042"
              className="w-full bg-transparent border-none outline-none font-body text-sm text-vxr-text placeholder:text-vxr-text-muted resize-y"
            />
          </div>
        </div>

        <label className="flex items-start gap-2 text-[12px] font-body text-vxr-text-sub cursor-pointer">
          <input
            type="checkbox"
            checked={confirmAck}
            onChange={(e) => setConfirmAck(e.target.checked)}
            className="mt-0.5 accent-vxr-accent"
          />
          <span>
            I confirm I received this payment from {tenantName || "the tenant"} and want to log it on their record.
          </span>
        </label>
      </div>
    </Modal>
  );
}

// Landlord generates a PayMongo Link for a specific rent month and
// shares the URL (clipboard, or auto-send via in-app chat). The actual
// payment happens on PayMongo's hosted checkout; webhook records it.
function SendPaymentLinkModal({ tenant, landlordId, onClose }) {
  const tenantName = resolveName(tenant?.tenant_profile, tenant?.application);
  const monthlyRent = Number(tenant?.monthly_rent || 0);

  const [billingMonth, setBillingMonth] = useState(firstOfMonthIso());
  const [note, setNote]                 = useState("");
  const [busy, setBusy]                 = useState(false);
  const [error, setError]               = useState(null);
  const [link, setLink]                 = useState(null); // { checkout_url, link_id, expires_at, reused }
  const [copied, setCopied]             = useState(false);
  const [chatSent, setChatSent]         = useState(false);

  const handleGenerate = async () => {
    setBusy(true);
    setError(null);
    const res = await createLandlordPaymentLink({
      contractId:   tenant.id,
      billingMonth,
      note:         note.trim() || null,
    });
    setBusy(false);
    if (res?.error) { setError(res.error); return; }
    setLink(res);
  };

  const handleCopy = async () => {
    if (!link?.checkout_url) return;
    try {
      await navigator.clipboard.writeText(link.checkout_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Long-press the URL to copy manually.");
    }
  };

  const handleSendViaChat = async () => {
    if (!link?.checkout_url || !tenant?.tenant_id || !landlordId) return;
    setBusy(true);
    setError(null);
    const { data: conv, error: cErr } = await getOrCreateConversation(
      tenant.tenant_id,
      landlordId,
      tenant.listing_id ?? null,
    );
    if (cErr || !conv?.id) {
      setBusy(false);
      setError("Could not open a chat with this tenant.");
      return;
    }
    const monthLbl = new Date(`${billingMonth.slice(0, 10)}T00:00:00`)
      .toLocaleString("en-US", { month: "long", year: "numeric" });
    const msg = `Payment link for rent (${monthLbl}): ${link.checkout_url}`;
    const { error: mErr } = await sendMessage(conv.id, landlordId, msg);
    setBusy(false);
    if (mErr) { setError("Sent the link wasn't possible; copy + send manually."); return; }
    setChatSent(true);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Send payment link"
      subtitle={<>Tenant: <strong>{tenantName || "Tenant"}</strong></>}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {link ? "Done" : "Cancel"}
          </Button>
          {!link && (
            <Button onClick={handleGenerate} disabled={busy} icon={LinkIcon}>
              {busy && <Loader2 size={14} className="animate-spin" />}
              Generate link
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!link && (
          <>
            <Input
              type="month"
              label="Rent month to charge"
              value={billingMonth.slice(0, 7)}
              onChange={(e) => setBillingMonth(`${e.target.value}-01`)}
            />
            {monthlyRent > 0 && (
              <p className="font-body text-xs text-vxr-text-sub">
                Amount: <strong>₱{monthlyRent.toLocaleString("en-PH")}</strong> (from contract)
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub">
                Note (optional, shown on PayMongo checkout)
              </label>
              <div className="bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md px-3.5 py-3 focus-within:border-vxr-accent transition-colors duration-150">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Please pay by the 5th"
                  className="w-full bg-transparent border-none outline-none font-body text-sm text-vxr-text placeholder:text-vxr-text-muted resize-y"
                />
              </div>
            </div>
          </>
        )}

        {link && (
          <>
            <div className="rounded-vxr-md border border-vxr-success/30 bg-vxr-success-soft p-3 text-vxr-success text-sm font-body">
              {link.reused
                ? "An open link for this month already exists — reusing it."
                : "Link generated. Share it with your tenant."}
            </div>
            <Input
              label="Checkout URL"
              value={link.checkout_url}
              readOnly
              onFocus={(e) => e.target.select()}
            />
            <div className="flex gap-2">
              <Button variant="secondary" icon={Copy} onClick={handleCopy} disabled={busy}>
                {copied ? "Copied!" : "Copy URL"}
              </Button>
              <Button icon={Send} onClick={handleSendViaChat} disabled={busy || chatSent}>
                {busy && <Loader2 size={14} className="animate-spin" />}
                {chatSent ? "Sent via chat" : "Send via chat"}
              </Button>
            </div>
          </>
        )}

        {error && (
          <div className="rounded-vxr-md border border-vxr-danger/30 bg-vxr-danger-soft text-vxr-danger text-sm px-3 py-2 font-body">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
