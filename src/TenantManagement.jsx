import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, Search, Users, AlertCircle,
  Home, Mail, Phone, MessageCircle, CreditCard,
  FileText, Calendar, Clock, Building2, Loader2,
  LogOut, X, ShieldAlert, CheckCircle2, XCircle,
} from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import { fetchActiveTenants, fetchLandlordReports } from "./lib/tenantManagementService";
import { getOrCreateConversation } from "./lib/messagingService";
import {
  requestTermination,
  acceptMutualTermination,
  withdrawMutualTermination,
} from "./lib/postRentService";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const BRAND  = "#F36C6C";
const CORAL  = "#E8735A";
const LIGHT  = "#FF8A80";
const INK    = "#101321";
const MUTED  = "#6B7280";
const BG     = "#FAF7F6";
const BORDER = "#EFE7E5";

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── TenantAvatar ─────────────────────────────────────────────────────────────
function TenantAvatar({ name, url }) {
  const [imgErr, setImgErr] = useState(false);
  const initial = (name || "?")[0].toUpperCase();

  const fallback = (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-2xl text-white font-bold text-xl select-none"
      style={{
        width: 52, height: 52,
        background: `linear-gradient(135deg, ${LIGHT}, ${BRAND})`,
        boxShadow: `0 3px 8px ${BRAND}40`,
      }}
    >
      {initial}
    </div>
  );

  if (!url || imgErr) return fallback;

  return (
    <img
      src={url}
      alt={name}
      onError={() => setImgErr(true)}
      className="flex-shrink-0 object-cover rounded-2xl"
      style={{
        width: 52, height: 52,
        border: `1.5px solid ${BRAND}4D`,
        boxShadow: `0 3px 8px ${BRAND}2E`,
      }}
    />
  );
}

// ─── Status pill helpers ──────────────────────────────────────────────────────
function statusPill(tenant) {
  const t = tenant?.contract_termination;
  const term = Array.isArray(t) ? t[0] : t;
  const status = tenant.status;
  if (status === "paid" && !term) return { label: "Active", bg: "#22C55E21", fg: "#15803D", dot: "#22C55E" };
  if (term?.type === "mutual" && !term.mutual_accepted_by_landlord_at && !term.mutual_withdrawn_at) {
    return { label: "Mutual proposal", bg: "#FEF3C7", fg: "#92400E", dot: "#D97706" };
  }
  if (status === "terminating") return { label: "Terminating", bg: "#FEF3C7", fg: "#92400E", dot: "#D97706" };
  if (status === "expiring")    return { label: "Non-renewal", bg: "#FEF3C7", fg: "#92400E", dot: "#D97706" };
  if (status === "terminated" || status === "ended") return { label: "Awaiting close-out", bg: "#FEF3C7", fg: "#92400E", dot: "#D97706" };
  if (status === "closed")      return { label: "Closed", bg: "#E2E8F0", fg: "#475569", dot: "#94A3B8" };
  return { label: "Active", bg: "#22C55E21", fg: "#15803D", dot: "#22C55E" };
}

function tenantTermination(tenant) {
  const t = tenant?.contract_termination;
  return Array.isArray(t) ? t[0] : t;
}

