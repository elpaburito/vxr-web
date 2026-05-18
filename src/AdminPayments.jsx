import { useEffect, useMemo, useState } from "react";
import {
  CreditCard, RefreshCw, Search, Download, AlertTriangle, CheckCircle2,
  Clock, XCircle, Filter, RotateCcw, Wallet,
} from "lucide-react";
import AdminGuard from "./components/AdminGuard.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import { Card, Badge, Button, EmptyState } from "./components/vxr";
import {
  fetchAdminPayments, fetchPaymentSummary, markTransactionRefunded,
} from "./lib/adminService.js";

const STATUS_OPTIONS = [
  "pending", "requires_action", "succeeded", "failed", "refunded", "cancelled",
];
const METHOD_OPTIONS = [
  "card", "gcash", "paymaya", "grab_pay", "bank_transfer", "cash", "offline_other",
];

const PAGE_SIZE = 50;

function StatusBadge({ status }) {
  const map = {
    succeeded:        { tone: "success", icon: CheckCircle2 },
    pending:          { tone: "warning", icon: Clock },
    requires_action:  { tone: "warning", icon: Clock },
    failed:           { tone: "danger",  icon: XCircle },
    refunded:         { tone: "info",    icon: RotateCcw },
    cancelled:        { tone: "info",    icon: XCircle },
  };
  const m = map[status] || { tone: "info", icon: Clock };
  return <Badge tone={m.tone} icon={m.icon}>{status}</Badge>;
}

function formatPhp(cents, currency = "php") {
  if (cents == null) return "—";
  const v = Number(cents) / 100;
  return `${currency.toUpperCase() === "PHP" ? "₱" : currency.toUpperCase() + " "}${v.toLocaleString(
    undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  )}`;
}

function formatWhen(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function csvEscape(v) {
  if (v == null) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(rows) {
  const headers = [
    "created_at", "status", "method_type", "amount_cents", "currency",
    "contract_id", "user_id", "paymongo_payment_intent_id", "paymongo_payment_id",
    "billing_month", "billing_name", "failure_reason", "note",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `admin-payments-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function StatCard({ icon: Icon, label, value, hint, tone = "info" }) {
  const toneClass = {
    info:    "bg-vxr-accent-soft text-vxr-accent",
    success: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-700",
    danger:  "bg-red-50 text-red-700",
  }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-body text-[11px] uppercase tracking-wider font-bold text-vxr-text-sub">
            {label}
          </p>
          <p className="font-display text-2xl font-extrabold text-vxr-text mt-1">{value}</p>
          {hint && <p className="font-body text-[11px] text-vxr-text-sub mt-0.5">{hint}</p>}
        </div>
        <div className={`w-10 h-10 rounded-vxr-md flex items-center justify-center ${toneClass}`}>
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
}

function PaymentsContent() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [methodType, setMethodType] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [data, sum] = await Promise.all([
        fetchAdminPayments({ search, status, methodType, limit: PAGE_SIZE }),
        fetchPaymentSummary(),
      ]);
      setRows(data);
      setSummary(sum);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      setError(e?.message || "Failed to load payments");
    } finally { setLoading(false); }
  };

  const loadMore = async () => {
    if (!rows.length || loadingMore) return;
    setLoadingMore(true);
    try {
      const cursor = rows[rows.length - 1].created_at;
      const data = await fetchAdminPayments({
        search, status, methodType, limit: PAGE_SIZE, beforeIso: cursor,
      });
      setRows((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      setError(e?.message || "Failed to load more");
    } finally { setLoadingMore(false); }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  const onRefund = async (row) => {
    if (row.status !== "succeeded") {
      window.alert("Only succeeded transactions can be marked refunded.");
      return;
    }
    const reason = window.prompt(
      `Mark transaction ${row.id} as refunded?\n\n` +
      `Issue the actual refund in PayMongo's dashboard first — this only ` +
      `flips the ledger status on our side.\n\nReason (recorded in audit log):`,
      ""
    );
    if (reason === null) return;
    setBusyId(row.id); setError("");
    try {
      await markTransactionRefunded(row.id, reason);
      setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, status: "refunded" } : r));
    } catch (e) {
      setError(e?.message || "Failed to mark refunded");
    } finally { setBusyId(null); }
  };

  const summaryEl = useMemo(() => {
    if (!summary) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle2} tone="success"
          label="Succeeded (30d)" value={summary.succeeded} />
        <StatCard icon={XCircle} tone="danger"
          label="Failed (30d)" value={summary.failed} />
        <StatCard icon={Clock} tone="warning"
          label="Pending now" value={summary.pending} />
        <StatCard icon={Wallet} tone="info"
          label="Gross (30d)"
          value={`₱${summary.grossPhp.toLocaleString(undefined, {
            minimumFractionDigits: 2, maximumFractionDigits: 2,
          })}`} />
      </div>
    );
  }, [summary]);

  return (
    <div className="space-y-4">
      {summaryEl}

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vxr-text-sub" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Search PI id, payment id, billing name…"
              className="w-full pl-9 pr-3 py-2 rounded-vxr-md border border-vxr-border bg-vxr-surface text-sm font-body focus:outline-none focus:border-vxr-accent"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 rounded-vxr-md border border-vxr-border bg-vxr-surface text-sm font-body"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={methodType}
            onChange={(e) => setMethodType(e.target.value)}
            className="px-3 py-2 rounded-vxr-md border border-vxr-border bg-vxr-surface text-sm font-body"
          >
            <option value="">All methods</option>
            {METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
            <Filter size={14} /> Apply
          </Button>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading} title="Refresh">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => downloadCsv(rows)} disabled={!rows.length} title="Export CSV">
            <Download size={14} /> CSV
          </Button>
        </div>
        {error && (
          <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-md">
            <AlertTriangle size={14} className="mt-0.5" /> {error}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-vxr-surface2 border-b border-vxr-border">
              <tr>
                {["When", "Status", "Method", "Amount", "PI / Ref", "Contract", "Actions"].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 font-body text-[11px] font-bold uppercase tracking-wider text-vxr-text-sub">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-vxr-text-sub">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10">
                  <EmptyState
                    icon={CreditCard}
                    title="No payments"
                    message="No transactions match the current filters."
                  />
                </td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-vxr-border last:border-0 hover:bg-vxr-surface2/40">
                  <td className="px-4 py-3 whitespace-nowrap text-vxr-text">{formatWhen(r.created_at)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-vxr-text">
                    {r.method_type}{r.brand ? ` · ${r.brand}` : ""}{r.last4 ? ` ••${r.last4}` : ""}
                  </td>
                  <td className="px-4 py-3 font-mono text-vxr-text">{formatPhp(r.amount_cents, r.currency)}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-vxr-text-sub truncate max-w-[220px]">
                    {r.paymongo_payment_intent_id || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-vxr-text-sub truncate max-w-[160px]">
                    {r.contract_id || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "succeeded" ? (
                      <button
                        onClick={() => onRefund(r)}
                        disabled={busyId === r.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold hover:bg-amber-100 disabled:opacity-50"
                        title="Mark as refunded (run actual refund in PayMongo dashboard first)"
                      >
                        <RotateCcw size={13} /> Mark refunded
                      </button>
                    ) : (
                      <span className="text-xs text-vxr-text-sub">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdminPayments() {
  return (
    <AdminGuard>
      <AdminLayout
        title="Payments"
        subtitle="Every PayMongo and offline transaction across the platform"
      >
        <PaymentsContent />
      </AdminLayout>
    </AdminGuard>
  );
}
