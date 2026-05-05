import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, BellRing, CheckCircle2,
  CreditCard, Loader2, Receipt, FileSignature, Hourglass,
  Home, ChevronRight, Search,
} from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import {
  fetchMyPaymentsWithContext,
  fetchMyInProgressContracts,
} from "./lib/paymentsService";

// ─── Brand tokens (match mobile palette) ──────────────────────────────────────
const ORANGE      = "#FF9800";
const LIGHT_OR    = "#FFF3E0";
const INK         = "#333333";
const MUTED       = "#666666";
const BORDER      = "#EEEEEE";
const SUCCESS     = "#4CAF50";
const SUCCESS_BG  = "#E8F5E9";
const DANGER      = "#EF5350";
const SLATE       = "#607D8B";
const INFO        = "#1E88E5";
const INFO_BG     = "#E3F2FD";

const PHP = (n) =>
  `₱${Number(n ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const STATUS_COLOR = {
  succeeded: SUCCESS,
  pending:   ORANGE,
  refunded:  SLATE,
  failed:    DANGER,
};

// Sort order for actionable contracts: ready-to-pay first, then sign-needed,
// then waiting-on-landlord. Outside the component so it's a stable reference
// for useMemo dep arrays.
const STATUS_ORDER = { fully_signed: 0, awaiting_tenant: 1, awaiting_landlord: 2 };

// Per-contract action presets. Drives the action card that tells the
// tenant exactly what to do for each in-progress contract.
const ACTION_FOR_STATUS = {
  awaiting_tenant: {
    Icon:    FileSignature,
    color:   ORANGE,
    bg:      LIGHT_OR,
    title:   "Sign your contract",
    body:    "Your landlord signed first. Review the contract and add your signature to unlock payment.",
    cta:     "Review & sign",
    go:      (id) => `/contract/${id}`,
  },
  awaiting_landlord: {
    Icon:    Hourglass,
    color:   INFO,
    bg:      INFO_BG,
    title:   "Awaiting landlord signature",
    body:    "You've signed. The landlord needs to countersign before you can pay the move-in.",
    cta:     "View contract",
    go:      (id) => `/contract/${id}`,
  },
  fully_signed: {
    Icon:    CreditCard,
    color:   SUCCESS,
    bg:      SUCCESS_BG,
    title:   "Ready for move-in payment",
    body:    "Both parties signed. Pay the move-in to activate your rental.",
    cta:     "Pay now",
    go:      (id) => `/contract/${id}/pay`,
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MyPayments() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [error, setError] = useState(null);

  const initial = (profile?.full_name || user?.email || "?").charAt(0).toUpperCase();

  useEffect(() => {
    if (isAuthenticated === false) navigate("/login");
  }, [isAuthenticated, navigate]);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id) return;
    if (silent) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [pRes, cRes] = await Promise.all([
        fetchMyPaymentsWithContext(user.id),
        fetchMyInProgressContracts(user.id),
      ]);
      if (pRes.error) throw pRes.error;
      if (cRes.error) throw cRes.error;
      setPayments(pRes.data ?? []);
      setInProgress(cRes.data ?? []);
    } catch (err) {
      setError(err?.message || "Failed to load payments.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalPaidCents = useMemo(
    () => payments
      .filter((p) => p.status === "succeeded")
      .reduce((sum, p) => sum + (Number(p.amount_cents) || 0), 0),
    [payments]
  );
  const totalPaid = totalPaidCents / 100;

  const pendingCount = useMemo(
    () => payments.filter((p) => p.status === "pending").length,
    [payments]
  );

  // Sort actionable contracts so the tenant sees the most urgent CTA first.
  const actionableContracts = useMemo(
    () => [...inProgress].sort(
      (a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
    ),
    [inProgress]
  );

  const totalDue = actionableContracts
    .filter((c) => c.status === "fully_signed")
    .reduce(
      (sum, c) =>
        sum +
        Number(c.monthly_rent || 0) +
        Number(c.security_deposit || 0) +
        Number(c.advance_payment || 0),
      0
    );

  const hasDue = totalDue > 0;
  const hasAnyContract = actionableContracts.length > 0 || payments.length > 0;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin" size={32} color={ORANGE} />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white" style={{ color: INK }}>
      {/* Header */}
      <header className="h-14 border-b flex items-center px-4 gap-3 bg-white sticky top-0 z-20"
              style={{ borderColor: BORDER }}>
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-slate-100" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">Payments</h1>
        <button onClick={() => refresh({ silent: true })}
                disabled={refreshing}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                aria-label="Refresh">
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
        </button>
        {isAuthenticated && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-full pl-1.5 pr-3 py-1"
              style={{ background: LIGHT_OR }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm text-white"
                   style={{ background: ORANGE }}>
                {initial}
              </div>
              <span className="text-[11px]" style={{ color: ORANGE }}>▾</span>
            </button>
            {dropdownOpen && <ProfileDropdown />}
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-5">
        {error && (
          <div className="rounded-xl border p-3 text-sm"
               style={{ borderColor: `${DANGER}55`, background: "#FFEBEE", color: DANGER }}>
            {error}
          </div>
        )}

        {/* ── Summary banner ── */}
        <SummaryBanner
          actionable={actionableContracts}
          totalDue={totalDue}
          hasAnyContract={hasAnyContract}
          onBrowse={() => navigate("/home2")}
        />

        {/* ── Totals Row ── */}
        <section className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total Paid"
            value={PHP(totalPaid)}
            color={SUCCESS}
            sub={payments.length ? `${payments.length} ${payments.length === 1 ? "transaction" : "transactions"}` : "All completed payments"}
          />
          <StatCard
            label={pendingCount > 0 ? "Pending Charges" : "Amount Due"}
            value={pendingCount > 0
              ? `${pendingCount} ${pendingCount === 1 ? "payment" : "payments"}`
              : PHP(totalDue)}
            color={hasDue || pendingCount > 0 ? ORANGE : SUCCESS}
            sub={hasDue
              ? `${actionableContracts.filter((c) => c.status === "fully_signed").length} contract${actionableContracts.filter((c) => c.status === "fully_signed").length === 1 ? "" : "s"} ready`
              : pendingCount > 0
                ? "Processing"
                : "Nothing pending"}
          />
        </section>

        {/* ── Per-contract action cards ── */}
        {actionableContracts.length > 0 && (
          <section className="space-y-3">
            {actionableContracts.map((c) => (
              <ContractActionCard
                key={c.id}
                contract={c}
                onAction={(href) => navigate(href)}
              />
            ))}
          </section>
        )}

        {/* ── Payment Method ── */}
        <section className="rounded-xl border p-4 flex items-center gap-3"
                 style={{ borderColor: BORDER }}>
          <div className="rounded-lg p-2.5" style={{ background: LIGHT_OR }}>
            <CreditCard size={22} color={ORANGE} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: MUTED }}>Payment Method</p>
            <p className="text-base font-bold truncate">Card via Stripe</p>
            <p className="text-xs" style={{ color: MUTED }}>Sandbox — test cards only</p>
          </div>
        </section>

        {/* ── Transaction History ── */}
        <section className="rounded-xl border p-4" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2 mb-1">
            <Receipt size={18} color={INK} />
            <h2 className="text-lg font-bold">Transaction History</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: MUTED }}>
            All recorded payments on your account
          </p>

          {payments.length === 0 ? (
            <EmptyHistory hasContracts={actionableContracts.length > 0} onBrowse={() => navigate("/home2")} />
          ) : (
            <div className="overflow-x-auto">
              <div
                className="grid grid-cols-[2fr_3fr_2fr_2fr_auto] gap-2 px-2 py-3 text-[11px] font-bold rounded-lg mb-2"
                style={{ background: "#F9FAFB", color: MUTED, border: `1px solid ${BORDER}` }}
              >
                <span>DATE</span>
                <span>PROPERTY</span>
                <span>AMOUNT</span>
                <span>STATUS</span>
                <span></span>
              </div>
              <div>
                {payments.map((p, i) => (
                  <TxRow
                    key={p.id}
                    payment={p}
                    last={i === payments.length - 1}
                    onOpen={() => p.contract_id && navigate(`/contract/${p.contract_id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryBanner({ actionable, totalDue, hasAnyContract, onBrowse }) {
  // Decide what to surface in the top banner. Priority: ready-to-pay >
  // signature-needed > waiting > all paid > no contracts at all.
  const fullySigned = actionable.filter((c) => c.status === "fully_signed");
  const awaitingMine = actionable.filter((c) => c.status === "awaiting_tenant");
  const awaitingLandlord = actionable.filter((c) => c.status === "awaiting_landlord");

  if (fullySigned.length > 0) {
    return (
      <Banner
        icon={<BellRing size={20} color={ORANGE} />}
        color={ORANGE}
        bg={LIGHT_OR}
        title={fullySigned.length === 1 ? "Upcoming Payment Reminder" : `${fullySigned.length} payments due`}
        body={fullySigned.length === 1
          ? `Your move-in payment of ${PHP(totalDue)} for ${fullySigned[0].listings?.title || "your rental"} is due now.`
          : `You have ${fullySigned.length} contracts ready for move-in. Total due: ${PHP(totalDue)}.`}
      />
    );
  }
  if (awaitingMine.length > 0) {
    return (
      <Banner
        icon={<FileSignature size={20} color={ORANGE} />}
        color={ORANGE}
        bg={LIGHT_OR}
        title="Action needed: sign your contract"
        body={`You have ${awaitingMine.length} contract${awaitingMine.length === 1 ? "" : "s"} waiting for your signature before payment can begin.`}
      />
    );
  }
  if (awaitingLandlord.length > 0) {
    return (
      <Banner
        icon={<Hourglass size={20} color={INFO} />}
        color={INFO}
        bg={INFO_BG}
        title="Awaiting landlord countersignature"
        body={`${awaitingLandlord.length} contract${awaitingLandlord.length === 1 ? "" : "s"} waiting on the landlord. You'll be able to pay once they sign.`}
      />
    );
  }
  if (!hasAnyContract) {
    return (
      <Banner
        icon={<Search size={20} color={INFO} />}
        color={INFO}
        bg={INFO_BG}
        title="No active rentals yet"
        body="Browse listings and apply — once a landlord approves and both of you sign, payment unlocks here."
        actionLabel="Browse listings"
        onAction={onBrowse}
      />
    );
  }
  return (
    <Banner
      icon={<CheckCircle2 size={20} color={SUCCESS} />}
      color={SUCCESS}
      bg={SUCCESS_BG}
      title="Up to date"
      body="No pending payments. You're all caught up."
    />
  );
}

function Banner({ icon, color, bg, title, body, actionLabel, onAction }) {
  return (
    <section
      className="rounded-xl p-4 border"
      style={{ background: bg, borderColor: `${color}55` }}
    >
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-bold">{title}</h2>
      </div>
      <p className="text-sm mt-3 leading-relaxed" style={{ color: MUTED }}>
        {body}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ background: color }}
        >
          {actionLabel}
        </button>
      )}
    </section>
  );
}

