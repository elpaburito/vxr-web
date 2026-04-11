import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Home, Bell, ArrowLeft, Heart, MapPin, Calendar, 
  Users, DollarSign, Check, X, Wifi, Wind, 
  Coffee, Tv, Car, Shield, Clock, Star, Share2,
  Phone, Mail, MessageCircle, Bed, Bath, Square, 
  Maximize2, Minimize2, ChevronRight
} from "lucide-react";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import { useWishlist } from "./context/WishlistContext.jsx";
import { DASMA } from "./data/listings.js";
import ApplicationModal from "./components/ApplicationModal.jsx"; // ← FIXED PATH

export default function UnitDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false); // ← ADD THIS STATE
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  // Get listing data from Dasmariñas data
  const listing = DASMA.find(l => l.id === parseInt(id)) || DASMA[0];

  useEffect(() => {
    if (listing && isInWishlist(listing.id)) {
      setLiked(true);
    }
  }, [listing, isInWishlist]);

  const handleLogout = () => {
    setDropdownOpen(false);
    navigate("/");
  };

  const toggleLike = () => {
    if (liked) {
      removeFromWishlist(listing.id);
    } else {
      addToWishlist(listing);
    }
    setLiked(!liked);
  };

  const handleApplicationSubmit = (applicationData) => {
    console.log("Application submitted:", applicationData);
    console.log("For unit:", listing.title);
    console.log("Price:", listing.price);
    // Here you can send the data to your backend API
    alert("Application submitted successfully! The landlord will review your application.");
  };

  // Google Maps Embed URL for Dasmariñas
  const mapSrc = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d123792.93519097227!2d120.93433955!3d14.329567!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397d3a3b5b3b3b3%3A0x3b3b3b3b3b3b3b3b!2sDasmari%C3%B1as%2C%20Cavite!5e0!3m2!1sen!2sph!4v1234567890";

  return (
    <div className="w-[100%] min-h-[100vh] bg-gray-50 flex flex-col">
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
      <div className="w-[100%] max-w-[80rem] mx-auto px-[1.5rem] py-[1.5rem]">
        <div className="flex flex-col lg:flex-row gap-[2rem]">
          {/* Left Column - Main Info */}
          <div className="w-[100%] lg:w-[60%]">
            {/* Image Gallery */}
            <div className="w-[100%] aspect-[16/9] bg-gray-200 rounded-xl overflow-hidden mb-[1.5rem]">
              {listing.img ? (
                <img src={listing.img} alt={listing.title} className="w-[100%] h-[100%] object-cover" />
              ) : (
                <div className="w-[100%] h-[100%] flex items-center justify-center bg-gray-200">
                  <Home size={64} className="text-gray-400" />
                </div>
              )}
            </div>

            {/* Title Section */}
            <div className="mb-[1.5rem]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-[0.5rem] mb-[0.5rem]">
                    <span className="text-[0.875rem] text-gray-500">{listing.type || 'Property'}</span>
                    <span className="text-[0.875rem] text-gray-300">·</span>
                    <span className="text-[0.875rem] text-gray-500">Dasmariñas</span>
                  </div>
                  <h1 className="text-[1.75rem] font-bold text-gray-800 mb-[0.5rem]">
                    {listing.title || 'Studio type apartment'}
                  </h1>
                  <div className="flex items-center gap-[0.5rem]">
                    <Star size={16} fill="#FBBF24" stroke="#FBBF24" />
                    <span className="text-[0.875rem] font-medium text-gray-700">{listing.rating || 4.8}</span>
                    <span className="text-[0.75rem] text-gray-400">({listing.reviews || 3374} reviews)</span>
                  </div>
                </div>
                <button
                  onClick={toggleLike}
                  className="p-[0.5rem] bg-white rounded-full shadow-md hover:shadow-lg transition"
                >
                  <Heart size={22} fill={liked ? "#EC6138" : "none"} stroke={liked ? "#EC6138" : "#666"} />
                </button>
              </div>
            </div>

            {/* Property Details Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-[1.5rem] mb-[1.5rem]">
              <h2 className="text-[1.25rem] font-semibold text-gray-800 mb-[1rem]">Property Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[1rem] mb-[1.5rem]">
                <div>
                  <h3 className="text-[0.875rem] font-semibold text-gray-600 mb-[0.5rem]">About this place</h3>
                  <p className="text-[0.875rem] text-gray-500">Located in {listing.location || 'Dasmariñas City'}, near schools and commercial centers</p>
                </div>
                <div>
                  <h3 className="text-[0.875rem] font-semibold text-gray-600 mb-[0.5rem]">Unit Details</h3>
                  <p className="text-[0.875rem] text-gray-500">{listing.bedrooms} Bedroom, {listing.bathrooms} Bathroom, {listing.area}m² floor area</p>
                </div>
                <div>
                  <h3 className="text-[0.875rem] font-semibold text-gray-600 mb-[0.5rem]">Terms & Conditions</h3>
                  <p className="text-[0.875rem] text-gray-500">1 Month Advance + 1 Month Deposit</p>
                  <p className="text-[0.875rem] text-gray-500">Maximum of 4 occupants</p>
                </div>
                <div>
                  <h3 className="text-[0.875rem] font-semibold text-gray-600 mb-[0.5rem]">Open Floor Plan</h3>
                  <div className="flex flex-wrap gap-[0.5rem]">
                    <span className="text-[0.75rem] text-gray-500">Property Type: {listing.type?.split('·')[0] || 'Apartment'}</span>
                    <span className="text-[0.75rem] text-gray-500">Furnished: Yes</span>
                    <span className="text-[0.75rem] text-gray-500">Bedrooms: {listing.bedrooms}</span>
                    <span className="text-[0.75rem] text-gray-500">Bathrooms: {listing.bathrooms}</span>
                    <span className="text-[0.75rem] text-gray-500">Living: Kitchen</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Amenities Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-[1.5rem] mb-[1.5rem]">
              <h2 className="text-[1.25rem] font-semibold text-gray-800 mb-[1rem]">What this property offers</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-[0.75rem]">
                {[
                  { icon: Wind, label: "Air Conditioning" },
                  { icon: Tv, label: "Washing Machine" },
                  { icon: Coffee, label: "Kitchen" },
                  { icon: Wifi, label: "WiFi" },
                  { icon: Car, label: "Parking" },
                  { icon: Shield, label: "CCTV" },
                  { icon: Bed, label: "Bedroom" },
                  { icon: Bath, label: "Bathroom" }
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-[0.5rem]">
                    <Icon size={16} className="text-[#e8756a]" />
                    <span className="text-[0.75rem] text-gray-600">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rental Rules & Policies */}
            <div className="bg-white rounded-xl border border-gray-200 p-[1.5rem] mb-[1.5rem]">
              <h2 className="text-[1.25rem] font-semibold text-gray-800 mb-[1rem]">Rental Rules & Policies</h2>
              <div className="grid grid-cols-2 gap-[1rem]">
                <div>
                  <h3 className="text-[0.875rem] font-semibold text-gray-600 mb-[0.25rem]">Pets allowed</h3>
                  <p className="text-[0.875rem] text-gray-500 flex items-center gap-[0.5rem]">
                    <X size={16} className="text-red-500" /> No
                  </p>
                </div>
                <div>
                  <h3 className="text-[0.875rem] font-semibold text-gray-600 mb-[0.25rem]">Smoking allowed</h3>
                  <p className="text-[0.875rem] text-gray-500 flex items-center gap-[0.5rem]">
                    <X size={16} className="text-red-500" /> Not Allowed
                  </p>
                </div>
                <div>
                  <h3 className="text-[0.875rem] font-semibold text-gray-600 mb-[0.25rem]">Guest Policy</h3>
                  <p className="text-[0.875rem] text-gray-500">Day/Nite Only</p>
                </div>
                <div>
                  <h3 className="text-[0.875rem] font-semibold text-gray-600 mb-[0.25rem]">Curfew</h3>
                  <p className="text-[0.875rem] text-gray-500">No Curfew</p>
                </div>
              </div>
            </div>

            {/* Location & Map */}
            <div className="bg-white rounded-xl border border-gray-200 p-[1.5rem] mb-[1.5rem]">
              <h2 className="text-[1.25rem] font-semibold text-gray-800 mb-[1rem]">Location</h2>
              <div className="flex items-start gap-[0.5rem] mb-[1rem]">
                <MapPin size={18} className="text-[#e8756a] mt-[0.125rem]" />
                <p className="text-[0.875rem] text-gray-600">
                  {listing.location || `Dasmariñas City, Cavite 4100`}
                </p>
              </div>
              
              <div className="w-[100%] h-[12rem] bg-gray-200 rounded-lg overflow-hidden relative">
                <iframe
                  src={mapSrc}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  title="Dasmariñas Map"
                ></iframe>
                <button 
                  onClick={() => window.open(mapSrc, '_blank')}
                  className="absolute bottom-[0.5rem] right-[0.5rem] bg-white p-[0.5rem] rounded-lg shadow-md text-[0.75rem] text-gray-600 hover:shadow-lg transition"
                >
                  View Larger Map
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Booking Card */}
          <div className="w-[100%] lg:w-[35%]">
            <div className="sticky top-[100px]">
              {/* Price Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-[1.5rem] mb-[1.5rem]">
                <div className="mb-[1rem]">
                  <span className="text-[0.875rem] text-gray-500">Price per month</span>
                  <div className="flex items-baseline gap-[0.25rem]">
                    <span className="text-[2rem] font-bold" style={{ color: "#e8756a" }}>
                      {listing.price || '₱ 4,000'}
                    </span>
                    <span className="text-[0.875rem] text-gray-500">/month</span>
                  </div>
                </div>

                <div className="space-y-[0.75rem] mb-[1.5rem]">
                  <div className="flex justify-between">
                    <span className="text-[0.875rem] text-gray-600">Security Deposit</span>
                    <span className="text-[0.875rem] font-medium text-gray-800">₱ {parseInt(listing.price?.replace(/[^0-9]/g, '') || '4000')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[0.875rem] text-gray-600">Availability</span>
                    <span className="text-[0.875rem] font-medium text-green-600">Immediate</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[0.875rem] text-gray-600">Lease Term</span>
                    <span className="text-[0.875rem] font-medium text-gray-800">12 Months</span>
                  </div>
                </div>

                <button 
                  onClick={() => setShowApplicationModal(true)}
                  className="w-[100%] py-[0.875rem] text-white font-semibold rounded-lg transition hover:opacity-90 mb-[0.75rem]"
                  style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
                >
                  Apply Now
                </button>
                <button className="w-[100%] py-[0.875rem] border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">
                  Contact Now
                </button>
              </div>

              {/* Host Information */}
              <div className="bg-white rounded-xl border border-gray-200 p-[1.5rem]">
                <h3 className="text-[1rem] font-semibold text-gray-800 mb-[1rem]">Hosted by</h3>
                <div className="flex items-center gap-[1rem] mb-[1rem]">
                  <div className="w-[3.5rem] h-[3.5rem] bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-[1.25rem]">V</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">ViewxRent Host</p>
                    <p className="text-[0.75rem] text-gray-500">Verified Partner</p>
                  </div>
                </div>
                <div className="flex gap-[0.5rem] mb-[1rem]">
                  <button className="flex-1 py-[0.5rem] border border-gray-200 rounded-lg text-[0.875rem] text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-[0.5rem]">
                    <MessageCircle size={16} />
                    Message
                  </button>
                  <button className="flex-1 py-[0.5rem] border border-gray-200 rounded-lg text-[0.875rem] text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-[0.5rem]">
                    <Phone size={16} />
                    Call
                  </button>
                </div>
                <div className="border-t border-gray-100 pt-[1rem]">
                  <p className="text-[0.75rem] text-gray-500">Response time: Within 1 hour</p>
                </div>
              </div>

              {/* Booked Status */}
              <div className="mt-[1rem] bg-green-50 rounded-lg p-[0.75rem] flex items-center gap-[0.5rem]">
                <Check size={16} className="text-green-600" />
                <span className="text-[0.75rem] text-green-700">{listing.reviews || 15} people have booked this unit</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      <ApplicationModal
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        unitTitle={listing.title || 'Studio type apartment'}
        unitPrice={listing.price || '₱ 4,000'}
        onSubmit={handleApplicationSubmit}
      />
    </div>
  );
}