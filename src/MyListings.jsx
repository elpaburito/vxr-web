import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Home, Plus, ArrowLeft, Edit2, Trash2, Bell
} from "lucide-react";
import { useListings } from "./context/ListingsContext.jsx";
import PropertyCard from "./components/PropertyCard.jsx";
import ProfileDropdown from "./components/ProfileDropdown.jsx";

export default function MyListings() {
  const navigate = useNavigate();
  const { listings, deleteListing } = useListings();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      deleteListing(id);
    }
  };

  const handleEdit = (id) => {
    navigate(`/dashboard?edit=${id}`);
  };

  const handleView = (id) => {
    navigate(`/listing/${id}`);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    navigate("/");
  };

  return (
    <div className="w-[100%] min-h-[100vh] bg-gray-50">
      {/* Header - Profile Page style with dropdown */}
      <nav
        className="sticky top-0 z-50"
        style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
        onClick={() => setDropdownOpen(false)}
      >
        <div
          style={{ width: "100%", padding: "10px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Left side with Back Button and Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 4
              }}
            >
              <ArrowLeft size={22} color="white" />
            </button>

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <span className="font-black text-lg" style={{ color: "#e8756a" }}>V</span>
              </div>
              <span className="font-bold text-white text-lg tracking-wide">ViewxRent</span>
            </div>
          </div>

          {/* Right side icons - Profile Page style with dropdown */}
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

            {/* White pill: avatar + chevron - Profile Page style */}
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

      {/* Main Content */}
      <div className="w-[100%] max-w-[72rem] mx-auto px-[1rem] py-[2rem]">
        {/* Title Section */}
        <div className="mb-[2rem]">
          <h1 className="text-[1.875rem] font-bold text-gray-800 mb-[0.5rem]">My Listings</h1>
          <p className="text-gray-500 text-[1rem]">Manage your property listings.</p>
        </div>

        {/* Create New Listing Button */}
        <div className="mb-[2rem]">
          <button 
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-[0.5rem] px-[1rem] py-[0.5rem] bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <Plus size={18} className="text-[#e8756a]" />
            <span className="text-[0.875rem] font-medium text-gray-700">Create New Listing</span>
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 mb-[2rem] w-[100%]"></div>

        {/* Listings Grid */}
        {listings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-[3rem] text-center w-[100%]">
            <div className="w-[100%] max-w-[28rem] mx-auto">
              {/* Illustration/Icon */}
              <div className="w-[5rem] h-[5rem] bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-[1rem]">
                <Home size={32} className="text-gray-400" />
              </div>
              
              <h2 className="text-[1.25rem] font-semibold text-gray-700 mb-[0.5rem]">No Listing Yet</h2>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[1.5rem] w-[100%]">
            {listings.map((listing) => (
              <div key={listing.id} className="relative">
                <PropertyCard 
                  property={listing}
                  onView={() => handleView(listing.id)}
                  showHeart={false}      // Hide heart for created listings
                  showRating={false}      // Hide rating for created listings
                />
                {/* Edit and Trash Icons at Upper Left */}
                <div className="absolute top-2 left-2 flex gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(listing.id);
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