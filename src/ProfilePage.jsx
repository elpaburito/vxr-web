import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Bell, ChevronRight, User, Heart, LogOut, MessageCircle, FileText, BarChart2,
  Building2, CreditCard, Plus, MapPin, Calendar, DollarSign, Eye, EyeOff,
  Shield, Edit2, Trash2, List
} from "lucide-react";

// ==================== PROFILE DROPDOWN ====================
function ProfileDropdown({ onLogout }) {
  const navigate = useNavigate();
  const menuItems = [
    { icon: Home, label: "Manage Listings", path: "/my-listings" }, // Changed from "/dashboard" to "/my-listings"
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
      border: "1px solid #f0f0f0", zIndex: 100, overflow: "hidden"
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

// ==================== NAVBAR ====================
function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    setDropdownOpen(false);
    navigate("/");
  };

  return (
    <nav
      className="sticky top-0 z-50"
      style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
      onClick={() => setDropdownOpen(false)}
    >
      <div
        style={{ width: "100%", padding: "10px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Logo */}
        <div 
          onClick={() => navigate("/home2")}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
        >
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <span className="font-black text-lg" style={{ color: "#e8756a" }}>V</span>
          </div>
          <span className="font-bold text-white text-lg tracking-wide">ViewxRent</span>
        </div>

        {/* Right side icons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>

          {/* Home icon */}
          <button onClick={() => navigate("/home2")} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 4
          }}>
            <Home size={22} color="white" />
          </button>

          {/* Notification Bell */}
          <button style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 4, position: "relative"
          }}>
            <Bell size={22} color="white" />
            <span style={{
              position: "absolute", top: 2, right: 2,
              width: 8, height: 8, borderRadius: "50%",
              background: "#ff3b30", border: "1.5px solid #f0a090"
            }} />
          </button>

          {/* White pill: avatar + chevron */}
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "white", border: "none", cursor: "pointer",
              borderRadius: 999, padding: "5px 14px 5px 6px",
              gap: 24, minWidth: 100,
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
            }}
          >
            {/* Salmon circle avatar */}
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              border: "2.5px solid #e8756a",
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative", overflow: "hidden", flexShrink: 0
            }}>
              <div style={{
                position: "absolute", top: 6, left: "50%",
                transform: "translateX(-50%)",
                width: 11, height: 11, borderRadius: "50%", background: "#e8756a"
              }} />
              <div style={{
                position: "absolute", bottom: -2, left: "50%",
                transform: "translateX(-50%)",
                width: 20, height: 13, borderRadius: "50% 50% 0 0", background: "#e8756a"
              }} />
            </div>
            {/* Dark filled triangle chevron */}
            <div style={{
              width: 0, height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "8px solid #222",
              flexShrink: 0
            }} />
          </button>

          {dropdownOpen && <ProfileDropdown onLogout={handleLogout} />}
        </div>
      </div>
    </nav>
  );
}

// ==================== QUICK CARDS ====================
function QuickCards() {
  const navigate = useNavigate();
  
  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {[
        { icon: Home, title: "My Listings", sub: "Manage your properties", path: "/my-listings" }, // Changed from "/dashboard" to "/my-listings"
        { icon: Building2, title: "Tenant Management", sub: "View unit you rent", path: "/tenants" },
      ].map(({ icon: Icon, title, sub, path }) => (
        <button
          key={title}
          onClick={() => navigate(path)}
          className="flex items-center gap-3 bg-white rounded-lg px-4 py-4 border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "#fde8e6", display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <Icon size={20} style={{ color: "#e8756a" }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ==================== PROFILE INFORMATION ====================
function ProfileInformation() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <User size={16} style={{ color: "#e8756a" }} />
        <h2 className="text-sm font-semibold text-gray-800">Profile Information</h2>
      </div>
      <p className="text-xs text-gray-400 mb-5">Update your personal information and profile details.</p>

      <div className="mb-6">
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          border: "2px solid #e8756a", background: "#fff0ee",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <User size={32} style={{ color: "#e8756a" }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">First Name</label>
          <input
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 bg-gray-100 focus:outline-none cursor-not-allowed"
            defaultValue="Juan"
            readOnly
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Last Name</label>
          <input
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 bg-gray-100 focus:outline-none cursor-not-allowed"
            defaultValue="Dela Cruz"
            readOnly
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="text-xs text-gray-500 mb-1 block">Username</label>
        <input
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 bg-gray-100 focus:outline-none cursor-not-allowed"
          defaultValue="juandelacruz"
          readOnly
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Email Address</label>
        <input
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 bg-gray-100 focus:outline-none cursor-not-allowed"
          defaultValue="juandelacruz@gmail.com"
          readOnly
        />
      </div>
    </div>
  );
}

// ==================== SECURITY SETTINGS ====================
function SecuritySettings() {
  const [show, setShow] = useState(false);
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Shield size={16} className="text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-800">Security</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">Manage your password and account security.</p>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={show ? "text" : "password"}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-600 bg-gray-50 focus:outline-none"
              placeholder="••••••••"
            />
            <button
              onClick={() => setShow(!show)}
              style={{
                position: "absolute", right: 10, top: "50%",
                transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "#aaa"
              }}
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <button style={{
          background: "#e8756a", color: "white", border: "none",
          borderRadius: 6, padding: "8px 14px",
          fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap"
        }}>
          Change Password
        </button>
      </div>
    </div>
  );
}

// ==================== PAYMENT METHODS ====================
function PaymentMethods() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-800">Payment Methods</h2>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 4,
          fontSize: 12, fontWeight: 500, color: "#e8756a",
          border: "1px solid #f0b0a8", background: "#fff0ee",
          borderRadius: 6, padding: "5px 10px", cursor: "pointer"
        }}>
          <Plus size={12} /> Add New
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-4">Manage your saved payment methods.</p>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        border: "1px solid #f0f0f0", borderRadius: 8,
        padding: "12px 16px", background: "#fafafa"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, background: "#1a73e8",
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>G</span>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#222" }}>GCash Wallet</p>
              <span style={{
                background: "#dcfce7", color: "#16a34a",
                fontSize: 11, fontWeight: 500, padding: "1px 8px", borderRadius: 999
              }}>Default</span>
            </div>
            <p style={{ fontSize: 12, color: "#999" }}>GCash Account Number: 09XXXXXXXXX</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb" }}><Edit2 size={14} /></button>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb" }}><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

