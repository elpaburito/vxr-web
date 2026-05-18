import { useEffect, useState } from "react";
import {
  AlertTriangle, RefreshCw, Search, Filter, Flag, CheckCircle2, Clock,
  Wrench, Save, X,
} from "lucide-react";
import AdminGuard from "./components/AdminGuard.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import { Card, Badge, Button, EmptyState } from "./components/vxr";
import {
  fetchAdminReports, updateReportStatus, escalateReport, saveReportAdminNotes,
} from "./lib/adminService.js";

const STATUS_OPTIONS = ["open", "in_progress", "resolved"];
const CATEGORY_OPTIONS = [
  "plumbing", "electrical", "structural", "appliance", "pest", "cleanliness", "other",
];

function StatusBadge({ status }) {
  const map = {
    open:        { tone: "warning", icon: Clock,        label: "Open" },
    in_progress: { tone: "info",    icon: Wrench,       label: "In progress" },
    resolved:    { tone: "success", icon: CheckCircle2, label: "Resolved" },
  };
  const m = map[status] || map.open;
  return <Badge tone={m.tone} icon={m.icon}>{m.label}</Badge>;
}

function formatWhen(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function ReportCard({ row, busy, onStatus, onEscalate, onSaveNotes }) {
  const [notes, setNotes] = useState(row.admin_notes || "");
  const [editing, setEditing] = useState(false);
  const dirty = (row.admin_notes || "") !== notes;

  useEffect(() => { setNotes(row.admin_notes || ""); setEditing(false); }, [row.id, row.admin_notes]);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={row.status} />
            <Badge tone="info">{row.category}</Badge>
            {row.escalated_at && (
              <Badge tone="danger" icon={Flag}>Escalated</Badge>
            )}
          </div>
          <h3 className="font-display text-base font-extrabold text-vxr-text">{row.title}</h3>
          {row.description && (
            <p className="font-body text-sm text-vxr-text-sub mt-1 whitespace-pre-wrap">{row.description}</p>
          )}
          <div className="mt-2 font-body text-[11px] text-vxr-text-sub flex flex-wrap gap-x-4 gap-y-1">
            <span>Filed {formatWhen(row.created_at)}</span>
            <span>Tenant: {row.tenant?.full_name || row.tenant?.email || row.tenant_id || "—"}</span>
            <span>Listing: {row.listing?.title || row.listing_id || "—"}</span>
            {row.resolved_at && <span>Resolved {formatWhen(row.resolved_at)}</span>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          {row.status !== "in_progress" && (
            <Button size="sm" variant="secondary"
              onClick={() => onStatus(row, "in_progress")}
              disabled={busy}>
              <Wrench size={13} /> Mark in progress
            </Button>
          )}
          {row.status !== "resolved" && (
            <Button size="sm" variant="success"
              onClick={() => onStatus(row, "resolved")}
              disabled={busy}>
              <CheckCircle2 size={13} /> Resolve
            </Button>
          )}
          {!row.escalated_at && (
            <Button size="sm" variant="danger"
              onClick={() => onEscalate(row)}
              disabled={busy}>
              <Flag size={13} /> Escalate
            </Button>
          )}
        </div>
      </div>

      {row.landlord_notes && (
        <div className="mt-3 bg-vxr-surface2 rounded-vxr-sm p-3">
          <div className="font-body text-[10px] uppercase tracking-wider font-bold text-vxr-text-sub mb-1">
            Landlord notes
          </div>
          <p className="font-body text-sm text-vxr-text whitespace-pre-wrap">{row.landlord_notes}</p>
        </div>
      )}

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-body text-[10px] uppercase tracking-wider font-bold text-vxr-text-sub">
            Admin notes
          </span>
          {dirty && (
            <div className="flex gap-2">
              <button
                onClick={() => { setNotes(row.admin_notes || ""); setEditing(false); }}
                className="text-xs text-vxr-text-sub hover:text-vxr-text inline-flex items-center gap-1"
              >
                <X size={12} /> Cancel
              </button>
              <button
                onClick={() => onSaveNotes(row, notes).then(() => setEditing(false))}
                disabled={busy}
                className="text-xs text-vxr-accent font-semibold inline-flex items-center gap-1"
              >
                <Save size={12} /> Save
              </button>
            </div>
          )}
        </div>
        <textarea
          value={notes}
          onFocus={() => setEditing(true)}
          onChange={(e) => setNotes(e.target.value)}
          rows={editing || dirty ? 3 : 2}
          placeholder="Add internal notes about this report (visible only to admins)…"
          className="w-full px-3 py-2 rounded-vxr-md border border-vxr-border bg-vxr-surface text-sm font-body focus:outline-none focus:border-vxr-accent"
        />
      </div>
    </Card>
  );
}

function ReportsContent() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      setRows(await fetchAdminReports({ search, status, category }));
    } catch (e) {
      setError(e?.message || "Failed to load reports");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  const handleStatus = async (row, next) => {
    let reason = null;
    if (next === "resolved") {
      reason = window.prompt(
        `Mark report "${row.title}" as resolved?\n\nResolution summary (recorded in audit log):`,
        ""
      );
      if (reason === null) return;
    }
    setBusyId(row.id); setError("");
    try {
      await updateReportStatus(row.id, next, reason);
      const now = new Date().toISOString();
      setRows((prev) => prev.map((r) =>
        r.id === row.id
          ? { ...r, status: next, resolved_at: next === "resolved" ? now : r.resolved_at }
          : r
      ));
    } catch (e) {
      setError(e?.message || "Failed to update status");
    } finally { setBusyId(null); }
  };

  const handleEscalate = async (row) => {
    const notes = window.prompt(
      `Escalate "${row.title}"?\n\nAdd a note about why this is being escalated:`,
      ""
    );
    if (notes === null) return;
    setBusyId(row.id); setError("");
    try {
      await escalateReport(row.id, notes || null);
      const now = new Date().toISOString();
      setRows((prev) => prev.map((r) =>
        r.id === row.id
          ? { ...r, escalated_at: now, admin_notes: notes || r.admin_notes }
          : r
      ));
    } catch (e) {
      setError(e?.message || "Failed to escalate");
    } finally { setBusyId(null); }
  };

  const handleSaveNotes = async (row, notes) => {
    setBusyId(row.id); setError("");
    try {
      await saveReportAdminNotes(row.id, notes);
      setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, admin_notes: notes } : r));
    } catch (e) {
      setError(e?.message || "Failed to save notes");
    } finally { setBusyId(null); }
  };

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
              placeholder="Search title or description…"
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
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 rounded-vxr-md border border-vxr-border bg-vxr-surface text-sm font-body"
          >
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
            <Filter size={14} /> Apply
          </Button>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading} title="Refresh">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
        {error && (
          <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-md">
            <AlertTriangle size={14} className="mt-0.5" /> {error}
          </div>
        )}
      </Card>

      {loading ? (
        <Card className="p-10 text-center text-vxr-text-sub">Loading…</Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Flag}
            title="No reports"
            message="No maintenance reports match the current filters."
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <ReportCard
              key={r.id}
              row={r}
              busy={busyId === r.id}
              onStatus={handleStatus}
              onEscalate={handleEscalate}
              onSaveNotes={handleSaveNotes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminReports() {
  return (
    <AdminGuard>
      <AdminLayout
        title="Reports & Disputes"
        subtitle="Every tenant-filed maintenance report across the platform"
      >
        <ReportsContent />
      </AdminLayout>
    </AdminGuard>
  );
}
