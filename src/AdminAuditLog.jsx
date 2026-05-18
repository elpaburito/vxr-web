import { Fragment, useEffect, useMemo, useState } from "react";
import {
  RefreshCw, Search, ChevronDown, ChevronRight, Filter, Download, ShieldCheck,
} from "lucide-react";
import AdminGuard from "./components/AdminGuard.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import { fetchAuditLog, fetchAuditActions } from "./lib/adminService.js";
import { Card, Badge, Button, EmptyState } from "./components/vxr";

const ENTITY_TYPES = [
  "profiles", "listings", "application", "contract",
  "verifications", "cms_page", "cms_announcement", "cms_faq",
];

const PAGE_SIZE = 50;

function ActionBadge({ action }) {
  const tone = action.includes("delete")
    ? "danger"
    : action.includes("reject") || action.includes("unverify") || action.includes("suspend")
      ? "warning"
      : action.includes("approve") || action.includes("verify")
        ? "success"
        : "info";
  return <Badge tone={tone}>{action}</Badge>;
}

function JsonBlock({ label, value }) {
  if (!value) return null;
  return (
    <div className="bg-vxr-surface2 rounded-vxr-sm p-3 overflow-auto">
      <div className="font-body text-[10px] uppercase tracking-wider text-vxr-text-sub font-bold mb-1">
        {label}
      </div>
      <pre className="font-mono text-[11px] text-vxr-text whitespace-pre-wrap break-all">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function DiffRow({ row }) {
  return (
    <tr className="bg-vxr-surface2/40 border-b border-vxr-border">
      <td colSpan={6} className="px-5 py-4">
        <div className="grid md:grid-cols-2 gap-3">
          <JsonBlock label="Before" value={row.before} />
          <JsonBlock label="After" value={row.after} />
        </div>
        {row.reason && (
          <div className="mt-3 text-sm">
            <span className="font-body text-[10px] uppercase tracking-wider text-vxr-text-sub font-bold mr-2">
              Reason
            </span>
            <span className="font-body text-vxr-text">{row.reason}</span>
          </div>
        )}
        <div className="mt-3 text-[11px] text-vxr-text-sub font-mono">
          log id {row.id} · entity_id {row.entity_id || "—"}
        </div>
      </td>
    </tr>
  );
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch { return iso; }
}

function csvEscape(v) {
  if (v == null) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(rows) {
  const headers = ["created_at", "actor_email", "action", "entity_type", "entity_id", "reason"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.created_at, r.actor_email, r.action, r.entity_type, r.entity_id, r.reason,
    ].map(csvEscape).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `admin-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function AuditLogContent() {
  const [rows, setRows] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());

  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [hasMore, setHasMore] = useState(true);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const data = await fetchAuditLog({
        search, action, entityType, limit: PAGE_SIZE,
      });
      setRows(data);
      setHasMore(data.length === PAGE_SIZE);
      setExpanded(new Set());
    } catch (e) {
      setError(e?.message || "Failed to load audit log");
    } finally { setLoading(false); }
  };

  const loadMore = async () => {
    if (!rows.length || loadingMore) return;
    setLoadingMore(true);
    try {
      const cursor = rows[rows.length - 1].created_at;
      const data = await fetchAuditLog({
        search, action, entityType, limit: PAGE_SIZE, beforeIso: cursor,
      });
      setRows((r) => [...r, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      setError(e?.message || "Failed to load more");
    } finally { setLoadingMore(false); }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, []);
  useEffect(() => {
    fetchAuditActions().then(setActions).catch(() => setActions([]));
  }, []);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const summary = useMemo(() => {
    if (loading) return "Loading…";
    if (!rows.length) return "No matching audit events";
    return `${rows.length} event${rows.length === 1 ? "" : "s"}${hasMore ? " (more available)" : ""}`;
  }, [rows, loading, hasMore]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vxr-text-sub" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Search action, entity, actor email…"
              className="w-full pl-9 pr-3 py-2 rounded-vxr-md border border-vxr-border bg-vxr-surface text-sm font-body focus:outline-none focus:border-vxr-accent"
            />
          </div>

          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="px-3 py-2 rounded-vxr-md border border-vxr-border bg-vxr-surface text-sm font-body"
          >
            <option value="">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="px-3 py-2 rounded-vxr-md border border-vxr-border bg-vxr-surface text-sm font-body"
          >
            <option value="">All entities</option>
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
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
        <div className="mt-2 font-body text-xs text-vxr-text-sub">{summary}</div>
        {error && <div className="mt-2 font-body text-xs text-vxr-danger">{error}</div>}
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-vxr-surface2 border-b border-vxr-border">
              {["", "When", "Actor", "Action", "Entity", "Entity ID"].map((h, i) => (
                <th key={i} className="text-left px-5 py-3 font-body text-[11px] font-bold uppercase tracking-wider text-vxr-text-sub">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10">
                  <EmptyState
                    icon={ShieldCheck}
                    title="No audit events"
                    message="Admin actions will appear here once they happen."
                  />
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const open = expanded.has(r.id);
              return (
                <Fragment key={r.id}>
                  <tr
                    className="border-b border-vxr-border last:border-0 cursor-pointer hover:bg-vxr-surface2/50"
                    onClick={() => toggle(r.id)}
                  >
                    <td className="px-5 py-3 w-8 text-vxr-text-sub">
                      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="px-5 py-3 font-body text-sm text-vxr-text whitespace-nowrap">
                      {formatWhen(r.created_at)}
                    </td>
                    <td className="px-5 py-3 font-body text-sm text-vxr-text">
                      {r.actor_email || <span className="text-vxr-text-sub">—</span>}
                    </td>
                    <td className="px-5 py-3"><ActionBadge action={r.action} /></td>
                    <td className="px-5 py-3 font-mono text-xs text-vxr-text-sub">{r.entity_type}</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-vxr-text-sub truncate max-w-[220px]">
                      {r.entity_id || "—"}
                    </td>
                  </tr>
                  {open && <DiffRow row={r} />}
                </Fragment>
              );
            })}
          </tbody>
        </table>
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

export default function AdminAuditLog() {
  return (
    <AdminGuard>
      <AdminLayout
        title="Audit Log"
        subtitle="Every admin-initiated change, with before/after snapshots"
      >
        <AuditLogContent />
      </AdminLayout>
    </AdminGuard>
  );
}
