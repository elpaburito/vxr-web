import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, ShieldX, RefreshCw, AlertTriangle, ExternalLink,
  User as UserIcon, Building2, FileImage, Clock, CheckCircle2,
} from "lucide-react";
import {
  fetchUserVerifications, fetchListingVerifications,
  approveUserVerification, rejectUserVerification,
  approveListingVerification, rejectListingVerification,
  getVerificationUrl,
} from "../lib/adminService.js";

const FILTERS = [
  { value: "pending",  label: "Pending" },
  { value: "verified", label: "Approved" },
  { value: "all",      label: "All" },
];

function FilterTabs({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            value === f.value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ verified }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
      <CheckCircle2 size={11} /> Approved
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">
      <Clock size={11} /> Pending review
    </span>
  );
}

function DecisionBadge({ decision }) {
  const map = {
    approved:      { bg: "bg-emerald-50", fg: "text-emerald-700", label: "Approved",      Icon: CheckCircle2 },
    rejected:      { bg: "bg-red-50",     fg: "text-red-700",     label: "Rejected",      Icon: ShieldX },
    manual_review: { bg: "bg-amber-50",   fg: "text-amber-700",   label: "Manual review", Icon: Clock },
    pending:       { bg: "bg-amber-50",   fg: "text-amber-700",   label: "Pending",       Icon: Clock },
  };
  const m = map[decision] || map.pending;
  const Icon = m.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${m.bg} ${m.fg}`}>
      <Icon size={11} /> {m.label}
    </span>
  );
}

function pct(n) {
  if (n == null) return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return "—";
  return `${(num * 100).toFixed(1)}%`;
}

function DocPreview({ label, path }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getVerificationUrl(path).then((u) => {
      if (mounted) { setUrl(u); setLoading(false); }
    });
    return () => { mounted = false; };
  }, [path]);

  if (!path) {
    return (
      <div className="flex flex-col items-center justify-center h-32 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs">
        <FileImage size={18} className="mb-1" />
        No {label.toLowerCase()} uploaded
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-slate-200">
        <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">{label}</span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#EC6138] hover:underline"
          >
            Open <ExternalLink size={10} />
          </a>
        )}
      </div>
      <div className="h-32 flex items-center justify-center">
        {loading && <span className="text-xs text-slate-400">Loading…</span>}
        {!loading && url && (
          <img
            src={url}
            alt={label}
            className="max-h-32 max-w-full object-contain"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}
        {!loading && !url && (
          <span className="text-xs text-slate-400">Preview unavailable</span>
        )}
      </div>
    </div>
  );
}

// =====================================================
// USER VERIFICATIONS
// =====================================================
function UserVerifications() {
  const [filter, setFilter] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setItems(await fetchUserVerifications({ filter })); }
    catch (e) { setError(e?.message || "Failed to load user verifications"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, [filter]);

  const onApprove = async (verificationId, userId) => {
    setBusyId(verificationId);
    try { await approveUserVerification(verificationId, userId); await load(); }
    catch (e) { setError(e?.message || "Failed to approve"); }
    finally { setBusyId(null); }
  };
  const onReject = async (verificationId) => {
    const reason = window.prompt("Reject this verification? Optional reason for the user:");
    if (reason === null) return; // cancelled
    setBusyId(verificationId);
    try { await rejectUserVerification(verificationId, reason || null); await load(); }
    catch (e) { setError(e?.message || "Failed to reject"); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FilterTabs value={filter} onChange={setFilter} />
        <button onClick={load} className="h-9 px-3 inline-flex items-center gap-1.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
          <AlertTriangle size={14} className="mt-0.5" /> {error}
        </div>
      )}

      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-slate-400">No {filter === "all" ? "" : filter} user verifications.</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((u) => {
          const isApproved = u.decision === "approved";
          return (
            <div key={u.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EC6138] to-[#FF8E9E] text-white flex items-center justify-center shrink-0">
                    <UserIcon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{u.full_name || "Unnamed user"}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Submitted {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                      {u.id_type ? ` · ${u.id_type}` : ""}
                    </p>
                  </div>
                </div>
                <DecisionBadge decision={u.decision} />
              </div>

              <div className={`grid gap-2 ${u.id_back_path ? "grid-cols-3" : "grid-cols-2"}`}>
                <DocPreview label="ID Front" path={u.id_front_path} />
                {u.id_back_path && <DocPreview label="ID Back" path={u.id_back_path} />}
                <DocPreview label="Selfie" path={u.selfie_path} />
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                <div><span className="text-slate-500">Name:</span> <span className="text-slate-800 font-medium">{u.extracted_name || "—"}</span></div>
                <div><span className="text-slate-500">ID #:</span> <span className="text-slate-800 font-medium">{u.extracted_id_number || "—"}</span></div>
                <div><span className="text-slate-500">DOB:</span> <span className="text-slate-800 font-medium">{u.extracted_dob || "—"}</span></div>
                <div><span className="text-slate-500">Face match:</span> <span className="text-slate-800 font-medium">{pct(u.face_match_score)}</span></div>
                <div><span className="text-slate-500">Name match:</span> <span className="text-slate-800 font-medium">{pct(u.name_match_score)}</span></div>
                <div><span className="text-slate-500">OCR conf:</span> <span className="text-slate-800 font-medium">{pct(u.ocr_confidence)}</span></div>
              </div>

              {u.decision_reason && (
                <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                  <span className="font-semibold">Reason:</span> {u.decision_reason}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => onReject(u.id)}
                  disabled={busyId === u.id}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <ShieldX size={13} /> Reject
                </button>
                <button
                  onClick={() => onApprove(u.id, u.user_id)}
                  disabled={busyId === u.id || isApproved}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                >
                  <ShieldCheck size={13} /> {isApproved ? "Approved" : "Approve"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// LISTING VERIFICATIONS
// =====================================================
function ListingVerifications() {
  const [filter, setFilter] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setItems(await fetchListingVerifications({ filter })); }
    catch (e) { setError(e?.message || "Failed to load listing verifications"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, [filter]);

  const onApprove = async (id) => {
    setBusyId(id);
    try { await approveListingVerification(id); await load(); }
    catch (e) { setError(e?.message || "Failed to approve"); }
    finally { setBusyId(null); }
  };
  const onReject = async (id) => {
    if (!window.confirm("Reject this listing verification?")) return;
    setBusyId(id);
    try { await rejectListingVerification(id); await load(); }
    catch (e) { setError(e?.message || "Failed to reject"); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FilterTabs value={filter} onChange={setFilter} />
        <button onClick={load} className="h-9 px-3 inline-flex items-center gap-1.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
          <AlertTriangle size={14} className="mt-0.5" /> {error}
        </div>
      )}

      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-slate-400">No {filter === "all" ? "" : filter} listing verifications.</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((l) => (
          <div key={l.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-orange-50 text-[#EC6138] flex items-center justify-center shrink-0">
                  <Building2 size={16} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{l.title || "Untitled listing"}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {l.listing_type || "—"} · {l.status || "—"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Submitted {l.verification_submitted_at ? new Date(l.verification_submitted_at).toLocaleString() : "—"}
                  </p>
                </div>
              </div>
              <StatusBadge verified={l.is_verified} />
            </div>

            <DocPreview label="Verification document" path={l.verification_doc_url} />

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => onReject(l.id)}
                disabled={busyId === l.id}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <ShieldX size={13} /> Reject
              </button>
              <button
                onClick={() => onApprove(l.id)}
                disabled={busyId === l.id || l.is_verified}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
              >
                <ShieldCheck size={13} /> {l.is_verified ? "Approved" : "Approve"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// MAIN
// =====================================================
export default function AdminVerifications() {
  const [scope, setScope] = useState("users");

  const tabs = useMemo(() => ([
    { value: "users",    label: "User verifications" },
    { value: "listings", label: "Listing verifications" },
  ]), []);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setScope(t.value)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${
              scope === t.value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {scope === "users" ? <UserVerifications /> : <ListingVerifications />}
    </div>
  );
}
