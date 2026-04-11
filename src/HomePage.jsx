import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import { DASMA } from "./data/listings.js";
import PropertyCard from "./components/PropertyCard.jsx";
import Footer from "./Footer";

// ===== LOGO COMPONENT =====
function Logo() {
  const navigate = useNavigate();
  
  return (
    <div 
      onClick={() => navigate("/")}
      className="flex items-center gap-[0.6rem] cursor-pointer hover:opacity-80 transition-opacity"
    >
      <div className="bg-white text-orange-500 w-[2.5rem] h-[2.5rem] rounded-xl flex items-center justify-center font-bold text-xl shadow-lg transform hover:rotate-3 transition-transform duration-300">
        V
      </div>
      <span className="text-white text-[1.3rem] font-semibold tracking-tight">ViewxRent</span>
    </div>
  );
}

// ===== HERO SECTION =====
function Hero() {
  const [where, setWhere] = useState("");
  const [when, setWhen] = useState("");
  const navigate = useNavigate();

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
      style={{ background: "linear-gradient(135deg, #EC6138 0%, #FF8E9E 100%)" }}
      className="relative overflow-hidden"
    >
      {/* NAV inside hero */}
      <div className="w-full px-6 pt-4 pb-2 flex items-center justify-between">
        <Logo />
        <button 
          onClick={() => navigate("/login")}
          className="text-sm font-semibold text-black hover:opacity-80 transition-opacity tracking-wide"
        >
          LOG IN
        </button>
      </div>

      {/* Search bar */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-row gap-0">
          {/* Where - First Section */}
          <div className="flex flex-col flex-1 px-4 py-2 border-r border-gray-200">
            <span className="text-xs font-semibold text-gray-700">Where</span>
            <input
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search destinations"
              className="bg-transparent text-xs text-gray-500 placeholder-gray-400 outline-none w-full mt-0.5"
            />
          </div>
          
          {/* When - Second Section */}
          <div className="flex flex-col flex-1 px-4 py-2 border-r border-gray-200">
            <span className="text-xs font-semibold text-gray-700">When</span>
            <input
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add dates"
              className="bg-transparent text-xs text-gray-500 placeholder-gray-400 outline-none w-full mt-0.5"
            />
          </div>
          
          {/* Icon Only - Third Section */}
          <div className="flex items-center justify-center px-4 py-2">
            <button
              onClick={handleSearch}
              style={{ background: "#EC6138" }}
              className="flex items-center justify-center w-9 h-9 rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all"
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
    <section className="py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
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

// ===== CTA SECTION =====
function CTA() {
  const navigate = useNavigate();
  
  return (
    <section className="py-12 md:py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div
          style={{ background: "linear-gradient(135deg, #EC6138 0%, #FF8E9E 100%)" }}
          className="rounded-3xl p-10 md:p-16 text-center shadow-2xl relative overflow-hidden"
        >
          {/* Dot pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />

          <div className="relative">
            <h2
              style={{ fontFamily: "'Georgia', serif", letterSpacing: "-0.02em" }}
              className="text-white text-3xl md:text-4xl font-bold mb-3"
            >
              Ready to start your journey?
            </h2>
            <p className="text-white/80 text-base mb-8">
              Join thousands of hosts and renters creating memories together on ViewxRent.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate("/login")}
                className="bg-white font-semibold text-sm px-8 py-3.5 rounded-xl hover:bg-gray-50 active:scale-95 transition-all shadow-lg w-full sm:w-auto"
                style={{ color: "#EC6138" }}
              >
                Start Renting Now
              </button>
              <button 
                onClick={() => navigate("/login")}
                className="border-2 border-white text-white font-semibold text-sm px-8 py-3.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all w-full sm:w-auto"
              >
                Become a Host
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== MAIN HOME PAGE COMPONENT =====
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Hero />
      
      <div className="bg-white">
        <Section
          title="Popular homes in Dasmariñas City"
          subtitle="Top-rated stays in the heart of Cavite"
          data={DASMA.slice(0, 4)}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="border-t border-gray-100" />
        </div>

        <Section
          title="Affordable Apartments in Dasmariñas"
          subtitle="Budget-friendly options near city center"
          data={DASMA.slice(4, 8)}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="border-t border-gray-100" />
        </div>

        <Section
          title="Premium Rentals in Dasmariñas"
          subtitle="Luxury spaces for modern living"
          data={[...DASMA].reverse().slice(0, 4)}
        />
      </div>

      <CTA />
      <Footer />
    </div>
  );
}