import { useEffect, useState } from "react";
import {
  FileText, Megaphone, HelpCircle, Plus, Edit2, Trash2, X,
  AlertTriangle, Save, RefreshCw, Eye, EyeOff,
} from "lucide-react";
import AdminGuard from "./components/AdminGuard.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import {
  fetchPages, savePage, deletePage,
  fetchAnnouncements, saveAnnouncement, deleteAnnouncement,
  fetchFaqs, saveFaq, deleteFaq,
} from "./lib/adminService.js";

const TABS = [
  { value: "pages",         label: "Pages",         icon: FileText },
  { value: "announcements", label: "Announcements", icon: Megaphone },
  { value: "faqs",          label: "FAQs",          icon: HelpCircle },
];

function CMSTabs({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
      {TABS.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg inline-flex items-center gap-1.5 transition ${
            value === v ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Icon size={14} /> {label}
        </button>
      ))}
    </div>
  );
}

function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2 bg-slate-50/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </label>
  );
}

const inputCls =
  "w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#EC6138] focus:ring-2 focus:ring-orange-100";
const textareaCls =
  "w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#EC6138] focus:ring-2 focus:ring-orange-100";

// =====================================================
// PAGES
// =====================================================
const blankPage = { slug: "", title: "", body: "", status: "draft" };
function PagesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setItems(await fetchPages()); }
    catch (e) { setError(e?.message || "Failed to load pages"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onSave = async () => {
    if (!editing.slug || !editing.title) {
      setError("Slug and title are required."); return;
    }
    setBusy(true); setError("");
    try {
      await savePage(editing);
      setEditing(null);
      await load();
    } catch (e) { setError(e?.message || "Save failed"); }
    finally { setBusy(false); }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this page?")) return;
    try { await deletePage(id); await load(); }
    catch (e) { setError(e?.message || "Delete failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Manage marketing &amp; legal pages.</p>
        <div className="flex gap-2">
          <button onClick={load} className="h-9 px-3 inline-flex items-center gap-1.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={() => setEditing({ ...blankPage })}
            className="h-9 px-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#EC6138] rounded-lg hover:opacity-90"
          >
            <Plus size={13} /> New page
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
          <AlertTriangle size={14} className="mt-0.5" /> {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Title</th>
              <th className="text-left font-semibold px-4 py-3">Slug</th>
              <th className="text-left font-semibold px-4 py-3">Status</th>
              <th className="text-left font-semibold px-4 py-3">Updated</th>
              <th className="text-right font-semibold px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No pages yet.</td></tr>
            )}
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-900">{p.title}</td>
                <td className="px-4 py-3 text-slate-600">/{p.slug}</td>
                <td className="px-4 py-3 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-semibold capitalize ${
                    p.status === "published" ? "bg-emerald-50 text-emerald-700"
                      : p.status === "archived" ? "bg-slate-100 text-slate-600"
                      : "bg-amber-50 text-amber-700"
                  }`}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {p.updated_at ? new Date(p.updated_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button
                    onClick={() => setEditing({ ...p })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 hover:bg-slate-50"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(p.id)}
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

      <Modal
        open={!!editing}
        title={editing?.id ? "Edit page" : "New page"}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button onClick={() => setEditing(null)} className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={busy}
              className="h-9 px-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#EC6138] rounded-lg hover:opacity-90 disabled:opacity-60"
            >
              <Save size={13} /> {busy ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Slug" hint="URL-friendly id, e.g. about">
                <input
                  className={inputCls}
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                />
              </Field>
              <Field label="Status">
                <select className={inputCls}
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
            </div>
            <Field label="Title">
              <input className={inputCls} value={editing.title}
                     onChange={(e) => setEditing({ ...editing, title: e.target.value })}/>
            </Field>
            <Field label="Body" hint="Plain text or simple markdown.">
              <textarea rows={10} className={textareaCls} value={editing.body}
                        onChange={(e) => setEditing({ ...editing, body: e.target.value })}/>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

// =====================================================
// ANNOUNCEMENTS
// =====================================================
const blankAnn = {
  title: "", body: "", audience: "all", level: "info",
  is_active: true, starts_at: "", ends_at: "",
};
function AnnouncementsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setItems(await fetchAnnouncements()); }
    catch (e) { setError(e?.message || "Failed to load announcements"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onSave = async () => {
    if (!editing.title) { setError("Title is required."); return; }
    setBusy(true); setError("");
    try {
      await saveAnnouncement(editing);
      setEditing(null);
      await load();
    } catch (e) { setError(e?.message || "Save failed"); }
    finally { setBusy(false); }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try { await deleteAnnouncement(id); await load(); }
    catch (e) { setError(e?.message || "Delete failed"); }
  };

  const levelClass = (l) => ({
    info:    "bg-sky-50 text-sky-700",
    warning: "bg-amber-50 text-amber-700",
    success: "bg-emerald-50 text-emerald-700",
    danger:  "bg-red-50 text-red-700",
  }[l] || "bg-slate-100 text-slate-600");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">System banners shown to tenants &amp; landlords.</p>
        <div className="flex gap-2">
          <button onClick={load} className="h-9 px-3 inline-flex items-center gap-1.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={() => setEditing({ ...blankAnn })}
            className="h-9 px-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#EC6138] rounded-lg hover:opacity-90"
          >
            <Plus size={13} /> New announcement
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
          <AlertTriangle size={14} className="mt-0.5" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {loading && <p className="text-sm text-slate-400 col-span-full">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-400 col-span-full">No announcements yet.</p>
        )}
        {items.map((a) => (
          <div key={a.id} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-slate-900 truncate">{a.title}</h4>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${levelClass(a.level)}`}>
                    {a.level}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {a.audience}
                  </span>
                  <span className={`text-[10px] font-semibold inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                    a.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {a.is_active ? <Eye size={10} /> : <EyeOff size={10} />}
                    {a.is_active ? "Active" : "Hidden"}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-2 line-clamp-3 whitespace-pre-line">{a.body}</p>
                <p className="text-[11px] text-slate-400 mt-2">
                  {a.starts_at && `From ${new Date(a.starts_at).toLocaleDateString()}`}
                  {a.ends_at && ` — to ${new Date(a.ends_at).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setEditing({
                    ...a,
                    starts_at: a.starts_at ? a.starts_at.slice(0, 16) : "",
                    ends_at:   a.ends_at   ? a.ends_at.slice(0, 16)   : "",
                  })}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 hover:bg-slate-50"
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  onClick={() => onDelete(a.id)}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!editing}
        title={editing?.id ? "Edit announcement" : "New announcement"}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button onClick={() => setEditing(null)} className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={busy}
              className="h-9 px-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#EC6138] rounded-lg hover:opacity-90 disabled:opacity-60"
            >
              <Save size={13} /> {busy ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <Field label="Title">
              <input className={inputCls} value={editing.title}
                     onChange={(e) => setEditing({ ...editing, title: e.target.value })}/>
            </Field>
            <Field label="Body">
              <textarea rows={5} className={textareaCls} value={editing.body}
                        onChange={(e) => setEditing({ ...editing, body: e.target.value })}/>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Audience">
                <select className={inputCls} value={editing.audience}
                        onChange={(e) => setEditing({ ...editing, audience: e.target.value })}>
                  <option value="all">All users</option>
                  <option value="tenant">Tenants</option>
                  <option value="landlord">Landlords</option>
                </select>
              </Field>
              <Field label="Level">
                <select className={inputCls} value={editing.level}
                        onChange={(e) => setEditing({ ...editing, level: e.target.value })}>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="danger">Danger</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts at">
                <input type="datetime-local" className={inputCls}
                       value={editing.starts_at || ""}
                       onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })}/>
              </Field>
              <Field label="Ends at">
                <input type="datetime-local" className={inputCls}
                       value={editing.ends_at || ""}
                       onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })}/>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={!!editing.is_active}
                     onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}/>
              Active (visible to users)
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}

