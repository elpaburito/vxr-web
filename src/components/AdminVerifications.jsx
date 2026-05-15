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
import { Card, Avatar, Badge, Button } from "./vxr";

const FILTERS = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Approved" },
  { value: "all", label: "All" },
];

function FilterTabs({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-vxr-surface border border-vxr-border rounded-vxr-md p-1 w-fit">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-3 py-1.5 font-body text-xs font-semibold rounded-vxr-sm transition ${
            value === f.value
              ? "bg-vxr-text text-white"
              : "text-vxr-text-sub hover:bg-vxr-surface2"
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
    <Badge tone="success" icon={CheckCircle2}>
      Approved
    </Badge>
  ) : (
    <Badge tone="warning" icon={Clock}>
      Pending review
    </Badge>
  );
}

function DecisionBadge({ decision }) {
  const map = {
    approved: { tone: "success", label: "Approved", Icon: CheckCircle2 },
    rejected: { tone: "danger", label: "Rejected", Icon: ShieldX },
    manual_review: { tone: "warning", label: "Manual review", Icon: Clock },
    pending: { tone: "warning", label: "Pending", Icon: Clock },
  };
  const m = map[decision] || map.pending;
  return (
    <Badge tone={m.tone} icon={m.Icon}>
      {m.label}
    </Badge>
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
      if (mounted) {
        setUrl(u);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [path]);

  if (!path) {
    return (
      <div className="flex flex-col items-center justify-center h-32 rounded-vxr-md border border-dashed border-vxr-border text-vxr-text-muted font-body text-xs">
        <FileImage size={18} className="mb-1" />
        No {label.toLowerCase()} uploaded
      </div>
    );
  }

  return (
    <div className="rounded-vxr-md border border-vxr-border overflow-hidden bg-vxr-surface2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-vxr-surface border-b border-vxr-border">
        <span className="font-body text-[11px] font-semibold text-vxr-text uppercase tracking-wider">
          {label}
        </span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-body text-[11px] font-semibold text-vxr-accent hover:underline"
          >
            Open <ExternalLink size={10} />
          </a>
        )}
      </div>
      <div className="h-32 flex items-center justify-center">
        {loading && <span className="font-body text-xs text-vxr-text-muted">Loading…</span>}
        {!loading && url && (
          <img
            src={url}
            alt={label}
            className="max-h-32 max-w-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        {!loading && !url && (
          <span className="font-body text-xs text-vxr-text-muted">
            Preview unavailable
          </span>
        )}
      </div>
    </div>
  );
}

