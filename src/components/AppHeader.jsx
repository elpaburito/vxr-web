import { ArrowLeft, ArrowRight, ChevronDown, ShieldAlert } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Logo, Button, Avatar, Badge } from "./vxr";
import NotificationBell from "./NotificationBell.jsx";
import ProfileButton from "./ProfileButton.jsx";

export default function AppHeader({ showBack = false, onBack }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, profile, user, hasListings, hasRental } = useAuth();

  const isLandlord = profile?.is_landlord || profile?.role === "landlord";
  const isAdmin = profile?.role === "admin";

  const navItems = isAuthenticated
    ? [
        { id: "home", label: "Home", to: "/home2" },
        { id: "search", label: "Search", to: "/search" },
        { id: "saved", label: "Saved", to: "/wishlists" },
        ...(hasRental ? [{ id: "rental", label: "My rental", to: "/my-rental" }] : []),
        ...(hasListings || isLandlord
          ? [{ id: "listings", label: "My listings", to: "/my-listings" }]
          : []),
        ...(isAdmin ? [{ id: "admin", label: "Admin", to: "/admin" }] : []),
      ]
    : [];

  const isActive = (to) => location.pathname === to;

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email || "Account";
  const avatarSrc = profile?.avatar_url || null;

  // Show a "Verify identity" nudge for any signed-in user who hasn't verified
  // yet (admins exempted). Clicking opens the wizard on /profile?verify=1.
  const showVerifyNudge =
    isAuthenticated && profile && profile.is_verified === false && !isAdmin;

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl border-b border-vxr-border"
      style={{ background: "rgba(247,245,243,0.85)" }}
    >
      <nav
        className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between gap-4"
        style={{ height: 72 }}
      >
        <div className="flex items-center gap-3 shrink-0">
          {showBack && (
            <button
              onClick={() => (onBack ? onBack() : navigate(-1))}
              className="w-9 h-9 rounded-full hover:bg-vxr-surface2 flex items-center justify-center text-vxr-text-sub transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <Logo size={32} onClick={() => navigate(isAuthenticated ? "/home2" : "/")} />
        </div>

        {isAuthenticated && navItems.length > 0 && (
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.to)}
                  className={[
                    "font-body text-[13px] px-3.5 py-2 rounded-vxr-md cursor-pointer transition-colors",
                    active
                      ? "text-vxr-accent bg-vxr-accent-soft font-bold"
                      : "text-vxr-text-sub hover:text-vxr-text hover:bg-vxr-surface2 font-semibold",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {isAuthenticated ? (
            <>
              {showVerifyNudge && (
                <button
                  type="button"
                  onClick={() => navigate("/profile?verify=1")}
                  className="hidden sm:inline-flex items-center"
                  aria-label="Verify your identity"
                  title="Verify your identity"
                >
                  <Badge tone="warning" icon={ShieldAlert}>
                    Verify identity
                  </Badge>
                </button>
              )}
              <NotificationBell framed />
              <ProfileButton
                onLogout={() => navigate("/login")}
                renderTrigger={({ toggle, open }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-label="Open profile menu"
                    className="flex items-center gap-1.5 bg-vxr-surface border border-vxr-border rounded-full pl-1 pr-2.5 py-1 shadow-vxr-sm hover:shadow-vxr-md hover:border-vxr-border-strong transition-all cursor-pointer"
                  >
                    <Avatar name={displayName} src={avatarSrc} gradient size={28} />
                    <ChevronDown size={14} className="text-vxr-text-sub" />
                  </button>
                )}
              />
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/login")}
                className="hidden sm:inline-flex font-body text-[13px] font-semibold text-vxr-text px-3 py-2 cursor-pointer hover:text-vxr-accent transition-colors"
              >
                Sign in
              </button>
              <Button
                size="sm"
                iconRight={ArrowRight}
                onClick={() => navigate("/login")}
              >
                Get started
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
