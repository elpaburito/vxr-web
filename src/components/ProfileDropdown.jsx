import { useNavigate } from "react-router-dom";
import { Home, Heart, User, MessageCircle, FileText, BarChart2, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProfileDropdown({ onLogout }) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const menuItems = [
    { icon: Home, label: "Manage Listings", path: "/my-listings" },
    { icon: Heart, label: "Wishlists", path: "/wishlists" },
    { icon: User, label: "Your Account", path: "/profile" },
    { icon: MessageCircle, label: "Messages", path: "/messages" },
    { icon: FileText, label: "Enlistment Applications", path: "/enlistment" },
    { icon: BarChart2, label: "Applicants Reports", path: "/applicants" },
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
        {profile?.role && (
          <span style={{
            display: "inline-block", marginTop: 6, fontSize: 10, fontWeight: 600,
            color: "#EC6138", background: "#fff1eb", padding: "2px 8px",
            borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.04em"
          }}>
            {profile.role}
          </span>
        )}
      </div>

      <div style={{ padding: "4px 0" }}>
        {menuItems.map(({ icon: Icon, label, path }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              gap: 12, padding: "10px 16px", fontSize: 14, color: "#333",
              background: "none", border: "none", cursor: "pointer", textAlign: "left"
            }}
            onMouseOver={e => e.currentTarget.style.background = "#f9f9f9"}
            onMouseOut={e => e.currentTarget.style.background = "none"}
          >
            <Icon size={16} color="#aaa" />
            {label}
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
