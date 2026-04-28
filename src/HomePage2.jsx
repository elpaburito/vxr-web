import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, ChevronRight, Home, Bell, MapPin, Building2, Users, Star,
  Loader2, AlertCircle
} from "lucide-react";
import PropertyCard from "./components/PropertyCard.jsx";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import Footer from "./Footer";
import { useListings } from "./hooks/useListings";
import { useAuth } from "./context/AuthContext.jsx";

function Logo() {
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
        <span className="font-black text-lg" style={{ color: "#e8756a" }}>V</span>
      </div>
      <span className="font-bold text-white text-lg tracking-wide">ViewxRent</span>
    </div>
  );
}

function Hero() {
  const [where, setWhere] = useState("");
  const [when, setWhen] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const handleSearch = () => {
    navigate("/search", { state: { searchQuery: where, dateQuery: when } });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const initial = (profile?.full_name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <section
      style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
      className="w-[100%] relative overflow-visible"
      onClick={() => setDropdownOpen(false)}
    >
      <div
        style={{
          width: "100%", padding: "10px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
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
              display: "flex", alignItems: "center", gap: 8,
              background: "white", border: "none", cursor: "pointer",
              borderRadius: 999, padding: "5px 14px 5px 6px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg, #EC6138, #FF8E9E)",
              color: "white", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14
            }}>
              {initial}
            </div>
            <div style={{
              width: 0, height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "8px solid #222"
            }} />
          </button>

          {dropdownOpen && <ProfileDropdown />}
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

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
      <div className="aspect-[4/3] bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-full" />
      </div>
    </div>
  );
}

function Section({ title, subtitle, data, loading, seeAllTo, onSeeAll }) {
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
            onClick={onSeeAll}
            style={{ color: "#EC6138" }}
            className="text-sm font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity shrink-0"
          >
            See all <ChevronRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-gray-200 rounded-2xl">
            <p className="text-gray-500 text-sm">No listings here yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {data.map(p => <PropertyCard key={p.id} property={p} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function ExploreSection() {
  const navigate = useNavigate();
  const exploreItems = [
    { icon: MapPin, title: "Popular Locations", description: "Top-searched neighborhoods", color: "#e8756a", bg: "#ffe5e0", link: "/search" },
    { icon: Building2, title: "New Listings", description: "Fresh properties added this week", color: "#4caf50", bg: "#e8f5e9", link: "/search?sort=newest" },
    { icon: Users, title: "Host Community", description: "Join our growing community of hosts", color: "#2196f3", bg: "#e3f2fd", link: "/profile" },
    { icon: Star, title: "Top Rated", description: "Highest-rated properties", color: "#ff9800", bg: "#fff3e0", link: "/search?sort=rating" }
  ];

  return (
    <section className="py-12 md:py-16 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Explore ViewxRent</h2>
          <p className="text-gray-500 text-lg">Find your next home in a few taps</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {exploreItems.map((item, i) => (
            <button
              key={i}
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

export default function HomePage2() {
  const navigate = useNavigate();
  const { listings, loading, error } = useListings();

  const popular = useMemo(() => {
    return [...listings]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 4);
  }, [listings]);

  const affordable = useMemo(() => {
    return [...listings]
      .filter(l => l.monthlyRent != null)
      .sort((a, b) => (a.monthlyRent ?? 0) - (b.monthlyRent ?? 0))
      .slice(0, 4);
  }, [listings]);

  const premium = useMemo(() => {
    return [...listings]
      .filter(l => l.monthlyRent != null)
      .sort((a, b) => (b.monthlyRent ?? 0) - (a.monthlyRent ?? 0))
      .slice(0, 4);
  }, [listings]);

  return (
    <div className="w-[100%] min-h-[100vh] bg-gray-50 font-sans">
      <Hero />

      {error && (
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 pt-6">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold">Couldn't load listings</div>
              <div className="text-xs mt-0.5 opacity-80">
                {error.message || "Please check your connection and try again."}
                {error.message?.includes("listings") &&
                  " Make sure the 'listings' table exists in Supabase."}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-[100%] bg-white">
        <Section
          title="Popular homes"
          subtitle="Top-rated stays picked for you"
          data={popular}
          loading={loading}
          onSeeAll={() => navigate("/search?sort=rating")}
        />
        <div className="w-[100%] max-w-[80rem] mx-auto px-4 sm:px-6">
          <div className="border-t border-gray-100 w-[100%]" />
        </div>

        <Section
          title="Affordable rentals"
          subtitle="Budget-friendly options"
          data={affordable}
          loading={loading}
          onSeeAll={() => navigate("/search?sort=price-asc")}
        />
        <div className="w-[100%] max-w-[80rem] mx-auto px-4 sm:px-6">
          <div className="border-t border-gray-100 w-[100%]" />
        </div>

        <Section
          title="Premium spaces"
          subtitle="Luxury stays for the discerning"
          data={premium}
          loading={loading}
          onSeeAll={() => navigate("/search?sort=price-desc")}
        />
      </div>

      <ExploreSection />

      <Footer />
    </div>
  );
}