function UserVerifications() {
  const [filter, setFilter] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchUserVerifications({ filter }));
    } catch (e) {
      setError(e?.message || "Failed to load user verifications");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(); /* eslint-disable-line */
  }, [filter]);

  const onApprove = async (verificationId, userId) => {
    setBusyId(verificationId);
    try {
      await approveUserVerification(verificationId, userId);
      await load();
    } catch (e) {
      setError(e?.message || "Failed to approve");
    } finally {
      setBusyId(null);
    }
  };
  const onReject = async (verificationId) => {
    const reason = window.prompt("Reject this verification? Optional reason for the user:");
    if (reason === null) return;
    setBusyId(verificationId);
    try {
      await rejectUserVerification(verificationId, reason || null);
      await load();
    } catch (e) {
      setError(e?.message || "Failed to reject");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FilterTabs value={filter} onChange={setFilter} />
        <Button size="sm" variant="secondary" icon={RefreshCw} onClick={load}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-vxr-danger-soft border border-vxr-danger/20 text-vxr-danger font-body text-sm px-4 py-2.5 rounded-vxr-md">
          <AlertTriangle size={14} className="mt-0.5" /> {error}
        </div>
      )}

      {loading && <p className="font-body text-sm text-vxr-text-muted">Loading…</p>}
      {!loading && items.length === 0 && (
        <p className="font-body text-sm text-vxr-text-muted">
          No {filter === "all" ? "" : filter} user verifications.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((u) => {
          const isApproved = u.decision === "approved";
          return (
            <Card key={u.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <Avatar name={u.full_name || u.email || "U"} gradient size={40} />
                  <div className="min-w-0">
                    <p className="font-display font-bold text-vxr-text truncate">
                      {u.full_name || "Unnamed user"}
                    </p>
                    <p className="font-body text-xs text-vxr-text-sub truncate">{u.email}</p>
                    <p className="font-body text-[11px] text-vxr-text-muted mt-0.5">
                      Submitted{" "}
                      {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                      {u.id_type ? ` · ${u.id_type}` : ""}
                    </p>
                  </div>
                </div>
                <DecisionBadge decision={u.decision} />
              </div>

              <div
                className={`grid gap-2 ${
                  u.id_back_path ? "grid-cols-3" : "grid-cols-2"
                }`}
              >
                <DocPreview label="ID Front" path={u.id_front_path} />
                {u.id_back_path && <DocPreview label="ID Back" path={u.id_back_path} />}
                <DocPreview label="Selfie" path={u.selfie_path} />
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-body text-[11px] bg-vxr-surface2 border border-vxr-border rounded-vxr-md p-2.5">
                <div>
                  <span className="text-vxr-text-sub">Name:</span>{" "}
                  <span className="text-vxr-text font-medium">{u.extracted_name || "—"}</span>
                </div>
                <div>
                  <span className="text-vxr-text-sub">ID #:</span>{" "}
                  <span className="text-vxr-text font-medium">{u.extracted_id_number || "—"}</span>
                </div>
                <div>
                  <span className="text-vxr-text-sub">DOB:</span>{" "}
                  <span className="text-vxr-text font-medium">{u.extracted_dob || "—"}</span>
                </div>
                <div>
                  <span className="text-vxr-text-sub">Face match:</span>{" "}
                  <span className="text-vxr-text font-medium">{pct(u.face_match_score)}</span>
                </div>
                <div>
                  <span className="text-vxr-text-sub">Name match:</span>{" "}
                  <span className="text-vxr-text font-medium">{pct(u.name_match_score)}</span>
                </div>
                <div>
                  <span className="text-vxr-text-sub">OCR conf:</span>{" "}
                  <span className="text-vxr-text font-medium">{pct(u.ocr_confidence)}</span>
                </div>
              </div>

              {u.decision_reason && (
                <p className="font-body text-[11px] text-vxr-danger bg-vxr-danger-soft border border-vxr-danger/20 rounded-vxr-md px-2.5 py-1.5">
                  <span className="font-semibold">Reason:</span> {u.decision_reason}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={ShieldX}
                  disabled={busyId === u.id}
                  onClick={() => onReject(u.id)}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="success"
                  icon={ShieldCheck}
                  disabled={busyId === u.id || isApproved}
                  onClick={() => onApprove(u.id, u.user_id)}
                >
                  {isApproved ? "Approved" : "Approve"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ListingVerifications() {
  const [filter, setFilter] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchListingVerifications({ filter }));
    } catch (e) {
      setError(e?.message || "Failed to load listing verifications");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(); /* eslint-disable-line */
  }, [filter]);

  const onApprove = async (id) => {
    setBusyId(id);
    try {
      await approveListingVerification(id);
      await load();
    } catch (e) {
      setError(e?.message || "Failed to approve");
    } finally {
      setBusyId(null);
    }
  };
  const onReject = async (id) => {
    if (!window.confirm("Reject this listing verification?")) return;
    setBusyId(id);
    try {
      await rejectListingVerification(id);
      await load();
    } catch (e) {
      setError(e?.message || "Failed to reject");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FilterTabs value={filter} onChange={setFilter} />
        <Button size="sm" variant="secondary" icon={RefreshCw} onClick={load}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-vxr-danger-soft border border-vxr-danger/20 text-vxr-danger font-body text-sm px-4 py-2.5 rounded-vxr-md">
          <AlertTriangle size={14} className="mt-0.5" /> {error}
        </div>
      )}

      {loading && <p className="font-body text-sm text-vxr-text-muted">Loading…</p>}
      {!loading && items.length === 0 && (
        <p className="font-body text-sm text-vxr-text-muted">
          No {filter === "all" ? "" : filter} listing verifications.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((l) => (
          <Card key={l.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-vxr-md bg-vxr-accent-soft text-vxr-accent flex items-center justify-center shrink-0">
                  <Building2 size={16} />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-vxr-text truncate">
                    {l.title || "Untitled listing"}
                  </p>
                  <p className="font-body text-xs text-vxr-text-sub capitalize">
                    {l.listing_type || "—"} · {l.status || "—"}
                  </p>
                  <p className="font-body text-[11px] text-vxr-text-muted mt-0.5">
                    Submitted{" "}
                    {l.verification_submitted_at
                      ? new Date(l.verification_submitted_at).toLocaleString()
                      : "—"}
                  </p>
                </div>
              </div>
              <StatusBadge verified={l.is_verified} />
            </div>

            <DocPreview label="Verification document" path={l.verification_doc_url} />

            <div className="flex justify-end gap-2 pt-1">
              <Button
                size="sm"
                variant="secondary"
                icon={ShieldX}
                disabled={busyId === l.id}
                onClick={() => onReject(l.id)}
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="success"
                icon={ShieldCheck}
                disabled={busyId === l.id || l.is_verified}
                onClick={() => onApprove(l.id)}
              >
                {l.is_verified ? "Approved" : "Approve"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AdminVerifications() {
  const [scope, setScope] = useState("users");

  const tabs = useMemo(
    () => [
      { value: "users", label: "User verifications" },
      { value: "listings", label: "Listing verifications" },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-vxr-surface border border-vxr-border rounded-vxr-md p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setScope(t.value)}
            className={`px-4 py-1.5 font-body text-sm font-medium rounded-vxr-sm transition ${
              scope === t.value
                ? "bg-vxr-text text-white"
                : "text-vxr-text-sub hover:bg-vxr-surface2"
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
