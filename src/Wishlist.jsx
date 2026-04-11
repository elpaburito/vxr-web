import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Home, Bell, ArrowLeft, Heart, Star, MapPin, 
  Calendar, Users, ChevronRight, X, Trash2
} from "lucide-react";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import { useWishlist } from "./context/WishlistContext.jsx";
import PropertyCard from "./components/PropertyCard.jsx";

export default function Wishlist() {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { wishlist, removeFromWishlist } = useWishlist();

  const handleLogout = () => {
    setDropdownOpen(false);
    navigate("/");
  };

  const handleRemoveAll = () => {
    if (window.confirm('Are you sure you want to remove all items from your wishlist?')) {
      wishlist.forEach(item => removeFromWishlist(item.id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav
        className="sticky top-0 z-50"
        style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
        onClick={() => setDropdownOpen(false)}
      >
        <div
          style={{ width: "100%", padding: "10px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 4
              }}
            >
              <ArrowLeft size={22} color="white" />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <span className="font-black text-lg" style={{ color: "#e8756a" }}>V</span>
              </div>
              <span className="font-bold text-white text-lg tracking-wide">ViewxRent</span>
            </div>
          </div>

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
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Heart size={32} className="text-[#e8756a]" fill="#e8756a" />
            <h1 className="text-3xl font-bold text-gray-800">Your Wishlists</h1>
          </div>
          {wishlist.length > 0 && (
            <button
              onClick={handleRemoveAll}
              className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition"
            >
              <Trash2 size={18} />
              <span>Remove All</span>
            </button>
          )}
        </div>
        <p className="text-gray-500 text-lg mb-8 ml-11">Properties you've saved for later</p>

        {/* Divider */}
        <div className="border-t border-gray-200 mb-8"></div>

        {/* Wishlist Items */}
        {wishlist.length === 0 ? (
          <div className="text-center py-16">
            <Heart size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-6">Start saving properties you love by clicking the heart icon</p>
            <button
              onClick={() => navigate("/home2")}
              className="px-6 py-3 text-white rounded-lg font-medium hover:opacity-90 transition"
              style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
            >
              Browse Properties
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlist.map((property) => (
              <div key={property.id} className="relative">
                <PropertyCard 
                  property={property}
                  onView={() => navigate(`/listing/${property.id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}