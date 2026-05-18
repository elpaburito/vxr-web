import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, Plus, Inbox, Search,
  Wrench, Sparkles, Tag, Volume2, AlertCircle as ReportIcon,
  ClipboardList, CheckCircle2, Clock, XCircle,
  Loader2, Reply,
} from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import AppHeader from "./components/AppHeader.jsx";
import { hasUserListings } from "./lib/profileService.js";
import { fetchMyActiveContract } from "./lib/contractsService";
import {
  fetchMyReports,
  fetchLandlordReportsForPage,
  submitReport,
  updateReportStatus,
  respondToReport,
} from "./lib/reportsService";
import {
  PageHero, Card, Button, Badge, Chip, EmptyState, Tabs, Modal, Input,
} from "./components/vxr";

// ─── Config maps ──────────────────────────────────────────────────────────────
const TYPE_OPTIONS     = ["All", "maintenance", "cleaning", "amenity", "noise", "other"];
const STATUS_OPTIONS   = ["All", "open", "in_progress", "resolved", "cancelled"];
const PRIORITY_OPTIONS = ["All", "high", "medium", "low"];

const TYPE_META = {
  maintenance: { label: "Maintenance", Icon: Wrench },
  cleaning:    { label: "Cleaning",    Icon: Sparkles },
  amenity:     { label: "Amenity",     Icon: Tag },
  noise:       { label: "Noise",       Icon: Volume2 },
  other:       { label: "Other",       Icon: ReportIcon },
};

const STATUS_META = {
  open:        { label: "Open",        tone: "warning", Icon: Clock },
  in_progress: { label: "In-progress", tone: "info",    Icon: Loader2 },
  resolved:    { label: "Resolved",    tone: "success", Icon: CheckCircle2 },
  cancelled:   { label: "Cancelled",   tone: "neutral", Icon: XCircle },
};

const PRIORITY_TONE = {
  high:   "danger",
  medium: "warning",
  low:    "success",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function cap(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────
function FilterSelect({ value, options, onChange, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 min-w-0 bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md px-3 py-2.5 font-body text-sm text-vxr-text focus:outline-none focus:border-vxr-accent transition-colors"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o === "All" ? `All ${placeholder}` : cap(o.replace(/_/g, " "))}
        </option>
      ))}
    </select>
  );
}

