import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw, BellRing, CheckCircle2,
  CreditCard, Loader2, Receipt, FileSignature, Hourglass,
  Home, ChevronRight, Search, Trash2, PlusCircle, Filter,
} from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import AppHeader from "./components/AppHeader.jsx";
import {
  fetchMyPaymentsWithContext,
  fetchMyInProgressContracts,
} from "./lib/paymentsService";
import {
  listMyPaymentMethods, deletePaymentMethod, setDefaultPaymentMethod,
} from "./lib/paymentMethodsService";
import { METHOD_LABELS } from "./lib/paymongo";
import {
  Badge, Button, Card, EmptyState, PageHero, Stat, Tabs, PaymentMethodIcon,
} from "./components/vxr";
import AddPaymentMethodModal from "./components/AddPaymentMethodModal.jsx";
import Footer from "./Footer.jsx";

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

// Map payment status → vxr Badge tone + display label.
const STATUS_BADGE = {
  succeeded:       { tone: "success", label: "Succeeded" },
  pending:         { tone: "warning", label: "Pending"   },
  requires_action: { tone: "info",    label: "Action"    },
  refunded:        { tone: "neutral", label: "Refunded"  },
  failed:          { tone: "danger",  label: "Failed"    },
  cancelled:       { tone: "neutral", label: "Cancelled" },
};

const STATUS_FILTERS = [
  { value: "",          label: "All statuses" },
  { value: "succeeded", label: "Succeeded"    },
  { value: "pending",   label: "Pending"      },
  { value: "failed",    label: "Failed"       },
  { value: "refunded",  label: "Refunded"     },
  { value: "cancelled", label: "Cancelled"    },
];

const METHOD_FILTERS = [
  { value: "",              label: "All methods" },
  { value: "card",          label: "Card"        },
  { value: "gcash",         label: "GCash"       },
  { value: "paymaya",       label: "Maya"        },
  { value: "grab_pay",      label: "GrabPay"     },
  { value: "bank_transfer", label: "Bank"        },
];

// Urgency order for actionable contracts (ready-to-pay first).
const STATUS_ORDER = { fully_signed: 0, awaiting_tenant: 1, awaiting_landlord: 2 };

const ACTION_FOR_STATUS = {
  awaiting_tenant: {
    Icon:     FileSignature,
    badge:    { tone: "warning", label: "Sign needed" },
    title:    "Sign your contract",
    body:     "Your landlord signed first. Review the contract and add your signature to unlock payment.",
    cta:      "Review & sign",
    go:       (id) => `/contract/${id}`,
    variant:  "primary",
  },
  awaiting_landlord: {
    Icon:     Hourglass,
    badge:    { tone: "info", label: "Waiting" },
    title:    "Awaiting landlord signature",
    body:     "You've signed. The landlord needs to countersign before you can pay the move-in.",
    cta:      "View contract",
    go:       (id) => `/contract/${id}`,
    variant:  "secondary",
  },
  fully_signed: {
    Icon:     CreditCard,
    badge:    { tone: "success", label: "Ready to pay" },
    title:    "Ready for move-in payment",
    body:     "Both parties signed. Pay the move-in to activate your rental.",
    cta:      "Pay now",
    go:       (id) => `/contract/${id}/pay`,
    variant:  "primary",
  },
};

