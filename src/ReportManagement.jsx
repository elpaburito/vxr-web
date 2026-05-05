import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, Plus, Inbox, Search,
  Wrench, Sparkles, Tag, Volume2, AlertCircle as ReportIcon,
  ClipboardList, CheckCircle2, Clock, XCircle,
  ChevronDown, Loader2, Reply,
} from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import { hasUserListings } from "./lib/profileService.js";
import { fetchMyActiveContract } from "./lib/contractsService";
import {
  fetchMyReports,
  fetchLandlordReportsForPage,
  submitReport,
  updateReportStatus,
  respondToReport,
} from "./lib/reportsService";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const ORANGE     = "#FF7043";
const INK        = "#1A1A2E";
const MUTED      = "#6B7280";
const BORDER     = "#EEEEEE";
const BG         = "#F7F7F8";
const HIGH       = "#F44336";
const MEDIUM     = "#FF9800";
const LOW        = "#4CAF50";
const S_OPEN     = "#FF9800";
const S_PROGRESS = "#2196F3";
const S_RESOLVED = "#4CAF50";
const S_CANCEL   = "#9E9E9E";

// ─── Config maps ──────────────────────────────────────────────────────────────
const TYPE_OPTIONS     = ["All", "maintenance", "cleaning", "amenity", "noise", "other"];
const STATUS_OPTIONS   = ["All", "open", "in_progress", "resolved", "cancelled"];
const PRIORITY_OPTIONS = ["All", "high", "medium", "low"];

const TYPE_META = {
  maintenance: { label: "Maintenance", color: "#FF7043", Icon: Wrench },
  cleaning:    { label: "Cleaning",    color: "#7E57C2", Icon: Sparkles },
  amenity:     { label: "Amenity",     color: "#26A69A", Icon: Tag },
  noise:       { label: "Noise",       color: "#EF5350", Icon: Volume2 },
  other:       { label: "Other",       color: "#607D8B", Icon: ReportIcon },
};

const STATUS_META = {
  open:        { label: "Open",        color: S_OPEN,     Icon: Clock },
  in_progress: { label: "In-progress", color: S_PROGRESS, Icon: Loader2 },
  resolved:    { label: "Resolved",    color: S_RESOLVED, Icon: CheckCircle2 },
  cancelled:   { label: "Cancelled",   color: S_CANCEL,   Icon: XCircle },
};

const PRIORITY_META = {
  high:   { label: "High",   color: HIGH },
  medium: { label: "Medium", color: MEDIUM },
  low:    { label: "Low",    color: LOW },
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
    <div className="relative flex-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white text-sm pl-3 pr-8 py-2 rounded-lg outline-none cursor-pointer"
        style={{ border: `1px solid ${BORDER}`, color: value === "All" ? MUTED : INK }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "All" ? `All ${placeholder}` : cap(o.replace(/_/g, " "))}
          </option>
        ))}
      </select>
      <ChevronDown size={14} color={ORANGE} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? STATUS_META.open;
  return (
    <span
      className="flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: `${m.color}1F`, color: m.color }}
    >
      {m.label}
    </span>
  );
}

// ─── PriorityChip ─────────────────────────────────────────────────────────────
function PriorityChip({ priority }) {
  const m = PRIORITY_META[priority] ?? PRIORITY_META.medium;
  return (
    <span
      className="px-2 py-0.5 rounded text-[11px] font-bold"
      style={{ background: `${m.color}1F`, color: m.color }}
    >
      {m.label}
    </span>
  );
}

// ─── TypeChip ────────────────────────────────────────────────────────────────
function TypeChip({ type }) {
  return (
    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-600">
      {cap(type ?? "other")}
    </span>
  );
}