function ContractActionCard({ contract, onAction }) {
  const cfg = ACTION_FOR_STATUS[contract.status];
  if (!cfg) return null;
  const total =
    Number(contract.monthly_rent || 0) +
    Number(contract.security_deposit || 0) +
    Number(contract.advance_payment || 0);
  const title = contract.listings?.title || "Rental";

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: BORDER }}>
      <div className="flex items-start gap-3">
        <div className="rounded-lg p-2.5 flex-shrink-0" style={{ background: cfg.bg }}>
          <cfg.Icon size={20} color={cfg.color} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-bold truncate">{cfg.title}</p>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: `${cfg.color}1A`, color: cfg.color }}
            >
              {contract.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: MUTED }}>
            <Home size={11} className="inline -mt-0.5 mr-1" />
            {title}
          </p>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: MUTED }}>
            {cfg.body}
          </p>
        </div>
      </div>

      {contract.status === "fully_signed" && total > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <Mini label="First month"  value={PHP(contract.monthly_rent)} />
          <Mini label="Deposit"      value={PHP(contract.security_deposit)} />
          <Mini label="Advance"      value={PHP(contract.advance_payment)} />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        {contract.status === "fully_signed" && total > 0 ? (
          <p className="text-sm font-bold" style={{ color: cfg.color }}>
            Total due: {PHP(total)}
          </p>
        ) : <span />}
        <button
          onClick={() => onAction(cfg.go(contract.id))}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold transition hover:opacity-90"
          style={{ background: cfg.color }}
        >
          {cfg.cta}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-lg p-2" style={{ background: "#F9FAFB", border: `1px solid ${BORDER}` }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>{label}</p>
      <p className="text-xs font-bold mt-0.5">{value}</p>
    </div>
  );
}

