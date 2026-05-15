import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Building2, ClipboardList, FileSignature,
  CheckCircle2, AlertTriangle, RefreshCw, Search,
  ShieldCheck, ShieldOff, Trash2, ExternalLink, FileText,
} from "lucide-react";
import AdminGuard from "./components/AdminGuard.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import AdminVerifications from "./components/AdminVerifications.jsx";
import {
  fetchAdminStats, fetchUsers, fetchAllListings, fetchAllApplications,
  updateUserRole, setUserVerified,
  setListingStatus, setListingVerified, deleteListing,
} from "./lib/adminService.js";

const ROLE_OPTIONS = ["tenant", "landlord", "admin"];
const LISTING_STATUS_OPTIONS = ["active", "draft", "inactive"];

function StatCard({ icon: Icon, label, value, hint, color = "#FF7043" }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value ?? "—"}</p>
          {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${
            value === t.value
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    active:    { bg: "#dcfce7", fg: "#16a34a" },
    draft:     { bg: "#e2e8f0", fg: "#475569" },
    inactive:  { bg: "#fee2e2", fg: "#dc2626" },
    pending:   { bg: "#fef3c7", fg: "#b45309" },
    approved:  { bg: "#dcfce7", fg: "#16a34a" },
    rejected:  { bg: "#fee2e2", fg: "#dc2626" },
  };
  const c = map[status] || { bg: "#e2e8f0", fg: "#475569" };
  return (
    <span
      style={{ background: c.bg, color: c.fg }}
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
    >
      {status || "—"}
    </span>
  );
}