// ─── TenantCard ───────────────────────────────────────────────────────────────
function TenantCard({ tenant, openReports, chatLoading, onReports, onPayments, onChat,
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
    { icon: MessageCircle, label: "Chat",     onClick: onChat, loading: chatLoading },
  ];

  return (
    <div
      className="bg-white rounded-2xl p-4"
      style={{ border: `1px solid ${BORDER}`, boxShadow: `0 4px 14px ${BRAND}0F` }}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <TenantAvatar name={name} url={profile.avatar_url || ""} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base truncate" style={{ color: INK }}>
            {name || "Tenant"}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Home size={12} color={MUTED} />
            <p className="text-xs truncate" style={{ color: MUTED }}>{title}</p>
          </div>
        </div>
        <span
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0"
          style={{ background: pill.bg, color: pill.fg }}
        >
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: pill.dot }} />
          {pill.label}
        </span>
      </div>

      {/* Termination summary line */}
      {term && (
        <div className="text-[11px] mb-3 px-2 py-2 rounded-lg" style={{ background: "#FEF3C7", color: "#92400E" }}>
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

      {/* ── Info row ───────────────────────────────────── */}
      <div
        className="flex rounded-xl overflow-hidden mb-3"
        style={{ background: BG, border: `1px solid ${BORDER}` }}
      >
        {stats.map((s, i) => (
          <div key={s.label} className="flex-1 flex flex-col items-center py-3 relative">
            {i > 0 && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-px"
                style={{ height: 30, background: BORDER }}
              />
            )}
            <s.icon size={14} color={s.accent ? BRAND : BRAND} />
            <p
              className="text-sm font-bold mt-1 truncate max-w-full px-1"
              style={{ color: s.accent ? BRAND : INK }}
            >
              {s.value}
            </p>
            <p className="text-[10px]" style={{ color: MUTED }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Contact chips ──────────────────────────────── */}
      {(email || phone) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {email && (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs"
              style={{ background: `${BRAND}0F`, border: `1px solid ${BRAND}33`, color: INK }}
            >
              <Mail size={11} color={BRAND} />
              {email}
            </span>
          )}
          {phone && (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs"
              style={{ background: `${BRAND}0F`, border: `1px solid ${BRAND}33`, color: INK }}
            >
              <Phone size={11} color={BRAND} />
              {phone}
            </span>
          )}
        </div>
      )}

      {/* ── Actions ────────────────────────────────────── */}
      <div
        className="flex rounded-xl overflow-hidden"
        style={{ border: `1px solid ${BORDER}` }}
      >
        {actions.map((a, i) => (
          <button
            key={a.label}
            onClick={a.onClick}
            disabled={a.loading}
            className="flex-1 flex flex-col items-center py-2.5 gap-1 hover:bg-red-50 active:bg-red-100 transition-colors relative disabled:opacity-60"
          >
            {i > 0 && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-px"
                style={{ height: 22, background: BORDER }}
              />
            )}
            {a.loading
              ? <Loader2 size={18} color={BRAND} className="animate-spin" />
              : <a.icon size={18} color={BRAND} />
            }
            <span className="text-xs font-semibold" style={{ color: BRAND }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* ── Lease actions ──────────────────────────────── */}
      <div className="mt-3 flex flex-wrap gap-2">
        {tenantProposedMutual && (
          <>
            <button
              onClick={() => onAcceptMutual(tenant)}
              disabled={actionBusy}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
              style={{ background: "#22C55E" }}
            >
              <CheckCircle2 size={14} /> Accept proposal
            </button>
            <button
              onClick={() => onWithdrawMutual(tenant)}
              disabled={actionBusy}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50"
              style={{ borderColor: BORDER, color: INK }}
            >
              <XCircle size={14} /> Decline
            </button>
          </>
        )}
        {landlordProposedMutual && (
          <button
            onClick={() => onWithdrawMutual(tenant)}
            disabled={actionBusy}
            className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50"
            style={{ borderColor: BORDER, color: INK }}
          >
            <X size={14} /> Withdraw proposal
          </button>
        )}
        {isActiveNoTerm && (
          <>
            {isMTM && (
              <button
                onClick={() => onTerminateMTM(tenant)}
                disabled={actionBusy}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50"
                style={{ borderColor: "#FCA5A5", color: "#B91C1C" }}
              >
                <LogOut size={14} /> 30-day Notice
              </button>
            )}
            {!isMTM && (
              <button
                onClick={() => onProposeMutual(tenant)}
                disabled={actionBusy}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50"
                style={{ borderColor: BORDER, color: INK }}
              >
                <LogOut size={14} /> Propose mutual
              </button>
            )}
            <button
              onClick={() => onNonRenewal(tenant)}
              disabled={actionBusy}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50"
              style={{ borderColor: BORDER, color: INK }}
            >
              Do Not Renew
            </button>
            <button
              onClick={() => onEvict(tenant)}
              disabled={actionBusy}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{ background: "#FEE2E2", color: "#B91C1C" }}
            >
              <ShieldAlert size={14} /> Evict
            </button>
          </>
        )}
        {inMoveOutFlow && (
          <button
            onClick={() => onMoveOut(tenant)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white"
            style={{ background: BRAND }}
          >
            <FileText size={14} /> Move-out checklist
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TenantManagement() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [tenants,      setTenants]      = useState([]);
  const [openReports,  setOpenReports]  = useState([]);
  const [query,        setQuery]        = useState("");
  const [chatLoading,  setChatLoading]  = useState(null); // contract id
  const [actionBusy,   setActionBusy]   = useState(false);
  const [terminationModal, setTerminationModal] = useState(null); // { tenant, kind }

  // Redirect unauthenticated visitors
  useEffect(() => {
    if (isAuthenticated === false) navigate("/login");
  }, [isAuthenticated, navigate]);

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

  // ── Derived ─────────────────────────────────────────────────────────────────
  const filtered = query.trim()
    ? tenants.filter((t) => {
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
    : tenants;

  const openCountFor = (contractId) =>
    openReports.filter((r) => r.contract_id === contractId).length;

  const uniqueProps = new Set(tenants.map((t) => t.listing_id).filter(Boolean)).size;

  // ── Chat handler ────────────────────────────────────────────────────────────
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

  // ── Lease action handlers ───────────────────────────────────────────────────
  const onTerminateMTM   = (tenant) => setTerminationModal({ tenant, kind: "notice" });
  const onProposeMutual  = (tenant) => setTerminationModal({ tenant, kind: "mutual" });
  const onNonRenewal     = (tenant) => setTerminationModal({ tenant, kind: "non_renewal" });
  const onEvict          = (tenant) => setTerminationModal({ tenant, kind: "eviction" });
  const onMoveOut        = (tenant) => navigate(`/contract/${tenant.id}/move-out`);

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

  const initial = (profile?.full_name || user?.email || "?")[0].toUpperCase();

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <Loader2 className="animate-spin" size={40} color={BRAND} />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: BG }}>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${LIGHT} 0%, ${BRAND} 50%, ${CORAL} 100%)`,
          paddingBottom: 56,
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 240, height: 240, right: -80, top: -80, background: "rgba(255,255,255,0.08)" }}
        />
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 180, height: 180, left: -60, bottom: -90, background: "rgba(255,255,255,0.06)" }}
        />

        {/* Top nav row */}
        <div className="relative z-10 max-w-5xl mx-auto flex items-center justify-between px-4 pt-4 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} color="white" />
          </button>

          <span className="text-white text-[10px] font-bold tracking-[1.4px] uppercase px-3 py-1 rounded-full bg-white/20">
            VIEWXRENT · LANDLORD
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw size={18} color="white" />
            </button>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="w-9 h-9 rounded-full bg-white/30 flex items-center justify-center text-white font-bold text-sm border-2 border-white/50 hover:bg-white/40 transition-colors"
              >
                {initial}
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-11 z-50">
                  <ProfileDropdown onLogout={() => setDropdownOpen(false)} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Title block */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-3">
          <h1 className="text-[28px] font-extrabold text-white leading-tight">
            Tenants &amp; Stays
          </h1>
          <p className="text-white/90 text-sm mt-1">
            {tenants.length === 0
              ? "You have no active tenants yet"
              : `Manage ${tenants.length} active tenant${tenants.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {/* ── Body (overlaps hero) ──────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 -mt-9 pb-14 relative z-10">

        {/* Stats card */}
        <div
          className="bg-white rounded-2xl mb-5"
          style={{ boxShadow: `0 8px 24px ${BRAND}2A` }}
        >
          <div className="flex divide-x" style={{ "--tw-divide-opacity": 1, borderColor: BORDER }}>
            {[
              { icon: Users,        color: BRAND,  label: "Active",       value: tenants.length },
              { icon: AlertCircle,  color: CORAL,  label: "Open reports", value: openReports.length },
              { icon: Building2,    color: LIGHT,  label: "Properties",   value: uniqueProps },
            ].map((s) => (
              <div key={s.label} className="flex-1 flex flex-col items-center py-4"
                style={{ borderColor: BORDER }}>
                <div
                  className="rounded-full flex items-center justify-center mb-2"
                  style={{ width: 40, height: 40, background: `${s.color}21` }}
                >
                  <s.icon size={18} color={s.color} />
                </div>
                <p className="text-lg font-bold" style={{ color: INK }}>{s.value}</p>
                <p className="text-xs" style={{ color: MUTED }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 mb-4"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <Search size={18} color={BRAND} className="flex-shrink-0" />
          <input
            type="text"
            placeholder="Search tenant, property, email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 outline-none text-sm bg-transparent placeholder-gray-400"
            style={{ color: INK }}
          />
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded" style={{ background: BRAND }} />
            <h2 className="text-base font-bold" style={{ color: INK }}>Active Tenants</h2>
          </div>
          <span className="text-xs font-semibold" style={{ color: MUTED }}>{filtered.length}</span>
        </div>

        {/* Tenant grid / empty state */}
        {filtered.length === 0 ? (
          <div
            className="bg-white rounded-2xl flex flex-col items-center py-12 px-6 text-center"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <Users size={56} color={`${BRAND}80`} />
            <p className="mt-3 font-semibold text-base" style={{ color: INK }}>
              No active tenants yet
            </p>
            <p className="mt-1 text-sm max-w-xs" style={{ color: MUTED }}>
              {query
                ? "No tenants match your search."
                : "Tenants appear here once their contract is fully signed and paid."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                openReports={openCountFor(tenant.id)}
                chatLoading={chatLoading === tenant.id}
                onReports={() => navigate("/reports")}
                onPayments={() => navigate(`/contract/${tenant.id}`)}
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
      </div>

      {/* Chat loading overlay */}
      {chatLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl">
            <Loader2 className="animate-spin" size={32} color={BRAND} />
            <p className="text-sm font-medium" style={{ color: INK }}>Opening chat…</p>
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

    </div>
  );
}

// ─── LandlordTerminationModal ─────────────────────────────────────────────────
function LandlordTerminationModal({ tenant, kind, busy, onClose, onSubmit }) {
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [effectiveDate, setEffectiveDate] = useState(() => {
    if (kind === "notice")      return new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    if (kind === "non_renewal") return tenant.end_date ?? new Date().toISOString().slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  });
  const [reason, setReason]               = useState("");
  const [confirm, setConfirm]             = useState(false);

  const config = {
    notice:      { title: "30-day notice (month-to-month)", needReason: false, evidence: false },
    mutual:      { title: "Propose mutual termination",     needReason: true,  evidence: false },
    non_renewal: { title: "Do not renew this lease",         needReason: false, evidence: false },
    eviction:    { title: "Initiate eviction",                needReason: true,  evidence: true },
  }[kind];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!confirm) return;
    if (config.needReason && !reason.trim()) return;
    await onSubmit({ kind, reason: reason.trim() || null, effectiveDate });
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
            <h3 className="text-lg font-bold" style={{ color: INK }}>{config.title}</h3>
            <p className="text-[12px] mt-1" style={{ color: MUTED }}>
              Tenant: <strong>{resolveName(tenant.tenant_profile, tenant.application)}</strong>
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-semibold" style={{ color: INK }}>Effective date</span>
          <input
            type="date"
            value={effectiveDate}
            min={today}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F36C6C]/40"
          />
        </label>

        <label className="block mt-3">
          <span className="text-xs font-semibold" style={{ color: INK }}>
            Reason {config.needReason && <span className="text-red-500">*</span>}
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={config.evidence ? "Lease violation details — include evidence reference if applicable" : "Optional"}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F36C6C]/40"
          />
        </label>

        <label className="mt-4 flex items-start gap-2 text-[12px] cursor-pointer" style={{ color: MUTED }}>
          <input
            type="checkbox"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
            className="mt-0.5"
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

        <div className="mt-5 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50"
            style={{ color: INK }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!confirm || busy || (config.needReason && !reason.trim())}
            className="px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
            style={{ background: BRAND }}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {kind === "mutual" ? "Send proposal" : "Confirm"}
          </button>
        </div>
      </form>
    </div>
  );
}