// ─── ReportCard ──────────────────────────────────────────────────────────────
function ReportCard({ report, asLandlord, onRefresh }) {
  const typeMeta   = TYPE_META[report.type] ?? TYPE_META.other;
  const statusMeta = STATUS_META[report.status] ?? STATUS_META.open;
  const listing         = report.listings ?? {};
  const tenantProfile   = report.tenant_profile ?? {};
  const landlordProfile = report.landlord_profile ?? {};
  const tenantName      = tenantProfile.full_name ?? "";
  const landlordName    = landlordProfile.full_name ?? "";
  const propertyLabel   = listing.title || "";
  const subtitle = asLandlord
    ? ([tenantName, propertyLabel].filter(Boolean).join(" · ") || "—")
    : ([landlordName, propertyLabel].filter(Boolean).join(" · ") || "—");

  const [respondOpen, setRespondOpen] = useState(false);
  const [responseText, setResponseText] = useState(report.landlord_response ?? "");
  const [saving, setSaving] = useState(false);
  const { Icon: TypeIcon } = typeMeta;

  async function handleStatus(newStatus) {
    setSaving(true);
    await updateReportStatus(report.id, newStatus);
    setSaving(false);
    onRefresh();
  }

  async function handleRespond() {
    if (!responseText.trim()) return;
    setSaving(true);
    await respondToReport(report.id, responseText.trim());
    setSaving(false);
    setRespondOpen(false);
    onRefresh();
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-vxr-md bg-vxr-accent-soft flex items-center justify-center shrink-0">
          <TypeIcon size={18} className="text-vxr-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-extrabold text-vxr-text leading-snug truncate">
            {report.title}
          </p>
          <p className="font-body text-xs text-vxr-text-sub mt-0.5 truncate">
            {subtitle}
          </p>
        </div>
        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <Badge tone={PRIORITY_TONE[report.priority] ?? "warning"}>
          {cap(report.priority ?? "medium")}
        </Badge>
        <Chip label={typeMeta.label} />
        <span className="ml-auto font-body text-[11px] text-vxr-text-sub">
          {fmtDate(report.created_at)}
        </span>
      </div>

      {report.description && (
        <p className="mt-3 font-body text-sm leading-relaxed text-vxr-text">
          {report.description}
        </p>
      )}

      {report.landlord_response && (
        <div className="mt-3 p-3 rounded-vxr-md bg-blue-50 border border-blue-200">
          <p className="font-body text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-1">
            Landlord response
          </p>
          <p className="font-body text-sm leading-relaxed text-vxr-text">
            {report.landlord_response}
          </p>
        </div>
      )}

      {asLandlord && (
        <div className="mt-4">
          {respondOpen && (
            <div className="mb-3">
              <textarea
                rows={3}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write a response…"
                className="w-full bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md px-3 py-2.5 font-body text-sm text-vxr-text outline-none focus:border-vxr-accent transition-colors resize-none"
              />
              <div className="flex gap-2 mt-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setRespondOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  icon={saving ? Loader2 : Reply}
                  disabled={saving || !responseText.trim()}
                  onClick={handleRespond}
                >
                  Send
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {report.status !== "in_progress" && report.status !== "resolved" && (
              <Button
                variant="secondary"
                size="sm"
                icon={Loader2}
                disabled={saving}
                onClick={() => handleStatus("in_progress")}
              >
                Mark in-progress
              </Button>
            )}
            {report.status !== "resolved" && (
              <Button
                variant="success"
                size="sm"
                icon={CheckCircle2}
                disabled={saving}
                onClick={() => handleStatus("resolved")}
              >
                Resolve
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={Reply}
              disabled={saving}
              onClick={() => setRespondOpen((o) => !o)}
            >
              Respond
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── NewReportModal ──────────────────────────────────────────────────────────
function NewReportModal({ contract, onClose, onSuccess }) {
  const [type, setType]     = useState("maintenance");
  const [priority, setPri]  = useState("medium");
  const [title, setTitle]   = useState("");
  const [desc, setDesc]     = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");
  const { user } = useAuth();

  const listingTitle =
    contract?.listings?.title ||
    contract?.property_address ||
    contract?.propertyAddress ||
    "Your rental";
  const contractId   = contract?.id;
  // Active contract may come back as either the normalized (camelCase) shape
  // or the merged raw row (snake_case) depending on caller — accept both.
  const listingId    = contract?.listingId ?? contract?.listing_id;
  const landlordId   =
    contract?.listings?.landlord_id ??
    contract?.landlord_id ??
    contract?.landlordId;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setErr("Title is required."); return; }
    if (!contractId || !listingId || !landlordId) {
      setErr("Your rental details are incomplete — refresh the page and try again.");
      return;
    }
    setSaving(true);
    setErr("");
    const { error } = await submitReport({
      tenantId:   user.id,
      contractId,
      listingId,
      landlordId,
      title:       title.trim(),
      description: desc.trim() || null,
      category:    type,
      priority,
    });
    setSaving(false);
    if (error) {
      console.error("[submitReport] failed:", error);
      setErr(error.message || error.details || "Failed to submit report. Please try again.");
      return;
    }
    onSuccess();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="New report"
      subtitle={listingTitle}
      size="md"
      footer={
        <>
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-report-form"
            icon={saving ? Loader2 : null}
            disabled={saving}
          >
            Submit report
          </Button>
        </>
      }
    >
      <form id="new-report-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub mb-1.5">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md px-3 py-2.5 font-body text-sm text-vxr-text focus:outline-none focus:border-vxr-accent transition-colors"
          >
            {["maintenance","cleaning","amenity","noise","other"].map((t) => (
              <option key={t} value={t}>{cap(t)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub mb-1.5">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPri(e.target.value)}
            className="w-full bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md px-3 py-2.5 font-body text-sm text-vxr-text focus:outline-none focus:border-vxr-accent transition-colors"
          >
            {["low","medium","high"].map((p) => (
              <option key={p} value={p}>{cap(p)}</option>
            ))}
          </select>
        </div>

        <Input
          label="Title *"
          placeholder="Short summary of the issue"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={err && !title.trim() ? err : undefined}
        />

        <div>
          <label className="block font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub mb-1.5">
            Description
          </label>
          <textarea
            rows={4}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Describe the issue in detail (optional)"
            className="w-full bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md px-3 py-2.5 font-body text-sm text-vxr-text outline-none focus:border-vxr-accent transition-colors resize-none"
          />
        </div>

        {err && title.trim() && (
          <div className="rounded-vxr-md border border-vxr-danger/30 bg-vxr-danger-soft text-vxr-danger text-xs px-3 py-2">
            {err}
          </div>
        )}
      </form>
    </Modal>
  );
}

// ─── ReportManagement page ───────────────────────────────────────────────────
export default function ReportManagement() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [loading,        setLoading]        = useState(true);
  const [isLandlord,     setIsLandlord]     = useState(false);
  const [activeContract, setActiveContract] = useState(null);
  const [myReports,      setMyReports]      = useState([]);
  const [inReports,      setInReports]      = useState([]);

  const [tab,          setTab]          = useState("my");
  const [typeFilter,   setTypeFilter]   = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priFilter,    setPriFilter]    = useState("All");

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated === false) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const [landlordFlag, { data: contract }, { data: incoming }] =
      await Promise.all([
        hasUserListings(user.id),
        fetchMyActiveContract(user.id),
        fetchLandlordReportsForPage(user.id),
      ]);

    // Scope "My reports" to the current rental so a tenant with a previous
    // rental doesn't see stale reports here.
    const { data: mine } = contract?.id
      ? await fetchMyReports(user.id, contract.id)
      : { data: [] };

    setIsLandlord(landlordFlag);
    setActiveContract(contract ?? null);
    // fetchMyReports is scoped to one contract, so every row's listing is
    // the same as activeContract's — use it as a fallback when the report's
    // own listings embed came back empty (legacy null listing_id, etc.).
    const fallbackListing = contract?.listings ?? null;
    setMyReports(
      (mine ?? []).map((r) => ({
        ...r,
        listings: r.listings?.title ? r.listings : (fallbackListing ?? r.listings ?? null),
      })),
    );
    setInReports(incoming ?? []);

    if (!contract && landlordFlag) setTab("incoming");

    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const hasTenant = !!activeContract;
  const hasBoth   = hasTenant && isLandlord;

  function applyFilters(rows) {
    return rows.filter((r) => {
      if (typeFilter   !== "All" && r.type !== typeFilter)     return false;
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      if (priFilter    !== "All" && r.priority !== priFilter)  return false;
      return true;
    });
  }

  const filteredMy = applyFilters(myReports);
  const filteredIn = applyFilters(inReports);
  const openIncoming = inReports.filter((r) => r.status === "open" || r.status === "in_progress").length;

  function resetFilters() {
    setTypeFilter("All");
    setStatusFilter("All");
    setPriFilter("All");
  }
  const filtersActive = typeFilter !== "All" || statusFilter !== "All" || priFilter !== "All";

  const showNewBtn = hasTenant && (tab === "my" || !hasBoth);

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-vxr-bg">
        <Loader2 className="animate-spin text-vxr-accent" size={32} />
      </div>
    );
  }

  // No tenant rental AND not a landlord — nothing to manage.
  if (!hasTenant && !isLandlord) {
    return (
      <div className="w-full min-h-screen bg-vxr-bg">
        <AppHeader showBack />
        <div className="max-w-3xl mx-auto px-4 py-16">
          <EmptyState
            icon={ReportIcon}
            title="No reports yet"
            message="Reports will appear here once you have an active rental (tenant) or a paid tenant on one of your listings (landlord)."
            action={
              <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(-1)}>
                Go back
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const tabs = hasBoth
    ? [
        { id: "my",       label: `My reports${myReports.length ? ` (${myReports.length})` : ""}` },
        { id: "incoming", label: `Incoming${inReports.length ? ` (${inReports.length})` : ""}` },
      ]
    : null;

  return (
    <div className="w-full min-h-screen bg-vxr-bg">
      <AppHeader showBack />

      <PageHero
        eyebrow={hasBoth && openIncoming > 0 ? `${openIncoming} open incoming` : undefined}
        title="Reports"
        subtitle="File maintenance and noise issues, and respond to your tenants' reports — all in one place."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={load}
            className={loading ? "[&_svg]:animate-spin" : ""}
          >
            Refresh
          </Button>
          {showNewBtn && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setShowModal(true)}
            >
              New report
            </Button>
          )}
        </div>
      </PageHero>

      {tabs && (
        <div className="w-full max-w-5xl mx-auto px-4 pt-4">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6 pb-12 space-y-4">
        {/* Filter bar */}
        <Card className="p-3 flex items-center gap-2 flex-wrap">
          <FilterSelect value={typeFilter}   options={TYPE_OPTIONS}     onChange={setTypeFilter}   placeholder="types" />
          <FilterSelect value={statusFilter} options={STATUS_OPTIONS}   onChange={setStatusFilter} placeholder="statuses" />
          <FilterSelect value={priFilter}    options={PRIORITY_OPTIONS} onChange={setPriFilter}    placeholder="priorities" />
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset
            </Button>
          )}
        </Card>

        {/* My Reports list */}
        {(tab === "my" || !hasBoth) && hasTenant && (
          <>
            {myReports.length === 0 ? (
              <Card className="p-2">
                <EmptyState
                  icon={ClipboardList}
                  title="No reports yet"
                  message='Tap "New report" to file a maintenance, cleaning, or noise issue.'
                />
              </Card>
            ) : filteredMy.length === 0 ? (
              <Card className="p-2">
                <EmptyState
                  icon={Search}
                  title="No reports match your filters"
                  message="Reset filters to see everything."
                  action={<Button variant="secondary" size="sm" onClick={resetFilters}>Reset filters</Button>}
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredMy.map((r) => (
                  <ReportCard key={r.id} report={r} asLandlord={false} onRefresh={load} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Incoming list */}
        {(tab === "incoming" || (!hasBoth && isLandlord)) && (
          <>
            {inReports.length === 0 ? (
              <Card className="p-2">
                <EmptyState
                  icon={Inbox}
                  title="Inbox empty"
                  message="No tenants have filed any reports yet."
                />
              </Card>
            ) : filteredIn.length === 0 ? (
              <Card className="p-2">
                <EmptyState
                  icon={Search}
                  title="No reports match your filters"
                  message="Reset filters to see everything."
                  action={<Button variant="secondary" size="sm" onClick={resetFilters}>Reset filters</Button>}
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredIn.map((r) => (
                  <ReportCard key={r.id} report={r} asLandlord={true} onRefresh={load} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {showModal && (
        <NewReportModal
          contract={activeContract}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
