import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Heart, User, MessageCircle, FileText, LogOut, ShieldCheck, Building2, KeyRound, CreditCard, PlusCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { hasUserListings } from "../lib/profileService.js";
import { hasActiveContract } from "../lib/contractsService.js";

export default function ProfileDropdown({ onLogout }) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [hasListings, setHasListings] = useState(false);
  const [hasRental,   setHasRental]   = useState(false);

  const isAdmin   = profile?.role === "admin";
  const roleLabel = isAdmin
    ? "Admin"
    : hasListings && hasRental
      ? "Landlord · Tenant"
      : hasListings
        ? "Landlord"
        : "Tenant";

  useEffect(() => {
    if (!user?.id) { setHasListings(false); setHasRental(false); return; }
    let cancelled = false;
    hasUserListings(user.id).then((has) => { if (!cancelled) setHasListings(has); });
    hasActiveContract(user.id).then((has) => { if (!cancelled) setHasRental(has); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const menuItems = [
    ...(isAdmin                ? [{ icon: ShieldCheck, label: "Admin Dashboard",         path: "/admin" }]            : []),
    ...(hasListings            ? [{ icon: Home,        label: "My Listings",             path: "/my-listings" }]      : []),
    ...(!isAdmin               ? [{ icon: PlusCircle,  label: "List a Property",         path: "/enlist" }]           : []),
    ...(hasListings            ? [{ icon: Building2,   label: "Tenant Management",       path: "/tenant-management" }] : []),
    ...(hasRental && !isAdmin  ? [{ icon: KeyRound,    label: "My Rental",               path: "/my-rental" }]        : []),
    ...(hasRental && !isAdmin  ? [{ icon: CreditCard,  label: "My Payments",             path: "/my-payments" }]      : []),
    {                             icon: Heart,         label: "Wishlists",               path: "/wishlists" },
    {                             icon: User,          label: "Your Account",            path: "/profile" },
    {                             icon: MessageCircle, label: "Messages",                path: "/messages" },
    {                             icon: FileText,      label: "Enlistment Applications", path: "/enlistment" },
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
    <div style={{
      position: "absolute", right: 0, top: 44, width: 240,
      background: "white", borderRadius: 10,
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      border: "1px solid #f0f0f0", zIndex: 999999,
      overflow: "hidden"
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
        <p style={{ fontWeight: 600, fontSize: 14, color: "#111", textTransform: "capitalize" }}>
          {displayName}
        </p>
        {displayEmail && (
          <p style={{ fontSize: 12, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayEmail}
          </p>
        )}
        <span style={{
          display: "inline-block", marginTop: 6, fontSize: 10, fontWeight: 600,
          color: "#EC6138", background: "#fff1eb", padding: "2px 8px",
          borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.04em"
        }}>
          {roleLabel}
        </span>
      </div>

      <div style={{ padding: "4px 0" }}>
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              gap: 12, padding: "10px 16px", fontSize: 14,
              color: "#333", background: "none", border: "none",
              cursor: "pointer", textAlign: "left",
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = "#f9f9f9"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "none"; }}
          >
            <item.icon size={16} color="#aaa" />
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ borderTop: "1px solid #f0f0f0", padding: "4px 0" }}>
        <button onClick={handleLogout} style={{
          width: "100%", display: "flex", alignItems: "center",
          gap: 12, padding: "10px 16px", fontSize: 14,
          color: "#ef4444", background: "none", border: "none", cursor: "pointer"
        }}>
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </div>
  );
}
