import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Plus, ArrowLeft, Edit2, Trash2, Bell,
  Loader2, AlertCircle,
} from "lucide-react";
import PropertyCard from "./components/PropertyCard.jsx";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { fetchMyListings, deleteListingById } from "./lib/listingsService";

export default function MyListings() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const loadListings = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await fetchMyListings(user.id);
    setListings(data);
    setError(error);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadListings(); }, [loadListings]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    const { error } = await deleteListingById(id);
    if (error) {
      alert("Failed to delete: " + error.message);
      return;
    }
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading...
      </div>
    );
  }

  return (
    <div className="w-[100%] min-h-[100vh] bg-gray-50">
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
            <button onClick={() => navigate(-1)} style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 4
            }}>
              <ArrowLeft size={22} color="white" />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              display: "flex", alignItems: "center", justifyContent: "center", padding: 4, position: "relative"
            }}>
              <Bell size={22} color="white" />
              <span style={{
                position: "absolute", top: 2, right: 2,
                width: 8, height: 8, borderRadius: "50%",
                background: "#ff3b30", border: "1.5px solid #f0a090"
              }} />
            </button>
            <button onClick={() => setDropdownOpen(!dropdownOpen)} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "white", border: "none", cursor: "pointer",
              borderRadius: 999, padding: "5px 14px 5px 6px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, #EC6138, #FF8E9E)",
                color: "white", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14
              }}>
                {(user?.email || "?").charAt(0).toUpperCase()}
              </div>
              <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid #222" }} />
            </button>
            {dropdownOpen && <ProfileDropdown onLogout={handleLogout} />}
          </div>
        </div>
      </nav>

      <div className="w-[100%] max-w-[72rem] mx-auto px-[1rem] py-[2rem]">
        <div className="mb-[2rem]">
          <h1 className="text-[1.875rem] font-bold text-gray-800 mb-[0.5rem]">My Listings</h1>
          <p className="text-gray-500 text-[1rem]">Manage your property listings.</p>
        </div>

        <div className="mb-[2rem]">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-[0.5rem] px-[1rem] py-[0.5rem] bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <Plus size={18} className="text-[#e8756a]" />
            <span className="text-[0.875rem] font-medium text-gray-700">Create New Listing</span>
          </button>
        </div>

        <div className="border-t border-gray-200 mb-[2rem]" />

        {error && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold">Couldn't load your listings</div>
              <div className="text-xs opacity-90">{error.message}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-16 flex items-center justify-center text-gray-500">
            <Loader2 className="animate-spin mr-2" size={18} />
            Loading your listings...
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-[3rem] text-center w-[100%]">
            <div className="w-[100%] max-w-[28rem] mx-auto">
              <div className="w-[5rem] h-[5rem] bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-[1rem]">
                <Home size={32} className="text-gray-400" />
              </div>
              <h2 className="text-[1.25rem] font-semibold text-gray-700 mb-[0.5rem]">No Listings Yet</h2>
              <p className="text-gray-500 text-[1rem] mb-[1.5rem]">
                Create your first listing to start renting out your property.
              </p>
              <button
                onClick={() => navigate("/dashboard")}
                className="px-[1.5rem] py-[0.75rem] text-white rounded-lg font-medium transition-all hover:opacity-90 text-[1rem]"
                style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
              >
                Create Your First Listing
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[1.5rem]">
            {listings.map((listing) => (
              <div key={listing.id} className="relative">
                <PropertyCard
                  property={listing}
                  onView={() => navigate(`/unit/${listing.id}`)}
                />
                {listing.status !== "active" && (
                  <span className="absolute top-2 right-14 bg-slate-900/80 text-white text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wider">
                    {listing.status}
                  </span>
                )}
                <div className="absolute top-2 left-2 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/dashboard?edit=${listing.id}`);
                    }}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition border border-gray-200"
                    title="Edit"
                  >
                    <Edit2 size={16} className="text-blue-500" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(listing.id);
                    }}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition border border-gray-200"
                    title="Delete"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