const HISTORY_PAGE_SIZE = 20;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MyPayments() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [activeTab,  setActiveTab]  = useState("overview");
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments,   setPayments]   = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [savedMethods, setSavedMethods] = useState([]);
  const [error, setError] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [busyMethodId, setBusyMethodId] = useState(null);
  const [pageSize, setPageSize] = useState(HISTORY_PAGE_SIZE);

  // Sticky flag: once true, the empty-state banner stays "all caught up"
  // even if the user filters their history down to zero rows.
  const [hasAnyPaymentEver, setHasAnyPaymentEver] = useState(false);

  // Filter bar state (History tab).
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterMethod,   setFilterMethod]   = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo,   setFilterDateTo]   = useState("");

  const initialLoaded = useRef(false);

  useEffect(() => {
    if (isAuthenticated === false) navigate("/login");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!user?.id) { setHasAnyPaymentEver(false); return; }
    let cancelled = false;
    fetchMyPaymentsWithContext({ tenantId: user.id }).then(({ data }) => {
      if (!cancelled) setHasAnyPaymentEver((data?.length ?? 0) > 0);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id) return;
    if (silent || initialLoaded.current) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [pRes, cRes, mRes] = await Promise.all([
        fetchMyPaymentsWithContext({
          tenantId:   user.id,
          status:     filterStatus  || undefined,
          methodType: filterMethod  || undefined,
          dateFrom:   filterDateFrom || undefined,
          dateTo:     filterDateTo   || undefined,
        }),
        fetchMyInProgressContracts(user.id),
        listMyPaymentMethods(),
      ]);
      if (pRes.error) throw pRes.error;
      if (cRes.error) throw cRes.error;
      setPayments(pRes.data ?? []);
      setInProgress(cRes.data ?? []);
      setSavedMethods(mRes.data ?? []);
      initialLoaded.current = true;
    } catch (err) {
      setError(err?.message || "Failed to load payments.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, filterStatus, filterMethod, filterDateFrom, filterDateTo]);

  useEffect(() => { refresh(); }, [refresh]);

  // Reset pagination when filters change so users see the top of the new set.
  useEffect(() => {
    setPageSize(HISTORY_PAGE_SIZE);
  }, [filterStatus, filterMethod, filterDateFrom, filterDateTo]);

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

  const hasFilter = !!(filterStatus || filterMethod || filterDateFrom || filterDateTo);
  const hasAnyContract = actionableContracts.length > 0 || hasAnyPaymentEver;
  const visiblePayments = useMemo(
    () => payments.slice(0, pageSize),
    [payments, pageSize]
  );

  const refreshMethods = useCallback(async () => {
    const res = await listMyPaymentMethods();
    setSavedMethods(res.data ?? []);
  }, []);

  const handleSetDefault = async (id) => {
    setBusyMethodId(id);
    await setDefaultPaymentMethod(id);
    await refreshMethods();
    setBusyMethodId(null);
  };

  const handleDeleteMethod = async (id) => {
    setBusyMethodId(id);
    await deletePaymentMethod(id);
    await refreshMethods();
    setBusyMethodId(null);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-vxr-bg">
        <Loader2 className="animate-spin text-vxr-accent" size={32} />
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "history",  label: `History${payments.length ? ` (${payments.length})` : ""}` },
    { id: "methods",  label: `Methods${savedMethods.length ? ` (${savedMethods.length})` : ""}` },
  ];

  return (
    <div className="w-full min-h-screen bg-vxr-bg">
      <AppHeader showBack />

      <PageHero
        eyebrow={payments.length ? `${payments.length} ${payments.length === 1 ? "payment" : "payments"} recorded` : undefined}
        title="Payments"
        subtitle="Track move-in dues, transaction history, and your saved methods."
      >
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          onClick={() => refresh({ silent: true })}
          disabled={refreshing}
          className={refreshing ? "[&_svg]:animate-spin" : ""}
        >
          Refresh
        </Button>
      </PageHero>

      <div className="w-full max-w-5xl mx-auto px-4 pt-4">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>

      <main className="max-w-5xl mx-auto p-4 pt-5 space-y-5">
        {error && (
          <div className="rounded-vxr-md border border-vxr-danger/30 bg-vxr-danger-soft text-vxr-danger text-sm px-4 py-3">
            {error}
          </div>
        )}

        {activeTab === "overview" && (
          <OverviewTab
            actionable={actionableContracts}
            totalDue={totalDue}
            totalPaid={totalPaid}
            pendingCount={pendingCount}
            paymentsCount={payments.length}
            hasAnyContract={hasAnyContract}
            onBrowse={() => navigate("/home2")}
            onContractAction={(href) => navigate(href)}
            onGoToMethods={() => setActiveTab("methods")}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab
            payments={payments}
            visiblePayments={visiblePayments}
            pageSize={pageSize}
            onLoadMore={() => setPageSize((s) => s + HISTORY_PAGE_SIZE)}
            filterStatus={filterStatus}     setFilterStatus={setFilterStatus}
            filterMethod={filterMethod}     setFilterMethod={setFilterMethod}
            filterDateFrom={filterDateFrom} setFilterDateFrom={setFilterDateFrom}
            filterDateTo={filterDateTo}     setFilterDateTo={setFilterDateTo}
            hasFilter={hasFilter}
            hasAnyPaymentEver={hasAnyPaymentEver}
            onOpenContract={(id) => navigate(`/contract/${id}`)}
            onBrowse={() => navigate("/home2")}
          />
        )}

        {activeTab === "methods" && (
          <MethodsTab
            methods={savedMethods}
            busyId={busyMethodId}
            onAdd={() => setAddOpen(true)}
            onSetDefault={handleSetDefault}
            onDelete={handleDeleteMethod}
          />
        )}
      </main>

      <AddPaymentMethodModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => { setAddOpen(false); refreshMethods(); }}
      />

      <Footer />
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function OverviewTab({
  actionable, totalDue, totalPaid, pendingCount, paymentsCount,
  hasAnyContract, onBrowse, onContractAction, onGoToMethods,
}) {
  return (
    <div className="space-y-5">
      <SummaryBanner
        actionable={actionable}
        totalDue={totalDue}
        hasAnyContract={hasAnyContract}
        onBrowse={onBrowse}
      />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat
          label="Total paid"
          value={PHP(totalPaid)}
          icon={CheckCircle2}
        />
        <Stat
          label={totalDue > 0 ? "Outstanding" : "Pending charges"}
          value={
            totalDue > 0
              ? PHP(totalDue)
              : `${pendingCount} ${pendingCount === 1 ? "payment" : "payments"}`
          }
          icon={totalDue > 0 ? BellRing : Hourglass}
        />
        <Stat
          label="Transactions"
          value={String(paymentsCount)}
          icon={Receipt}
        />
      </section>

      {actionable.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-sm font-bold text-vxr-text uppercase tracking-wider">
            Action needed
          </h2>
          {actionable.map((c) => (
            <ContractActionCard
              key={c.id}
              contract={c}
              onAction={onContractAction}
            />
          ))}
        </section>
      ) : !hasAnyContract ? (
        <Card className="p-2">
          <EmptyState
            icon={Search}
            title="No active rentals yet"
            message="Browse listings and apply — once a landlord approves and both of you sign, payment unlocks here."
            action={
              <Button variant="primary" icon={Home} onClick={onBrowse}>
                Browse listings
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="p-2">
          <EmptyState
            icon={CheckCircle2}
            title="All caught up"
            message="No pending actions. Your past payments are in the History tab."
            action={
              <Button variant="secondary" onClick={onGoToMethods}>
                Manage payment methods
              </Button>
            }
          />
        </Card>
      )}
    </div>
  );
}

function HistoryTab({
  payments, visiblePayments, pageSize, onLoadMore,
  filterStatus, setFilterStatus,
  filterMethod, setFilterMethod,
  filterDateFrom, setFilterDateFrom,
  filterDateTo, setFilterDateTo,
  hasFilter, hasAnyPaymentEver, onOpenContract, onBrowse,
}) {
  const clearFilters = () => {
    setFilterStatus("");
    setFilterMethod("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const showingMore = payments.length > pageSize;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-vxr-text-sub" />
          <span className="font-display text-[11px] font-bold uppercase tracking-wider text-vxr-text-sub">
            Filter
          </span>
          {hasFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto font-body text-xs font-semibold text-vxr-accent hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <FilterSelect value={filterStatus} onChange={setFilterStatus} options={STATUS_FILTERS} />
          <FilterSelect value={filterMethod} onChange={setFilterMethod} options={METHOD_FILTERS} />
          <FilterDate value={filterDateFrom} onChange={setFilterDateFrom} aria="From" />
          <FilterDate value={filterDateTo}   onChange={setFilterDateTo}   aria="To" />
        </div>
      </Card>

      {payments.length === 0 ? (
        hasFilter ? (
          <Card className="p-2">
            <EmptyState
              icon={Filter}
              title="No matches for these filters"
              message="Try widening the date range or clearing one of the filters above."
              action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
            />
          </Card>
        ) : (
          <Card className="p-2">
            <EmptyState
              icon={Receipt}
              title={hasAnyPaymentEver ? "No payments in this view" : "No payments yet"}
              message={
                hasAnyPaymentEver
                  ? "Your history exists — try clearing filters or pulling a wider date range."
                  : "Once you pay your first move-in, every charge will land here."
              }
              action={
                !hasAnyPaymentEver && (
                  <Button variant="primary" icon={Home} onClick={onBrowse}>
                    Browse listings
                  </Button>
                )
              }
            />
          </Card>
        )
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-vxr-border bg-vxr-surface2/50">
            <p className="font-body text-xs text-vxr-text-sub">
              Showing <span className="font-bold text-vxr-text">{visiblePayments.length}</span>
              {" "}of <span className="font-bold text-vxr-text">{payments.length}</span>
              {hasFilter ? " filtered " : " "}
              {payments.length === 1 ? "payment" : "payments"}
            </p>
          </div>
          <ul>
            {visiblePayments.map((p, i) => (
              <TxRow
                key={p.id}
                payment={p}
                last={i === visiblePayments.length - 1 && !showingMore}
                onOpen={() => p.contract_id && onOpenContract(p.contract_id)}
              />
            ))}
          </ul>
          {showingMore && (
            <div className="px-5 py-4 border-t border-vxr-border bg-vxr-surface2/30 flex justify-center">
              <Button variant="secondary" size="sm" onClick={onLoadMore}>
                Load more
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function MethodsTab({ methods, busyId, onAdd, onSetDefault, onDelete }) {
  const def = methods.find((m) => m.is_default) ?? methods[0];
  const others = methods.filter((m) => m.id !== def?.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-extrabold text-vxr-text tracking-tight">
            Saved methods
          </h2>
          <p className="font-body text-sm text-vxr-text-sub mt-0.5">
            Save GCash, Maya, GrabPay, or bank transfer for one-tap checkout.
          </p>
        </div>
        <Button variant="primary" icon={PlusCircle} onClick={onAdd}>
          Add method
        </Button>
      </div>

      {methods.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={CreditCard}
            title="No saved payment methods"
            message="Cards are entered fresh at checkout for security. Save a wallet or bank to skip the form next time."
            action={
              <Button variant="primary" icon={PlusCircle} onClick={onAdd}>
                Add your first method
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {def && (
            <Card className="p-5">
              <p className="font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub mb-3">
                Default
              </p>
              <div className="flex items-center gap-4">
                <PaymentMethodIcon type={def.type} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display text-base font-bold text-vxr-text truncate">
                      {def.label || METHOD_LABELS[def.type]?.label || def.type}
                    </p>
                    <Badge tone="success">Default</Badge>
                    {def.is_mock && <Badge tone="info">Mock</Badge>}
                  </div>
                  <p className="font-body text-sm text-vxr-text-sub truncate mt-0.5">
                    {def.account_hint || METHOD_LABELS[def.type]?.label || "Saved method"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === def.id}
                  onClick={() => onDelete(def.id)}
                  className="p-2 rounded-vxr-md text-vxr-danger hover:bg-vxr-danger-soft disabled:opacity-50 transition-colors"
                  aria-label="Delete default method"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          )}

          {others.length > 0 && (
            <Card className="overflow-hidden">
              <p className="px-5 py-3 border-b border-vxr-border bg-vxr-surface2/50 font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub">
                Other saved methods
              </p>
              <ul>
                {others.map((m, i) => (
                  <li
                    key={m.id}
                    className={`flex items-center gap-4 px-5 py-3 ${i < others.length - 1 ? "border-b border-vxr-border" : ""}`}
                  >
                    <PaymentMethodIcon type={m.type} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-display text-sm font-bold text-vxr-text truncate">
                          {m.label || METHOD_LABELS[m.type]?.label || m.type}
                        </p>
                        {m.is_mock && <Badge tone="info">Mock</Badge>}
                      </div>
                      {m.account_hint && (
                        <p className="font-body text-xs text-vxr-text-sub truncate mt-0.5">
                          {m.account_hint}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => onSetDefault(m.id)}
                      className="font-body text-xs font-semibold text-vxr-accent hover:underline disabled:opacity-50"
                    >
                      Set default
                    </button>
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => onDelete(m.id)}
                      className="p-1.5 rounded-vxr-md text-vxr-danger hover:bg-vxr-danger-soft disabled:opacity-50 transition-colors"
                      aria-label="Delete"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryBanner({ actionable, totalDue, hasAnyContract, onBrowse }) {
  // Priority surface: ready-to-pay > sign-needed > waiting > caught-up > none.
  const fullySigned      = actionable.filter((c) => c.status === "fully_signed");
  const awaitingTenant   = actionable.filter((c) => c.status === "awaiting_tenant");
  const awaitingLandlord = actionable.filter((c) => c.status === "awaiting_landlord");

  if (fullySigned.length > 0) {
    return (
      <Banner
        tone="accent"
        icon={BellRing}
        title={fullySigned.length === 1 ? "Upcoming payment reminder" : `${fullySigned.length} payments due`}
        body={
          fullySigned.length === 1
            ? `Your move-in payment of ${PHP(totalDue)} for ${fullySigned[0].listings?.title || "your rental"} is due now.`
            : `You have ${fullySigned.length} contracts ready for move-in. Total due: ${PHP(totalDue)}.`
        }
      />
    );
  }
  if (awaitingTenant.length > 0) {
    return (
      <Banner
        tone="warning"
        icon={FileSignature}
        title="Action needed: sign your contract"
        body={`You have ${awaitingTenant.length} contract${awaitingTenant.length === 1 ? "" : "s"} waiting for your signature before payment can begin.`}
      />
    );
  }
  if (awaitingLandlord.length > 0) {
    return (
      <Banner
        tone="info"
        icon={Hourglass}
        title="Awaiting landlord countersignature"
        body={`${awaitingLandlord.length} contract${awaitingLandlord.length === 1 ? "" : "s"} waiting on the landlord. You'll be able to pay once they sign.`}
      />
    );
  }
  if (!hasAnyContract) {
    return (
      <Banner
        tone="info"
        icon={Search}
        title="No active rentals yet"
        body="Browse listings and apply — once a landlord approves and both of you sign, payment unlocks here."
        actionLabel="Browse listings"
        onAction={onBrowse}
      />
    );
  }
  return (
    <Banner
      tone="success"
      icon={CheckCircle2}
      title="Up to date"
      body="No pending payments. You're all caught up."
    />
  );
}

const BANNER_TONES = {
  accent:  { bg: "bg-vxr-accent-soft",  border: "border-vxr-accent/30",  text: "text-vxr-accent"  },
  warning: { bg: "bg-vxr-warning-soft", border: "border-vxr-warning/30", text: "text-vxr-warning" },
  info:    { bg: "bg-blue-50",          border: "border-blue-200",       text: "text-blue-600"    },
  success: { bg: "bg-vxr-success-soft", border: "border-vxr-success/30", text: "text-vxr-success" },
};

function Banner({ tone, icon: Icon, title, body, actionLabel, onAction }) {
  const t = BANNER_TONES[tone] ?? BANNER_TONES.info;
  return (
    <section className={`rounded-vxr p-4 border ${t.bg} ${t.border}`}>
      <div className="flex items-center gap-2.5">
        <Icon size={20} className={t.text} />
        <h2 className="font-display text-base font-extrabold text-vxr-text tracking-tight">
          {title}
        </h2>
      </div>
      <p className="font-body text-sm mt-2 leading-relaxed text-vxr-text-sub">
        {body}
      </p>
      {actionLabel && onAction && (
        <div className="mt-3">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
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
  const { Icon } = cfg;

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-vxr-md bg-vxr-accent-soft flex items-center justify-center shrink-0">
          <Icon size={20} className="text-vxr-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display text-base font-extrabold text-vxr-text truncate">
              {cfg.title}
            </p>
            <Badge tone={cfg.badge.tone}>{cfg.badge.label}</Badge>
          </div>
          <p className="font-body text-xs text-vxr-text-sub truncate mt-0.5">
            <Home size={11} className="inline -mt-0.5 mr-1" />
            {title}
          </p>
          <p className="font-body text-sm mt-2 leading-relaxed text-vxr-text-sub">
            {cfg.body}
          </p>
        </div>
      </div>

      {contract.status === "fully_signed" && total > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Mini label="First month" value={PHP(contract.monthly_rent)} />
          <Mini label="Deposit"     value={PHP(contract.security_deposit)} />
          <Mini label="Advance"     value={PHP(contract.advance_payment)} />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        {contract.status === "fully_signed" && total > 0 ? (
          <div className="min-w-0">
            <p className="font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub">
              Total due
            </p>
            <p className="font-display text-lg font-extrabold text-vxr-text">
              {PHP(total)}
            </p>
          </div>
        ) : <span />}
        <Button
          variant={cfg.variant}
          iconRight={ChevronRight}
          onClick={() => onAction(cfg.go(contract.id))}
        >
          {cfg.cta}
        </Button>
      </div>
    </Card>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-vxr-sm px-3 py-2 bg-vxr-surface2 border border-vxr-border">
      <p className="font-body text-[10px] font-semibold uppercase tracking-wider text-vxr-text-sub">
        {label}
      </p>
      <p className="font-display text-sm font-bold text-vxr-text mt-0.5 truncate">
        {value}
      </p>
    </div>
  );
}

function TxRow({ payment, last, onOpen }) {
  const status = (payment.status ?? "succeeded").toLowerCase();
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.failed;
  const cents = Number(payment.amount_cents) || 0;
  const title = payment.contract?.listings?.title || "Listing";
  const clickable = !!payment.contract_id;

  // Legacy Stripe rows have no method_type — they predate the ledger.
  const methodLabel = payment.method_type
    ? `${METHOD_LABELS[payment.method_type]?.short ?? payment.method_type}${payment.last4 ? ` ••${payment.last4}` : ""}`
    : "Card (legacy)";

  return (
    <li>
      <button
        type="button"
        onClick={clickable ? onOpen : undefined}
        disabled={!clickable}
        className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
          clickable ? "hover:bg-vxr-surface2/60 cursor-pointer" : "cursor-default"
        } ${last ? "" : "border-b border-vxr-border"}`}
      >
        <span className="text-vxr-text-sub">
          <PaymentMethodIcon
            type={payment.method_type || "card"}
            variant="bare"
            size="md"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-vxr-text truncate">
            {title}
          </p>
          <p className="font-body text-xs text-vxr-text-sub truncate">
            {fmtDate(payment.paid_at)} · {methodLabel}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-sm font-bold text-vxr-text tabular-nums">
            {PHP(cents / 100)}
          </p>
          <div className="mt-1 flex justify-end">
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
        </div>
        <span className="text-vxr-text-muted shrink-0">
          {clickable ? <ChevronRight size={16} /> : null}
        </span>
      </button>
    </li>
  );
}

function FilterSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md px-3 py-2.5 font-body text-sm text-vxr-text focus:outline-none focus:border-vxr-accent transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function FilterDate({ value, onChange, aria }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={aria}
      placeholder={aria}
      className="w-full bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md px-3 py-2.5 font-body text-sm text-vxr-text focus:outline-none focus:border-vxr-accent transition-colors"
    />
  );
}
