import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, LogOut, Home, ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const NAV = [
  { label: "Dashboard",        path: "/admin",     icon: LayoutDashboard },
  { label: "Content Management", path: "/admin/cms", icon: FileText },
];

export default function AdminLayout({ children, title, subtitle, actions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user, signOut } = useAuth();

  const initials =
    (profile?.full_name || user?.email || "A")
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const handleLogout = async () => {
    try { await signOut(); } catch { /* ignored */ }
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-slate-100">
        <div
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 px-5 py-5 cursor-pointer border-b border-white/10"
        >
          <div className="w-9 h-9 rounded-lg bg-[#EC6138] flex items-center justify-center text-white font-bold">V</div>
          <div>
            <p className="font-semibold tracking-tight">ViewxRent</p>
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Admin Console</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ label, path, icon: Icon }) => {
            const active =
              path === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active
                    ? "bg-[#EC6138] text-white shadow-md shadow-orange-900/30"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-white/10 space-y-1">
          <button
            onClick={() => navigate("/home2")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/5"
          >
            <Home size={16} />
            Back to site
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-300 hover:bg-red-500/10"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={13} className="text-[#EC6138]" />
                <span className="uppercase tracking-wider font-semibold">Admin</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-0.5 truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-slate-500 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {actions}
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EC6138] to-[#FF8E9E] text-white flex items-center justify-center text-sm font-semibold">
                  {initials}
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-slate-900">
                    {profile?.full_name || user?.email?.split("@")[0]}
                  </p>
                  <p className="text-[11px] text-slate-500">Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
