import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, LogOut, Home, ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { Sidebar, Avatar } from "./vxr";
import NotificationBell from "./NotificationBell.jsx";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { id: "cms", label: "Content Management", path: "/admin/cms", icon: FileText },
];

export default function AdminLayout({ children, title, subtitle, actions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user, signOut } = useAuth();

  const activeId =
    location.pathname === "/admin"
      ? "dashboard"
      : location.pathname.startsWith("/admin/cms")
        ? "cms"
        : null;

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      /* ignored */
    }
    navigate("/");
  };

  const sidebarUser = profile?.full_name
    ? { name: profile.full_name, email: user?.email || "" }
    : user?.email
      ? { name: user.email.split("@")[0], email: user.email }
      : null;

  return (
    <div className="min-h-screen flex bg-vxr-bg">
      <Sidebar
        items={NAV_ITEMS.map((n) => ({ id: n.id, label: n.label, icon: n.icon }))}
        active={activeId}
        onNav={(id) => {
          const target = NAV_ITEMS.find((n) => n.id === id);
          if (target) navigate(target.path);
        }}
        user={sidebarUser}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-10 backdrop-blur-xl border-b border-vxr-border"
          style={{ background: "rgba(247,245,243,0.85)" }}
        >
          <div className="flex items-center justify-between px-6 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-body text-xs text-vxr-text-sub">
                <ShieldCheck size={13} className="text-vxr-accent" />
                <span className="uppercase tracking-wider font-semibold">Admin</span>
              </div>
              <h1 className="font-display text-xl md:text-2xl font-extrabold text-vxr-text mt-0.5 truncate tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="font-body text-sm text-vxr-text-sub mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {actions}
              <NotificationBell framed />
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-vxr-border">
                <Avatar
                  name={profile?.full_name || user?.email || "A"}
                  src={profile?.avatar_url}
                  gradient
                  size={36}
                />
                <div className="leading-tight">
                  <p className="font-display text-sm font-bold text-vxr-text">
                    {profile?.full_name || user?.email?.split("@")[0]}
                  </p>
                  <p className="font-body text-[11px] text-vxr-text-sub">Administrator</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/home2")}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 font-body text-xs font-semibold text-vxr-text-sub hover:text-vxr-text rounded-vxr-md hover:bg-vxr-surface2 transition-colors"
                title="Back to site"
              >
                <Home size={14} /> Site
              </button>
              <button
                onClick={handleLogout}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 font-body text-xs font-semibold text-vxr-danger hover:bg-vxr-danger-soft rounded-vxr-md transition-colors"
                title="Sign out"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
