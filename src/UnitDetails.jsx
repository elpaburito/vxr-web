import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Home, Bell, ArrowLeft, Heart, MapPin, Check, X, Wifi, Wind,
  Coffee, Car, Shield, Star, Bed, Bath, Square,
  Phone, MessageCircle, ImageOff, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, Maximize2,
} from "lucide-react";
import { GoogleMap, useJsApiLoader, MarkerF } from "@react-google-maps/api";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import ApplicationModal from "./components/ApplicationModal.jsx";
import ImageLightbox from "./components/ImageLightbox.jsx";
import { useWishlist } from "./context/WishlistContext.jsx";
import { fetchListingById } from "./lib/listingsService";

const MAP_LIBRARIES = ["places"];

const AMENITY_ICON = {
  "Air Conditioning": Wind,
  "WiFi": Wifi,
  "Kitchen": Coffee,
  "Parking": Car,
  "CCTV": Shield,
  "No Smoking": Shield,
  "Balcony": Home,
  "Swimming Pool": Home,
  "Water Tank": Home,
  "Seating Spot": Home,
};

export default function UnitDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchListingById(id).then(({ data, error }) => {
      if (error) setError(error);
      setListing(data);
      setLoading(false);
      if (data && isInWishlist(data.id)) setLiked(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleLogout = () => {
    setDropdownOpen(false);
    navigate("/");
  };

  const toggleLike = () => {
    if (!listing) return;
    if (liked) removeFromWishlist(listing.id);
    else addToWishlist(listing);
    setLiked(!liked);
  };

  const handleApplicationSubmit = () => {
    alert("Application submitted. The landlord will review your application.");
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading listing...
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle size={28} className="text-gray-400" />
        <h2 className="font-semibold text-gray-800">Listing not found</h2>
        <p className="text-sm text-gray-500 max-w-md">
          {error?.message || "This listing doesn't exist or has been removed."}
        </p>
        <button
          onClick={() => navigate("/search")}
          className="mt-2 px-4 py-2 bg-[#EC6138] text-white rounded-lg hover:opacity-90"
        >
          Browse listings
        </button>
      </div>
    );
  }

  const images = listing.images && listing.images.length > 0 ? listing.images : [];
  // Carousel shows normal photos only (no panorama / 360 media)
  const carouselImages = listing.normalImages && listing.normalImages.length > 0
    ? listing.normalImages
    : images;
  const openLightbox = (url) => {
    if (!url) return;
    const idx = carouselImages.indexOf(url);
    setLightboxIndex(idx >= 0 ? idx : 0);
  };
  const hasLocation = listing.latitude != null && listing.longitude != null;

  return (
    <div className="w-[100%] min-h-[100vh] bg-gray-50 flex flex-col">
      <Header navigate={navigate} dropdownOpen={dropdownOpen} setDropdownOpen={setDropdownOpen} onLogout={handleLogout} />

      <div className="w-[100%] max-w-[80rem] mx-auto px-[1.5rem] py-[1.5rem]">
        <div className="flex flex-col lg:flex-row gap-[2rem]">
          <div className="w-[100%] lg:w-[60%]">
            {/* Cover image (click to open carousel) */}
            <div className="w-[100%] aspect-[16/9] bg-gray-200 rounded-xl overflow-hidden mb-3 relative group">
              {images.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => openLightbox(images[activeImage])}
                    className="absolute inset-0 w-full h-full cursor-zoom-in"
                    aria-label="Open photo gallery"
                  >
                    <img
                      src={images[activeImage]}
                      alt={listing.title}
                      className="w-[100%] h-[100%] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </button>

                  {/* View all photos badge */}
                  {carouselImages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => openLightbox(images[activeImage])}
                      className="absolute bottom-3 right-3 bg-white/95 backdrop-blur text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md hover:bg-white transition flex items-center gap-1.5"
                    >
                      <Maximize2 size={12} />
                      View all photos ({carouselImages.length})
                    </button>
                  )}

                  {/* Inline prev/next (unchanged, doesn't open lightbox) */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImage(i => (i === 0 ? images.length - 1 : i - 1));
                        }}
                        className="absolute top-1/2 left-3 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow hover:bg-white transition opacity-0 group-hover:opacity-100 z-10"
                        aria-label="Previous"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImage(i => (i + 1) % images.length);
                        }}
                        className="absolute top-1/2 right-3 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow hover:bg-white transition opacity-0 group-hover:opacity-100 z-10"
                        aria-label="Next"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-100">
                  <ImageOff size={32} className="text-gray-300" />
                  <span className="text-sm text-gray-400">No photos uploaded yet</span>
                </div>
              )}
            </div>

            {/* Thumbnails: click to switch main; double-click (or click the "View all" button) opens carousel */}
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2 mb-6">
                {images.slice(0, 5).map((url, i) => (
                  <button
                    key={url}
                    onClick={() => setActiveImage(i)}
                    onDoubleClick={() => openLightbox(url)}
                    className={`aspect-[4/3] rounded-lg overflow-hidden border-2 transition ${activeImage === i ? "border-[#EC6138]" : "border-transparent"}`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Title */}
            <div className="mb-[1.5rem]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-[0.5rem] mb-[0.5rem]">
                    <span className="text-[0.875rem] text-gray-500 capitalize">{listing.propertyType || "Property"}</span>
                    {listing.city && (
                      <>
                        <span className="text-[0.875rem] text-gray-300">·</span>
                        <span className="text-[0.875rem] text-gray-500">{listing.city}</span>
                      </>
                    )}
                  </div>
                  <h1 className="text-[1.75rem] font-bold text-gray-800 mb-[0.5rem]">
                    {listing.title}
                  </h1>
                  {listing.rating > 0 && (
                    <div className="flex items-center gap-[0.5rem]">
                      <Star size={16} fill="#FBBF24" stroke="#FBBF24" />
                      <span className="text-[0.875rem] font-medium text-gray-700">{listing.rating}</span>
                      <span className="text-[0.75rem] text-gray-400">({listing.reviews} reviews)</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={toggleLike}
                  className="p-[0.5rem] bg-white rounded-full shadow-md hover:shadow-lg transition flex-shrink-0"
                >
                  <Heart size={22} fill={liked ? "#EC6138" : "none"} stroke={liked ? "#EC6138" : "#666"} />
                </button>
              </div>
            </div>

            {/* Quick facts */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Fact icon={Bed} label={`${listing.bedrooms} ${listing.bedrooms === 1 ? "Bedroom" : "Bedrooms"}`} />
              <Fact icon={Bath} label={`${listing.bathrooms} ${listing.bathrooms === 1 ? "Bathroom" : "Bathrooms"}`} />
              <Fact icon={Square} label={listing.area ? `${listing.area} m²` : "—"} />
            </div>

            {/* About */}
            <Card title="About this place">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {listing.aboutPlace || "No description provided yet."}
              </p>
              {listing.unitDetails && (
                <>
                  <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-1">Unit details</h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{listing.unitDetails}</p>
                </>
              )}
            </Card>

            {/* Amenities */}
            {listing.amenities && listing.amenities.length > 0 && (
              <Card title="What this property offers">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-[0.75rem]">
                  {listing.amenities.map((amenity) => {
                    const Icon = AMENITY_ICON[amenity] || Check;
                    return (
                      <div key={amenity} className="flex items-center gap-[0.5rem]">
                        <Icon size={16} className="text-[#e8756a]" />
                        <span className="text-[0.8rem] text-gray-600">{amenity}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Rules */}
            <Card title="Rental Rules & Policies">
              <div className="grid grid-cols-2 gap-[1rem]">
                <Rule label="Pet Policy" value={listing.petPolicy || "—"} bad={listing.petPolicy === "No Pets"} />
                <Rule label="Smoking" value={listing.smokingPolicy || "—"} bad={listing.smokingPolicy === "No"} />
                <Rule label="Guest Policy" value={listing.guestPolicy || "—"} />
                <Rule label="Curfew" value={listing.curfew || "—"} />
              </div>
            </Card>

            {/* Location */}
            <Card title="Location">
              <div className="flex items-start gap-[0.5rem] mb-[1rem]">
                <MapPin size={18} className="text-[#e8756a] mt-[0.125rem] flex-shrink-0" />
                <p className="text-[0.875rem] text-gray-600">
                  {listing.fullAddress || listing.location || "Address not provided"}
                </p>
              </div>
              <div className="w-[100%] h-[14rem] bg-gray-200 rounded-lg overflow-hidden">
                {hasLocation ? (
                  <MapSection lat={listing.latitude} lng={listing.longitude} title={listing.title} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400 bg-gray-50">
                    <MapPin size={24} />
                    <span className="text-xs">No map coordinates for this listing</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div className="w-[100%] lg:w-[35%]">
            <div className="sticky top-[100px] space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-[1.5rem]">
                <div className="mb-[1rem]">
                  <span className="text-[0.875rem] text-gray-500">Price per month</span>
                  <div className="flex items-baseline gap-[0.25rem]">
                    <span className="text-[2rem] font-bold" style={{ color: "#e8756a" }}>
                      {listing.price || "₱—"}
                    </span>
                    <span className="text-[0.875rem] text-gray-500">/month</span>
                  </div>
                </div>

                <div className="space-y-[0.75rem] mb-[1.5rem] text-sm">
                  {listing.securityDeposit && (
                    <Row label="Security Deposit" value={`₱${Number(listing.securityDeposit).toLocaleString()}`} />
                  )}
                  {listing.advancePayment && (
                    <Row label="Advance Payment" value={`₱${Number(listing.advancePayment).toLocaleString()}`} />
                  )}
                  {listing.paymentTerms && (
                    <Row label="Payment Terms" value={listing.paymentTerms} />
                  )}
                  <Row
                    label="Availability"
                    value={listing.availability === "immediate" ? "Immediate" : listing.availableFrom || "Future"}
                    highlight
                  />
                  {listing.leaseTerm && <Row label="Lease Term" value={`${listing.leaseTerm} Months`} />}
                </div>

                <button
                  onClick={() => setShowApplicationModal(true)}
                  className="w-[100%] py-[0.875rem] text-white font-semibold rounded-lg transition hover:opacity-90 mb-[0.75rem]"
                  style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
                >
                  Apply Now
                </button>
                <button className="w-[100%] py-[0.875rem] border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">
                  Contact Host
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-[1.5rem]">
                <h3 className="text-[1rem] font-semibold text-gray-800 mb-[1rem]">Hosted by</h3>
                <div className="flex items-center gap-[1rem] mb-[1rem]">
                  <div className="w-[3.5rem] h-[3.5rem] bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-[1.25rem]">
                      {(listing.hostName || "V").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{listing.hostName || "ViewxRent Host"}</p>
                    <p className="text-[0.75rem] text-gray-500">{listing.hostRole || "Verified Partner"}</p>
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
                  <p className="text-[0.75rem] text-gray-500">Response time: {listing.responseTime || "Usually within a day"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ApplicationModal
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        unitTitle={listing.title}
        unitPrice={listing.price}
        onSubmit={handleApplicationSubmit}
      />

      <ImageLightbox
        images={carouselImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-[1.5rem] mb-[1.5rem]">
      <h2 className="text-[1.25rem] font-semibold text-gray-800 mb-[1rem]">{title}</h2>
      {children}
    </div>
  );
}

function Fact({ icon: Icon, label }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
      <Icon size={16} className="text-[#e8756a]" />
      <span className="text-[0.85rem] text-gray-700">{label}</span>
    </div>
  );
}

function Rule({ label, value, bad }) {
  return (
    <div>
      <h3 className="text-[0.875rem] font-semibold text-gray-600 mb-[0.25rem]">{label}</h3>
      <p className="text-[0.875rem] text-gray-500 flex items-center gap-[0.5rem]">
        {bad ? <X size={14} className="text-red-500" /> : <Check size={14} className="text-emerald-500" />}
        {value}
      </p>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className={`font-medium ${highlight ? "text-emerald-600" : "text-gray-800"}`}>{value}</span>
    </div>
  );
}

function MapSection({ lat, lng, title }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "vxr-google-map",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: MAP_LIBRARIES,
  });

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 px-6 text-center">
        Map failed to load. Check that your Maps API key has Maps JavaScript API enabled.
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
        <Loader2 className="animate-spin mr-2" size={14} /> Loading map...
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={{ lat, lng }}
      zoom={15}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
    >
      <MarkerF position={{ lat, lng }} title={title} />
    </GoogleMap>
  );
}

function Header({ navigate, dropdownOpen, setDropdownOpen, onLogout }) {
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
            <span style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: "50%", background: "#ff3b30", border: "1.5px solid #f0a090" }} />
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
            }}>U</div>
            <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid #222" }} />
          </button>
          {dropdownOpen && <ProfileDropdown onLogout={onLogout} />}
        </div>
      </div>
    </nav>
  );
}