// =====================================================
// USERS TAB
// =====================================================
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      setUsers(await fetchUsers({ search, role }));
    } catch (e) {
      setError(e?.message || "Failed to load users");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  const handleRoleChange = async (id, newRole) => {
    setBusyId(id);
    try {
      await updateUserRole(id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
    } catch (e) { setError(e?.message || "Failed to update role"); }
    finally { setBusyId(null); }
  };

  const toggleVerified = async (u) => {
    setBusyId(u.id);
    try {
      await setUserVerified(u.id, !u.is_verified);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_verified: !u.is_verified } : x)));
    } catch (e) { setError(e?.message || "Failed to update verification"); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Search email or name…"
              className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-vxr-accent"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg outline-none"
          >
            <option value="">All roles</option>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            onClick={load}
            className="h-10 px-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={14} /> Apply
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
          <AlertTriangle size={14} className="mt-0.5" /> {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-semibold px-4 py-3">User</th>
                <th className="text-left font-semibold px-4 py-3">Role</th>
                <th className="text-left font-semibold px-4 py-3">Verified</th>
                <th className="text-left font-semibold px-4 py-3">Joined</th>
                <th className="text-right font-semibold px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No users found.</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{u.full_name || "—"}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role || "tenant"}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={busyId === u.id}
                      className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-md outline-none capitalize"
                    >
                      {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_verified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <CheckCircle2 size={14} /> Verified
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Unverified</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleVerified(u)}
                      disabled={busyId === u.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition ${
                        u.is_verified
                          ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {u.is_verified ? <ShieldOff size={12} /> : <ShieldCheck size={12} />}
                      {u.is_verified ? "Revoke" : "Verify"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// LISTINGS TAB
// =====================================================
function ListingsTab() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true); setError("");
    try { setListings(await fetchAllListings({ search, status })); }
    catch (e) { setError(e?.message || "Failed to load listings"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  const onStatus = async (id, s) => {
    setBusyId(id);
    try {
      await setListingStatus(id, s);
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: s } : l)));
    } catch (e) { setError(e?.message || "Failed to update"); }
    finally { setBusyId(null); }
  };
  const onVerify = async (l) => {
    setBusyId(l.id);
    try {
      await setListingVerified(l.id, !l.is_verified);
      setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, is_verified: !l.is_verified } : x)));
    } catch (e) { setError(e?.message || "Failed to update"); }
    finally { setBusyId(null); }
  };
  const onDelete = async (id) => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    setBusyId(id);
    try {
      await deleteListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (e) { setError(e?.message || "Failed to delete"); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search title…"
            className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-vxr-accent"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg outline-none"
        >
          <option value="">All statuses</option>
          {LISTING_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={load}
          className="h-10 px-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw size={14} /> Apply
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
          <AlertTriangle size={14} className="mt-0.5" /> {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Title</th>
                <th className="text-left font-semibold px-4 py-3">Type</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-left font-semibold px-4 py-3">Verified</th>
                <th className="text-right font-semibold px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
              )}
              {!loading && listings.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No listings found.</td></tr>
              )}
              {listings.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 truncate max-w-[260px]">{l.title || "Untitled"}</p>
                    <p className="text-[11px] text-slate-400">
                      {l.created_at ? new Date(l.created_at).toLocaleDateString() : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 capitalize">{l.listing_type || "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={l.status || ""}
                      onChange={(e) => onStatus(l.id, e.target.value)}
                      disabled={busyId === l.id}
                      className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-md outline-none capitalize"
                    >
                      {LISTING_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onVerify(l)}
                      disabled={busyId === l.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${
                        l.is_verified
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      {l.is_verified ? <CheckCircle2 size={12} /> : <ShieldOff size={12} />}
                      {l.is_verified ? "Verified" : "Unverified"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button
                      onClick={() => navigate(`/unit/${l.id}`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink size={12} /> View
                    </button>
                    <button
                      onClick={() => onDelete(l.id)}
                      disabled={busyId === l.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// APPLICATIONS TAB
// =====================================================
function ApplicationsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setItems(await fetchAllApplications({ status })); }
    catch (e) { setError(e?.message || "Failed to load applications"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg outline-none"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button
          onClick={load}
          className="h-10 px-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
          <AlertTriangle size={14} className="mt-0.5" /> {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Applicant</th>
                <th className="text-left font-semibold px-4 py-3">Email</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-left font-semibold px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No applications.</td></tr>
              )}
              {items.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {[a.first_name, a.last_name].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.email || "—"}</td>
                  <td className="px-4 py-3"><StatusPill status={a.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MAIN PAGE
// =====================================================
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState("");

  const loadStats = async () => {
    setLoadingStats(true); setError("");
    try { setStats(await fetchAdminStats()); }
    catch (e) { setError(e?.message || "Failed to load stats"); }
    finally { setLoadingStats(false); }
  };
  useEffect(() => { loadStats(); }, []);

  const tabs = useMemo(() => ([
    { value: "overview",      label: "Overview" },
    { value: "users",         label: "Users" },
    { value: "listings",      label: "Listings" },
    { value: "applications",  label: "Applications" },
    { value: "verifications", label: "Verifications" },
  ]), []);

  return (
    <AdminGuard>
      <AdminLayout
        title="Admin Dashboard"
        subtitle="Manage users, listings, applications, and site content"
        actions={
          <button
            onClick={() => navigate("/admin/cms")}
            className="hidden sm:inline-flex items-center gap-1.5 h-10 px-3.5 rounded-lg bg-vxr-accent text-white text-sm font-semibold hover:opacity-90"
          >
            <FileText size={14} /> Open CMS
          </button>
        }
      >
        <div className="space-y-6">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />

          {tab === "overview" && (
            <div className="space-y-6">
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
                  <AlertTriangle size={14} className="mt-0.5" /> {error}
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total users" value={loadingStats ? "…" : stats?.users}
                          color="#6366F1" />
                <StatCard icon={Building2} label="Listings" value={loadingStats ? "…" : stats?.listings}
                          hint={stats ? `${stats.activeListings} active` : ""} color="#FF7043" />
                <StatCard icon={ClipboardList} label="Applications" value={loadingStats ? "…" : stats?.applications}
                          hint={stats ? `${stats.pendingApplications} pending` : ""} color="#F59E0B" />
                <StatCard icon={FileSignature} label="Contracts" value={loadingStats ? "…" : stats?.contracts}
                          color="#10B981" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">Quick actions</h3>
                  <p className="text-xs text-slate-500 mb-4">Jump straight into common admin tasks.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTab("users")}
                      className="text-left p-3 rounded-lg border border-slate-200 hover:border-vxr-accent hover:bg-orange-50/40 transition"
                    >
                      <Users size={16} className="text-vxr-accent" />
                      <p className="text-sm font-semibold text-slate-900 mt-2">Manage users</p>
                      <p className="text-xs text-slate-500">Roles & verification</p>
                    </button>
                    <button
                      onClick={() => setTab("listings")}
                      className="text-left p-3 rounded-lg border border-slate-200 hover:border-vxr-accent hover:bg-orange-50/40 transition"
                    >
                      <Building2 size={16} className="text-vxr-accent" />
                      <p className="text-sm font-semibold text-slate-900 mt-2">Manage listings</p>
                      <p className="text-xs text-slate-500">Approve / hide / verify</p>
                    </button>
                    <button
                      onClick={() => setTab("applications")}
                      className="text-left p-3 rounded-lg border border-slate-200 hover:border-vxr-accent hover:bg-orange-50/40 transition"
                    >
                      <ClipboardList size={16} className="text-vxr-accent" />
                      <p className="text-sm font-semibold text-slate-900 mt-2">Review applications</p>
                      <p className="text-xs text-slate-500">Tenant submissions</p>
                    </button>
                    <button
                      onClick={() => navigate("/admin/cms")}
                      className="text-left p-3 rounded-lg border border-slate-200 hover:border-vxr-accent hover:bg-orange-50/40 transition"
                    >
                      <FileText size={16} className="text-vxr-accent" />
                      <p className="text-sm font-semibold text-slate-900 mt-2">Content (CMS)</p>
                      <p className="text-xs text-slate-500">Pages, banners, FAQs</p>
                    </button>
                    <button
                      onClick={() => setTab("verifications")}
                      className="text-left p-3 rounded-lg border border-slate-200 hover:border-vxr-accent hover:bg-orange-50/40 transition col-span-2"
                    >
                      <ShieldCheck size={16} className="text-vxr-accent" />
                      <p className="text-sm font-semibold text-slate-900 mt-2">Review verifications</p>
                      <p className="text-xs text-slate-500">Approve user IDs &amp; listing documents</p>
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">System status</h3>
                  <p className="text-xs text-slate-500 mb-4">Live snapshot of platform activity.</p>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center justify-between">
                      <span className="text-slate-600">Pending applications</span>
                      <span className="font-semibold text-slate-900">{stats?.pendingApplications ?? "—"}</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-slate-600">Active listings</span>
                      <span className="font-semibold text-slate-900">{stats?.activeListings ?? "—"}</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-slate-600">Contracts in flight</span>
                      <span className="font-semibold text-slate-900">{stats?.contracts ?? "—"}</span>
                    </li>
                    <li className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        onClick={loadStats}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-vxr-accent hover:underline"
                      >
                        <RefreshCw size={13} /> Refresh stats
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {tab === "users" && <UsersTab />}
          {tab === "listings" && <ListingsTab />}
          {tab === "applications" && <ApplicationsTab />}
          {tab === "verifications" && <AdminVerifications />}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