function StatCard({ label, value, color, sub }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: BORDER }}>
      <p className="text-sm font-medium" style={{ color: MUTED }}>{label}</p>
      <p className="text-2xl font-bold mt-2" style={{ color }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: MUTED }}>{sub}</p>
    </div>
  );
}

function TxRow({ payment, last, onOpen }) {
  const status = (payment.status ?? "succeeded").toLowerCase();
  const statusColor = STATUS_COLOR[status] ?? DANGER;
  const cents = Number(payment.amount_cents) || 0;
  const title = payment.contract?.listings?.title || "Listing";
  const clickable = !!payment.contract_id;
  return (
    <button
      type="button"
      onClick={clickable ? onOpen : undefined}
      disabled={!clickable}
      className={`grid grid-cols-[2fr_3fr_2fr_2fr_auto] gap-2 items-center px-2 py-3 text-xs w-full text-left ${clickable ? "hover:bg-slate-50 cursor-pointer" : "cursor-default"}`}
      style={{ borderBottom: last ? "none" : `1px solid ${BORDER}`, color: INK }}
    >
      <span>{fmtDate(payment.paid_at)}</span>
      <span className="truncate">{title}</span>
      <span className="font-semibold">{PHP(cents / 100)}</span>
      <span className="font-semibold capitalize" style={{ color: statusColor }}>
        {status}
      </span>
      <span className="text-slate-300">
        {clickable ? <ChevronRight size={14} /> : null}
      </span>
    </button>
  );
}

function EmptyHistory({ hasContracts, onBrowse }) {
  return (
    <div className="text-center py-8">
      <Receipt size={28} className="mx-auto" color={MUTED} />
      <p className="text-sm font-semibold mt-2" style={{ color: INK }}>
        No payments yet
      </p>
      <p className="text-xs mt-1" style={{ color: MUTED }}>
        {hasContracts
          ? "Complete the action above to record your first payment."
          : "Once you pay your first move-in, it will appear here."}
      </p>
      {!hasContracts && (
        <button
          onClick={onBrowse}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ background: ORANGE }}
        >
          Browse listings
        </button>
      )}
    </div>
  );
}
