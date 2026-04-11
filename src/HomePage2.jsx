import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, ChevronRight, User, 
  Home, Bookmark, Settings, Mail, FileText, ClipboardList, LogOut,
  Bell, MessageCircle, BarChart2, Heart, MapPin, Building2, Users, Star
} from "lucide-react";
import { DASMA } from "./data/listings.js";
import PropertyCard from "./components/PropertyCard.jsx";
import Footer from "./Footer";

// ===== PROFILE DROPDOWN COMPONENT =====
function ProfileDropdown({ onLogout }) {
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
      border: "1px solid #f0f0f0", 
      zIndex: 999999,
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

// ===== LOGO COMPONENT =====
function Logo() {
  const navigate = useNavigate();
  
  return (
    <div 
      onClick={() => navigate("/")}
      style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
    >
      <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
        <span className="font-black text-lg" style={{ color: "#e8756a" }}>V</span>
      </div>
      <span className="font-bold text-white text-lg tracking-wide">ViewxRent</span>
    </div>
  );
}

// ===== HERO SECTION with Profile Dropdown =====
function Hero() {
  const [where, setWhere] = useState("");
  const [when, setWhen] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    setDropdownOpen(false);
    navigate("/");
  };

  const handleSearch = () => {
    // Navigate to search page with search query
    navigate("/search", { state: { searchQuery: where, dateQuery: when } });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <section
      style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
      className="w-[100%] relative overflow-visible"
      onClick={() => setDropdownOpen(false)}
    >
      <div 
        style={{ 
          width: "100%", 
          padding: "10px 32px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          boxSizing: "border-box" 
        }}
        onClick={e => e.stopPropagation()}
      >
        <Logo />
        
        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
          <button onClick={() => navigate("/home2")} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 4
          }}>
            <Home size={22} color="white" />
          </button>

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

      <div className="w-[100%] max-w-[42rem] mx-auto px-[1rem] py-[1.5rem]">
        <div className="bg-white rounded-2xl shadow-lg p-[0.5rem] flex flex-row gap-0">
          <div className="flex flex-col flex-1 px-[1rem] py-[0.5rem] border-r border-gray-200">
            <span className="text-xs font-semibold text-gray-700">Where</span>
            <input
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search destinations"
              className="bg-transparent text-xs text-gray-500 placeholder-gray-400 outline-none w-[100%] mt-[0.125rem]"
            />
          </div>
          <div className="flex flex-col flex-1 px-[1rem] py-[0.5rem] border-r border-gray-200">
            <span className="text-xs font-semibold text-gray-700">When</span>
            <input
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add dates"
              className="bg-transparent text-xs text-gray-500 placeholder-gray-400 outline-none w-[100%] mt-[0.125rem]"
            />
          </div>
          <div className="flex items-center justify-center px-[1rem] py-[0.5rem]">
            <button
              onClick={handleSearch}
              style={{ background: "#EC6138" }}
              className="flex items-center justify-center w-[2.25rem] h-[2.25rem] rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all"
            >
              <Search size={15} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== SECTION =====
function Section({ title, subtitle, data }) {
  return (
    <section className="py-10 md:py-14 w-[100%]">
      <div className="w-[100%] max-w-[80rem] mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2
              style={{ fontFamily: "'Georgia', serif", letterSpacing: "-0.02em" }}
              className="text-2xl md:text-3xl font-bold text-gray-900"
            >
              {title}
            </h2>
            {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
          </div>
          <button
            style={{ color: "#EC6138" }}
            className="text-sm font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity shrink-0"
          >
            See all <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {data.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== NEW EXPLORE SECTION (Replaces CTA for HomePage2) =====
function ExploreSection() {
  const navigate = useNavigate();
  
  const exploreItems = [
    { icon: MapPin, title: "Popular Locations", description: "Discover the most loved neighborhoods in Dasmariñas", color: "#e8756a", bg: "#ffe5e0", link: "/search" },
    { icon: Building2, title: "New Listings", description: "Fresh properties added this week", color: "#4caf50", bg: "#e8f5e9", link: "/search" },
    { icon: Users, title: "Host Community", description: "Join our growing community of hosts", color: "#2196f3", bg: "#e3f2fd", link: "/profile" },
    { icon: Star, title: "Top Rated", description: "Explore our highest-rated properties", color: "#ff9800", bg: "#fff3e0", link: "/search" }
  ];

  return (
    <section className="py-12 md:py-16 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Explore Dasmariñas</h2>
          <p className="text-gray-500 text-lg">Find your perfect rental home in the heart of Cavite</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {exploreItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.link)}
              className="group bg-white rounded-2xl p-6 text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110"
                style={{ backgroundColor: item.bg }}
              >
                <item.icon size={28} style={{ color: item.color }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.description}</p>
            </button>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => navigate("/search")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all hover:shadow-lg"
            style={{ background: "linear-gradient(to right, #e8756a, #f0a090)", color: "white" }}
          >
            Start Exploring
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

// ===== MAIN HOME PAGE 2 COMPONENT =====
export default function HomePage2() {
  return (
    <div className="w-[100%] min-h-[100vh] bg-gray-50 font-sans">
      <Hero />
      
      <div className="w-[100%] bg-white">
        <Section
          title="Popular homes in Dasmariñas City"
          subtitle="Top-rated stays in the heart of Cavite"
          data={DASMA.slice(0, 4)}
        />
        <div className="w-[100%] max-w-[80rem] mx-auto px-4 sm:px-6">
          <div className="border-t border-gray-100 w-[100%]" />
        </div>

        <Section
          title="Affordable Apartments in Dasmariñas"
          subtitle="Budget-friendly options near city center"
          data={DASMA.slice(4, 8)}
        />
        <div className="w-[100%] max-w-[80rem] mx-auto px-4 sm:px-6">
          <div className="border-t border-gray-100 w-[100%]" />
        </div>

        <Section
          title="Premium Rentals in Dasmariñas"
          subtitle="Luxury spaces for modern living"
          data={[...DASMA].reverse().slice(0, 4)}
        />
      </div>

      {/* New Explore Section - Different from HomePage's CTA */}
      <ExploreSection />
      
      <Footer />
    </div>
  );
}