// =====================================================
// FAQs
// =====================================================
const blankFaq = { category: "general", question: "", answer: "", sort_order: 0, is_published: true };
function FaqsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setItems(await fetchFaqs()); }
    catch (e) { setError(e?.message || "Failed to load FAQs"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onSave = async () => {
    if (!editing.question) { setError("Question is required."); return; }
    setBusy(true); setError("");
    try { await saveFaq(editing); setEditing(null); await load(); }
    catch (e) { setError(e?.message || "Save failed"); }
    finally { setBusy(false); }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this FAQ?")) return;
    try { await deleteFaq(id); await load(); }
    catch (e) { setError(e?.message || "Delete failed"); }
  };

  const grouped = items.reduce((acc, f) => {
    (acc[f.category || "general"] ||= []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Frequently asked questions shown on the help page.</p>
        <div className="flex gap-2">
          <button onClick={load} className="h-9 px-3 inline-flex items-center gap-1.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={() => setEditing({ ...blankFaq })}
            className="h-9 px-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#EC6138] rounded-lg hover:opacity-90"
          >
            <Plus size={13} /> New FAQ
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
          <AlertTriangle size={14} className="mt-0.5" /> {error}
        </div>
      )}

      {loading && <p className="text-sm text-slate-400">Loading…</p>}

      {!loading && Object.keys(grouped).length === 0 && (
        <p className="text-sm text-slate-400">No FAQs yet.</p>
      )}

      <div className="space-y-5">
        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{cat}</h4>
            </div>
            <ul className="divide-y divide-slate-100">
              {list.map((f) => (
                <li key={f.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{f.question}</p>
                      {!f.is_published && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          Draft
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-line">{f.answer}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => setEditing({ ...f })}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 hover:bg-slate-50"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => onDelete(f.id)}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Modal
        open={!!editing}
        title={editing?.id ? "Edit FAQ" : "New FAQ"}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button onClick={() => setEditing(null)} className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={busy}
              className="h-9 px-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#EC6138] rounded-lg hover:opacity-90 disabled:opacity-60"
            >
              <Save size={13} /> {busy ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <input className={inputCls} value={editing.category}
                       onChange={(e) => setEditing({ ...editing, category: e.target.value })}/>
              </Field>
              <Field label="Sort order">
                <input type="number" className={inputCls} value={editing.sort_order}
                       onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })}/>
              </Field>
            </div>
            <Field label="Question">
              <input className={inputCls} value={editing.question}
                     onChange={(e) => setEditing({ ...editing, question: e.target.value })}/>
            </Field>
            <Field label="Answer">
              <textarea rows={6} className={textareaCls} value={editing.answer}
                        onChange={(e) => setEditing({ ...editing, answer: e.target.value })}/>
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={!!editing.is_published}
                     onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}/>
              Published
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}

// =====================================================
// MAIN
// =====================================================
export default function AdminCMS() {
  const [tab, setTab] = useState("pages");

  return (
    <AdminGuard>
      <AdminLayout
        title="Content Management"
        subtitle="Pages, announcements, and FAQs displayed across ViewxRent"
      >
        <div className="space-y-6">
          <CMSTabs value={tab} onChange={setTab} />
          {tab === "pages" && <PagesTab />}
          {tab === "announcements" && <AnnouncementsTab />}
          {tab === "faqs" && <FaqsTab />}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