// ─── ReportCard ──────────────────────────────────────────────────────────────
function ReportCard({ report, asLandlord, onRefresh }) {
  const { Icon: TypeIcon, color: typeColor } = TYPE_META[report.type] ?? TYPE_META.other;
  const listing     = report.listings ?? {};
  const profile     = report.tenant_profile ?? {};
  const tenantName  = profile.full_name ?? "";
  const subtitle    = asLandlord && tenantName
    ? `${tenantName} · ${listing.title ?? ""}`
    : (listing.title ?? "—");

  const [respondOpen, setRespondOpen] = useState(false);
  const [responseText, setResponseText] = useState(report.landlord_response ?? "");
  const [saving, setSaving] = useState(false);

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
    <div
      className="bg-white rounded-2xl p-4"
      style={{ border: `1px solid ${BORDER}`, boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 rounded-xl flex items-center justify-center mt-0.5"
          style={{ width: 40, height: 40, background: `${typeColor}1F` }}
        >
          <TypeIcon size={20} color={typeColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] leading-snug" style={{ color: INK }}>
            {report.title}
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: MUTED }}>{subtitle}</p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      {/* ── Chips + date ────────────────────────────────────── */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <PriorityChip priority={report.priority ?? "medium"} />
        <TypeChip type={report.type} />
        <span className="ml-auto text-[11px]" style={{ color: MUTED }}>{fmtDate(report.created_at)}</span>
      </div>

      {/* ── Description ────────────────────────────────────── */}
      {report.description && (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: INK }}>
          {report.description}
        </p>
      )}

      {/* ── Landlord response ──────────────────────────────── */}
      {report.landlord_response && (
        <div
          className="mt-3 p-3 rounded-lg"
          style={{ background: "#E3F2FD", border: "1px solid #BBDEFB" }}
        >
          <p className="text-[11px] font-bold mb-1" style={{ color: "#1565C0" }}>
            Landlord response
          </p>
          <p className="text-sm leading-relaxed" style={{ color: INK }}>
            {report.landlord_response}
          </p>
        </div>
      )}

      {/* ── Landlord actions ────────────────────────────────── */}
      {asLandlord && (
        <div className="mt-4">
          {/* Respond inline box */}
          {respondOpen ? (
            <div className="mb-3">
              <textarea
                rows={3}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write a response…"
                className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none"
                style={{ border: `1px solid ${BORDER}`, color: INK }}
              />
              <div className="flex gap-2 mt-2 justify-end">
                <button
                  onClick={() => setRespondOpen(false)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ color: MUTED, border: `1px solid ${BORDER}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRespond}
                  disabled={saving || !responseText.trim()}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold text-white flex items-center gap-1.5 disabled:opacity-60"
                  style={{ background: ORANGE }}
                >
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  Send
                </button>
              </div>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {report.status !== "in_progress" && report.status !== "resolved" && (
              <button
                onClick={() => handleStatus("in_progress")}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-blue-50 disabled:opacity-60"
                style={{ color: S_PROGRESS, borderColor: S_PROGRESS }}
              >
                <Loader2 size={13} />
                Mark In-progress
              </button>
            )}
            {report.status !== "resolved" && (
              <button
                onClick={() => handleStatus("resolved")}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-green-50 disabled:opacity-60"
                style={{ color: S_RESOLVED, borderColor: S_RESOLVED }}
              >
                <CheckCircle2 size={13} />
                Resolve
              </button>
            )}
            <button
              onClick={() => setRespondOpen((o) => !o)}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-orange-50 disabled:opacity-60"
              style={{ color: ORANGE, borderColor: ORANGE }}
            >
              <Reply size={13} />
              Respond
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SectionEmpty ────────────────────────────────────────────────────────────
function SectionEmpty({ icon: Icon, title, subtitle }) {
  return (
    <div
      className="bg-white rounded-xl flex flex-col items-center py-10 px-6 text-center"
      style={{ border: `1px solid ${BORDER}` }}
    >
      <Icon size={48} color="#9CA3AF" />
      <p className="mt-3 font-bold text-sm" style={{ color: INK }}>{title}</p>
      <p className="mt-1 text-xs max-w-xs" style={{ color: MUTED }}>{subtitle}</p>
    </div>
  );
}

// ─── NewReportModal ──────────────────────────────────────────────────────────
function NewReportModal({ contract, onClose, onSuccess }) {
  const [type, setType]       = useState("maintenance");
  const [priority, setPri]    = useState("medium");
  const [title, setTitle]     = useState("");
  const [desc, setDesc]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");
  const { user } = useAuth();

  const listingTitle = contract?.listings?.title ?? "Your rental";
  const contractId   = contract?.id;
  const listingId    = contract?.listingId ?? contract?.listing_id;
  const landlordId   = contract?.listings?.landlord_id ?? contract?.landlordId;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setErr("Title is required."); return; }
    setSaving(true);
    setErr("");
    const { error } = await submitReport({
      tenantId:   user.id,
      contractId,
      listingId,
      landlordId,
      title:      title.trim(),
      description: desc.trim() || null,
      category:   type,
      priority,
    });
    setSaving(false);
    if (error) { setErr("Failed to submit report. Please try again."); return; }
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="w-10 h-1 rounded bg-gray-200 mx-auto mb-4 sm:hidden" />

        <h2 className="text-lg font-bold mb-0.5" style={{ color: INK }}>New Report</h2>
        <p className="text-xs mb-5" style={{ color: MUTED }}>{listingTitle}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Type */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: INK }}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none appearance-none"
              style={{ border: `1px solid ${BORDER}`, color: INK }}
            >
              {["maintenance","cleaning","amenity","noise","other"].map((t) => (
                <option key={t} value={t}>{cap(t)}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: INK }}>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPri(e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none appearance-none"
              style={{ border: `1px solid ${BORDER}`, color: INK }}
            >
              {["low","medium","high"].map((p) => (
                <option key={p} value={p}>{cap(p)}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: INK }}>
              Title <span style={{ color: ORANGE }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary of the issue"
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
              style={{ border: `1px solid ${title ? BORDER : err ? HIGH : BORDER}`, color: INK }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: INK }}>Description</label>
            <textarea
              rows={4}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe the issue in detail (optional)"
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none resize-none"
              style={{ border: `1px solid ${BORDER}`, color: INK }}
            />
          </div>

          {err && <p className="text-xs font-medium" style={{ color: HIGH }}>{err}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
            style={{ background: ORANGE }}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Submit Report
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── ReportManagement page ───────────────────────────────────────────────────
export default function ReportManagement() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [isLandlord,   setIsLandlord]   = useState(false);
  const [activeContract, setActiveContract] = useState(null);
  const [myReports,    setMyReports]    = useState([]);
  const [inReports,    setInReports]    = useState([]);

  const [tab,          setTab]          = useState("my");      // "my" | "incoming"
  const [typeFilter,   setTypeFilter]   = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priFilter,    setPriFilter]    = useState("All");

  const [showModal, setShowModal] = useState(false);

  const initial = (profile?.full_name || user?.email || "?")[0].toUpperCase();

  useEffect(() => {
    if (isAuthenticated === false) navigate("/login");
  }, [isAuthenticated, navigate]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const [landlordFlag, { data: contract }, { data: mine }, { data: incoming }] =
      await Promise.all([
        hasUserListings(user.id),
        fetchMyActiveContract(user.id),
        fetchMyReports(user.id),
        fetchLandlordReportsForPage(user.id),
      ]);

    setIsLandlord(landlordFlag);
    setActiveContract(contract ?? null);
    setMyReports(mine ?? []);
    setInReports(incoming ?? []);

    // If user has no active rental but is a landlord, default to incoming tab
    if (!contract && landlordFlag) setTab("incoming");

    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const hasTenant   = !!activeContract;
  const hasBoth     = hasTenant && isLandlord;

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

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <Loader2 className="animate-spin" size={40} color={ORANGE} />
      </div>
    );
  }

  // ── Empty account ────────────────────────────────────────────────────────────
  if (!hasTenant && !isLandlord) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: BG }}>
        <ReportIcon size={72} color="#9CA3AF" />
        <h2 className="text-lg font-bold" style={{ color: INK }}>No reports yet</h2>
        <p className="text-sm max-w-sm" style={{ color: MUTED }}>
          Reports will appear here once you have an active rental (tenant) or a paid tenant on one of your listings (landlord).
        </p>
        <button onClick={() => navigate(-1)} className="mt-2 flex items-center gap-2 text-sm font-semibold" style={{ color: ORANGE }}>
          <ArrowLeft size={16} /> Go back
        </button>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: BG }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white" style={{ borderBottom: `1px solid ${BORDER}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-orange-50 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={20} color={ORANGE} />
          </button>

          <h1 className="text-lg font-bold flex-1" style={{ color: ORANGE }}>Reports</h1>

          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-full hover:bg-orange-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} color={ORANGE} />
          </button>

          <div className="relative">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-orange-200"
              style={{ background: `linear-gradient(135deg, #FF8A80, ${ORANGE})` }}
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

        {/* Tabs */}
        {hasBoth && (
          <div className="max-w-4xl mx-auto px-4 flex">
            {[
              { key: "my",       label: "My Reports",  count: myReports.length },
              { key: "incoming", label: "Incoming",    count: inReports.length },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="py-3 px-4 text-sm font-semibold border-b-2 transition-colors relative"
                style={{
                  color: tab === key ? ORANGE : MUTED,
                  borderColor: tab === key ? ORANGE : "transparent",
                }}
              >
                {label}
                {count > 0 && (
                  <span
                    className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: tab === key ? `${ORANGE}20` : "#F3F4F6", color: tab === key ? ORANGE : MUTED }}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-4 pb-24 flex flex-col gap-4">

        {/* Incoming banner */}
        {(tab === "incoming" || (!hasBoth && isLandlord)) && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl text-white"
            style={{ background: "linear-gradient(135deg, #FFB199, #FF7043)" }}
          >
            <Inbox size={20} />
            <p className="font-bold text-sm flex-1">
              {openIncoming} open / {inReports.length} total reports
            </p>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <FilterSelect value={typeFilter}   options={TYPE_OPTIONS}     onChange={setTypeFilter}   placeholder="Types" />
          <FilterSelect value={statusFilter} options={STATUS_OPTIONS}   onChange={setStatusFilter} placeholder="Statuses" />
          <FilterSelect value={priFilter}    options={PRIORITY_OPTIONS} onChange={setPriFilter}    placeholder="Priorities" />
          {filtersActive && (
            <button
              onClick={resetFilters}
              className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-lg transition-colors hover:bg-orange-50"
              style={{ color: ORANGE, border: `1px solid ${ORANGE}` }}
            >
              Reset
            </button>
          )}
        </div>

        {/* My Reports list */}
        {(tab === "my" || !hasBoth) && hasTenant && (
          <>
            {myReports.length === 0 ? (
              <SectionEmpty
                icon={ClipboardList}
                title="No reports yet"
                subtitle='Tap "New Report" to file a maintenance, cleaning, or noise issue.'
              />
            ) : filteredMy.length === 0 ? (
              <SectionEmpty
                icon={Search}
                title="No reports match your filters"
                subtitle="Reset filters to see everything."
              />
            ) : (
              <div className="flex flex-col gap-3">
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
              <SectionEmpty
                icon={Inbox}
                title="Inbox empty"
                subtitle="No tenants have filed any reports yet."
              />
            ) : filteredIn.length === 0 ? (
              <SectionEmpty
                icon={Search}
                title="No reports match your filters"
                subtitle="Reset filters to see everything."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {filteredIn.map((r) => (
                  <ReportCard key={r.id} report={r} asLandlord={true} onRefresh={load} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── FAB: New Report ──────────────────────────────────────────────────── */}
      {showNewBtn && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full text-white font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
          style={{ background: ORANGE, boxShadow: `0 4px 20px ${ORANGE}66` }}
        >
          <Plus size={18} />
          New Report
        </button>
      )}

      {/* ── New Report modal ─────────────────────────────────────────────────── */}
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