// ==================== RENTAL HISTORY ====================
const rentals = [
  { name: "Sunset Boulevard Apartment", address: "123 Somewhere St, Quezon City", lease: "Jan 2023 – Dec 2023", rent: "₱15,000 / mo", status: "Active" },
  { name: "Green Valley Apartment", address: "456 Somewhere Rd, Quezon City", lease: "Feb 2022 – Jan 2023", rent: "₱12,000 / mo", status: "Active" },
  { name: "Grand Residences Apartment", address: "789 Somewhere Blvd, Makati City", lease: "Mar 2021 – Feb 2022", rent: "₱18,000 / mo", status: "Active" },
];

function RentalHistory() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <List size={16} className="text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-800">Rental History</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">Your past and current rental activity.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rentals.map((r, i) => (
          <div key={i} style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#222" }}>{r.name}</p>
              <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 500, padding: "1px 8px", borderRadius: 999 }}>{r.status}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 12, color: "#888" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} /> {r.address}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} /> {r.lease}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><DollarSign size={11} /> {r.rent}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== TOGGLE COMPONENT ====================
function Toggle({ label, sub, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", gap: 16 }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 2 }}>{label}</p>
        {sub && <p style={{ fontSize: 12, color: "#9ca3af" }}>{sub}</p>}
      </div>
      <div
        onClick={() => setOn(!on)}
        style={{
          flexShrink: 0, width: 48, height: 26, borderRadius: 999,
          background: on ? "#e8756a" : "#d1d5db",
          position: "relative", cursor: "pointer", transition: "background 0.2s ease"
        }}
      >
        <div style={{
          position: "absolute", top: 3, left: on ? 23 : 3,
          width: 20, height: 20, borderRadius: "50%",
          background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
          transition: "left 0.2s ease"
        }} />
      </div>
    </div>
  );
}

// ==================== ACCOUNT SETTINGS TOGGLES ====================
function AccountSettingsToggles() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Bell size={16} className="text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-800">Account Settings</h2>
      </div>

      <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 5, marginBottom: 0 }}>
        <Bell size={12} /> Notification Preferences
      </p>
      <div style={{ borderBottom: "1px solid #f3f4f6" }}>
        <Toggle label="Email Notifications" sub="Receive updates, alerts, and more via email" defaultOn={true} />
      </div>
      <Toggle label="SMS Notifications" sub="Receive text notifications on your mobile" defaultOn={true} />

      <div style={{ borderTop: "1px solid #f3f4f6", marginTop: 8, paddingTop: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 5, marginBottom: 0 }}>
          <Shield size={12} /> Privacy Settings
        </p>
        <div style={{ borderBottom: "1px solid #f3f4f6" }}>
          <Toggle label="Public Visibility" sub="Allow others to view your profile" defaultOn={true} />
        </div>
        <Toggle label="Share Rental History" sub="Share your rental history with landlords" defaultOn={true} />
      </div>
    </div>
  );
}

// ==================== FOOTER ====================
function Footer() {
  return (
    <footer style={{ background: "#111827", marginTop: 32 }}>
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-3 gap-8">

        {/* Brand */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, background: "#e8756a",
              borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>V</span>
            </div>
            <span style={{ color: "white", fontWeight: 600 }}>Vooks</span>
          </div>
          <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
            The community-driven rental marketplace — connecting people with unique spaces and unforgettable experiences.
          </p>
        </div>

        {/* Company */}
        <div>
          <p style={{ color: "white", fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Company</p>
          {["About", "Careers", "Press", "Blog"].map(l => (
            <button key={l} style={{
              display: "block", fontSize: 12, color: "#6b7280",
              background: "none", border: "none", cursor: "pointer", marginBottom: 6, padding: 0
            }}>{l}</button>
          ))}
        </div>

        {/* Support */}
        <div>
          <p style={{ color: "white", fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Support</p>
          {["Help Center", "Safety Information", "Cancellation Options", "Report Issue"].map(l => (
            <button key={l} style={{
              display: "block", fontSize: 12, color: "#6b7280",
              background: "none", border: "none", cursor: "pointer", marginBottom: 6, padding: 0
            }}>{l}</button>
          ))}
        </div>

      </div>
    </footer>
  );
}

// ==================== MAIN PROFILE PAGE ====================
export default function ProfilePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "sans-serif" }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111", marginBottom: 4 }}>Account Settings</h1>
          <p style={{ fontSize: 14, color: "#6b7280" }}>Manage your profile information and account preferences.</p>
        </div>
        <QuickCards />
        <ProfileInformation />
        <SecuritySettings />
        <PaymentMethods />
        <RentalHistory />
        <AccountSettingsToggles />
      </main>
      <Footer />
    </div>
  );
}