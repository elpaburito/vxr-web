import { useNavigate } from "react-router-dom";
import { Home, Heart, User, MessageCircle, FileText, BarChart2, LogOut } from "lucide-react";

export default function ProfileDropdown({ onLogout }) {
  const navigate = useNavigate();
  const menuItems = [
    { icon: Home, label: "Manage Listings", path: "/my-listings" },
    { icon: Heart, label: "Wishlists", path: "/wishlists" },
    { icon: User, label: "Your Account", path: "/profile" },
    { icon: MessageCircle, label: "Messages", path: "/messages" },
    { icon: FileText, label: "Enlistment Applications", path: "/enlistment" },
    { icon: BarChart2, label: "Applicants Reports", path: "/applicants" },
  ];

  return (
    <div style={{
      position: "absolute", right: 0, top: 44, width: 224,
      background: "white", borderRadius: 10,
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      border: "1px solid #f0f0f0", zIndex: 999999,
      overflow: "hidden"
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
        <p style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>Juan Dela Cruz</p>
        <p style={{ fontSize: 12, color: "#888" }}>juandelacruz@gmail.com</p>
      </div>

      <div style={{ padding: "4px 0" }}>
        {menuItems.map(({ icon: Icon, label, path }) => (
          <button
            key={label}
            onClick={() => {
              navigate(path);
            }}
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
        <button onClick={onLogout} style={{
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