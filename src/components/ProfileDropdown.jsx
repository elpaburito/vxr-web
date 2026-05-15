import { useNavigate } from "react-router-dom";
import {
  Home, Heart, User, MessageCircle, FileText, LogOut,
  ShieldCheck, Building2, KeyRound, CreditCard, PlusCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProfileDropdown({ onLogout }) {
  const navigate = useNavigate();
  const { user, profile, signOut, hasListings, hasRental } = useAuth();

  const isAdmin = profile?.role === "admin";
  const roleLabel = isAdmin
    ? "Admin"
    : hasListings && hasRental
      ? "Landlord · Tenant"
      : hasListings
        ? "Landlord"
        : "Tenant";

  const menuItems = [
    ...(isAdmin ? [{ icon: ShieldCheck, label: "Admin Dashboard", path: "/admin" }] : []),
    ...(hasListings ? [{ icon: Home, label: "My Listings", path: "/my-listings" }] : []),
    ...(!isAdmin ? [{ icon: PlusCircle, label: "List a Property", path: "/enlist" }] : []),
    ...(hasListings ? [{ icon: Building2, label: "Tenant Management", path: "/tenant-management" }] : []),
    ...(hasRental && !isAdmin ? [{ icon: KeyRound, label: "My Rental", path: "/my-rental" }] : []),
    ...(hasRental && !isAdmin ? [{ icon: CreditCard, label: "My Payments", path: "/my-payments" }] : []),
    { icon: Heart, label: "Wishlists", path: "/wishlists" },
    { icon: User, label: "Your Account", path: "/profile" },
    { icon: MessageCircle, label: "Messages", path: "/messages" },
    { icon: FileText, label: "Enlistment Applications", path: "/enlistment" },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Sign out error:", err?.message);
    }
    if (onLogout) onLogout();
    else navigate("/");
  };

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Guest";
  const displayEmail = profile?.email || user?.email || "";

  return (
    <div
      className="absolute right-0 top-12 w-60 bg-vxr-surface rounded-vxr-md border border-vxr-border shadow-vxr-lg overflow-hidden z-50"
    >
      <div className="px-4 py-3 border-b border-vxr-border">
        <p className="font-display font-bold text-sm text-vxr-text capitalize truncate">
          {displayName}
        </p>
        {displayEmail && (
          <p className="font-body text-xs text-vxr-text-sub truncate">{displayEmail}</p>
        )}
        <span className="inline-block mt-1.5 font-body text-[10px] font-bold uppercase tracking-wider text-vxr-accent bg-vxr-accent-soft px-2 py-0.5 rounded-full">
          {roleLabel}
        </span>
      </div>

      <div className="py-1">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="w-full flex items-center gap-3 px-4 py-2.5 font-body text-sm text-vxr-text hover:bg-vxr-surface2 text-left transition-colors"
          >
            <item.icon size={16} className="text-vxr-text-muted" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="border-t border-vxr-border py-1">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 font-body text-sm text-vxr-danger hover:bg-vxr-danger-soft text-left transition-colors"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </div>
  );
}
