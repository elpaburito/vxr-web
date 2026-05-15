import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Home, Heart, MapPin, Check, X, Wifi, Wind,
  Coffee, Car, Shield, Star, Bed, Bath, Square,
  MessageCircle, ImageOff, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, Maximize2, Lock,
} from "lucide-react";
import { GoogleMap, useJsApiLoader, MarkerF } from "@react-google-maps/api";
import ApplicationModal from "./components/ApplicationModal.jsx";
import ImageLightbox from "./components/ImageLightbox.jsx";
import AppHeader from "./components/AppHeader.jsx";
import IdentityVerificationModal from "./components/IdentityVerificationModal.jsx";
import { useWishlist } from "./context/WishlistContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { fetchListingById, fetchHostProfile } from "./lib/listingsService";
import { submitApplication } from "./lib/applicationsService";
import { getOrCreateConversation } from "./lib/messagingService";
import {
  Card, Button, Tabs, Badge, Avatar as VxrAvatar,
} from "./components/vxr";
import { statusBadge } from "./components/MyListingCard.jsx";
import Footer from "./Footer.jsx";

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
  const [listing, setListing] = useState(null);
  const [hostProfile, setHostProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { user, profile, refreshProfile } = useAuth();
  const [appSubmitting, setAppSubmitting] = useState(false);
  const [appError, setAppError] = useState(null);
  const [imgErrors, setImgErrors] = useState({});
  const [openingChat, setOpeningChat] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const isOwner = !!user && !!listing?.ownerId && user.id === listing.ownerId;

  const handleMessageHost = async () => {
    if (!user) { navigate("/login"); return; }
    if (!listing?.ownerId || isOwner) return;
    setOpeningChat(true);
    try {
      const { data, error } = await getOrCreateConversation(
        user.id,
        listing.ownerId,
        listing.id
      );
      if (error || !data?.id) {
        alert(error?.message || "Could not start conversation.");
        return;
      }
      navigate(`/messages?c=${data.id}`);
    } finally {
      setOpeningChat(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchListingById(id).then(({ data, error }) => {
      if (error) setError(error);
      setListing(data);
      setLoading(false);
      if (data && isInWishlist(data.id)) setLiked(true);
      if (data?.ownerId) {
        fetchHostProfile(data.ownerId).then(({ data: profile }) => {
          setHostProfile(profile);
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleLike = () => {
    if (!listing) return;
    if (liked) removeFromWishlist(listing.id);
    else addToWishlist(listing);
    setLiked(!liked);
  };

  const handleApplicationSubmit = async (formData) => {
    if (!user) {
      navigate("/login");
      return;
    }
    setAppSubmitting(true);
    setAppError(null);
    try {
      const documentFiles = {
        validIdFront: formData.validIdFront instanceof File ? formData.validIdFront : null,
        validIdBack: formData.validIdBack instanceof File ? formData.validIdBack : null,
        proofOfIncome: formData.proofOfIncome instanceof File ? formData.proofOfIncome : null,
      };
      const { error } = await submitApplication({
        listingId: listing.id,
        tenantId: user.id,
        landlordId: listing.ownerId ?? null,
        formData,
        documentFiles,
      });
      if (error) {
        setAppError(error.message || "Failed to submit. Please try again.");
        return;
      }
      alert("Application submitted! The landlord will review and get back to you.");
      setShowApplicationModal(false);
    } catch (err) {
      setAppError(err?.message || "Unexpected error.");
    } finally {
      setAppSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-vxr-bg flex items-center justify-center font-body text-vxr-text-sub">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading listing...
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="w-full min-h-screen bg-vxr-bg flex flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle size={28} className="text-vxr-text-muted" />
        <h2 className="font-display font-bold text-vxr-text">Listing not found</h2>
        <p className="font-body text-sm text-vxr-text-sub max-w-md">
          {error?.message || "This listing doesn't exist or has been removed."}
        </p>
        <Button onClick={() => navigate("/search")} className="mt-2">
          Browse listings
        </Button>
      </div>
    );
  }

  const markImgError = (idx) => setImgErrors((prev) => ({ ...prev, [idx]: true }));
  const images = listing.images && listing.images.length > 0 ? listing.images : [];
  const carouselImages =
    listing.normalImages && listing.normalImages.length > 0
      ? listing.normalImages
      : images;
  const openLightbox = (url) => {
    if (!url) return;
    const idx = carouselImages.indexOf(url);
    setLightboxIndex(idx >= 0 ? idx : 0);
  };
  const hasLocation = listing.latitude != null && listing.longitude != null;
  const hostDisplayName = hostProfile?.full_name || listing.hostName || "ViewxRent Host";
  const hostAvatarUrl = hostProfile?.avatar_url || null;
  const verified = !!listing.isVerified;
  const active = listing.status === "active";
  const userVerified = !!profile?.is_verified;
  const canApply = verified && active && userVerified;
  const reason = !active
    ? "This listing is not currently accepting applications."
    : !verified
    ? "Pending verification — applications will open once an admin verifies this listing."
    : "Verify your identity to apply for this listing.";

  const handleApplyClick = () => {
    if (!user) { navigate("/login"); return; }
    if (!verified || !active) return; // gate by listing state — button title shows why
    if (!userVerified) {
      setShowVerifyModal(true);
      return;
    }
    setShowApplicationModal(true);
  };

  const tabs = [
    { id: "details", label: "Details" },
    { id: "amenities", label: "Amenities" },
    { id: "location", label: "Location" },
    { id: "rules", label: "Rules" },
  ];

  return (
    <div className="w-full min-h-screen bg-vxr-bg flex flex-col">
      <AppHeader showBack />

      <div className="w-full max-w-7xl mx-auto px-6 py-6">
        {/* Image grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 rounded-vxr-xl overflow-hidden">
          <div className="md:col-span-2 aspect-[16/10] bg-vxr-surface2 relative group rounded-vxr-md overflow-hidden">
            {images.length > 0 && !imgErrors[activeImage] ? (
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
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    onError={() => markImgError(activeImage)}
                  />
                </button>
                {carouselImages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => openLightbox(images[activeImage])}
                    className="absolute bottom-3 right-3 bg-white/95 backdrop-blur font-body text-xs font-semibold px-3 py-1.5 rounded-full shadow-vxr-md hover:bg-white transition flex items-center gap-1.5 text-vxr-text"
                  >
                    <Maximize2 size={12} />
                    View all photos ({carouselImages.length})
                  </button>
                )}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImage((i) => (i === 0 ? images.length - 1 : i - 1));
                      }}
                      className="absolute top-1/2 left-3 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow-vxr-sm hover:bg-white transition opacity-0 group-hover:opacity-100 z-10"
                      aria-label="Previous"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImage((i) => (i + 1) % images.length);
                      }}
                      className="absolute top-1/2 right-3 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow-vxr-sm hover:bg-white transition opacity-0 group-hover:opacity-100 z-10"
                      aria-label="Next"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-vxr-surface2">
                <ImageOff size={32} className="text-vxr-text-muted" />
                <span className="font-body text-sm text-vxr-text-muted">No photos uploaded yet</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {images.slice(1, 5).map((url, i) => {
              const idx = i + 1;
              const isLast = i === 3 && images.length > 5;
              return (
                <button
                  key={url + i}
                  onClick={() => {
                    setActiveImage(idx);
                    if (isLast) openLightbox(url);
                  }}
                  className="aspect-square rounded-vxr-md overflow-hidden relative group"
                >
                  {imgErrors[idx] ? (
                    <div className="w-full h-full bg-vxr-surface2 flex items-center justify-center">
                      <ImageOff size={16} className="text-vxr-text-muted" />
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onError={() => markImgError(idx)}
                    />
                  )}
                  {isLast && (
                    <div className="absolute inset-0 bg-black/55 flex items-center justify-center font-display font-bold text-white">
                      +{images.length - 5} more
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column */}
          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge tone="neutral">{listing.propertyType || "Property"}</Badge>
                    {verified && <Badge tone="success">Verified</Badge>}
                    {listing.status && (
                      <Badge tone={statusBadge(listing.status).tone}>
                        {statusBadge(listing.status).label}
                      </Badge>
                    )}
                  </div>
                  <h1 className="font-display text-3xl font-extrabold text-vxr-text tracking-tight">
                    {listing.title}
                  </h1>
                  <div className="flex items-center gap-3 mt-2 font-body text-sm text-vxr-text-sub">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={14} className="text-vxr-accent" />
                      {listing.fullAddress || listing.location || "Location unspecified"}
                    </span>
                    {listing.rating > 0 && (
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-vxr-text">
                        <Star size={14} className="text-vxr-accent" fill="#FF7043" />
                        {listing.rating}
                        <span className="font-body font-normal text-vxr-text-muted">
                          ({listing.reviews} reviews)
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={toggleLike}
                  className="w-11 h-11 bg-vxr-surface rounded-full shadow-vxr-sm border border-vxr-border hover:shadow-vxr-md transition flex items-center justify-center flex-shrink-0"
                >
                  <Heart
                    size={20}
                    className="text-vxr-accent"
                    fill={liked ? "#FF7043" : "none"}
                  />
                </button>
              </div>
            </div>

            {/* Spec strip */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <SpecTile icon={Bed} label="Bedrooms" value={listing.bedrooms || "—"} />
              <SpecTile icon={Bath} label="Bathrooms" value={listing.bathrooms || "—"} />
              <SpecTile
                icon={Square}
                label="Area"
                value={listing.area ? `${listing.area} m²` : "—"}
              />
              <SpecTile
                icon={Home}
                label="Type"
                value={listing.propertyType || "—"}
              />
            </div>

            <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} className="mb-6" />

            {activeTab === "details" && (
              <div className="space-y-4">
                <Card className="p-6">
                  <h3 className="font-display text-lg font-extrabold text-vxr-text mb-3">
                    About this place
                  </h3>
                  <p className="font-body text-sm text-vxr-text leading-relaxed whitespace-pre-wrap">
                    {listing.aboutPlace || "No description provided yet."}
                  </p>
                  {listing.unitDetails && (
                    <>
                      <h4 className="font-display text-sm font-bold text-vxr-text mt-4 mb-1">
                        Unit details
                      </h4>
                      <p className="font-body text-sm text-vxr-text leading-relaxed whitespace-pre-wrap">
                        {listing.unitDetails}
                      </p>
                    </>
                  )}
                </Card>
              </div>
            )}

            {activeTab === "amenities" && (
              <Card className="p-6">
                <h3 className="font-display text-lg font-extrabold text-vxr-text mb-4">
                  What this property offers
                </h3>
                {listing.amenities && listing.amenities.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {listing.amenities.map((amenity) => {
                      const Icon = AMENITY_ICON[amenity] || Check;
                      return (
                        <div key={amenity} className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-vxr-sm bg-vxr-accent-soft flex items-center justify-center shrink-0">
                            <Icon size={14} className="text-vxr-accent" />
                          </div>
                          <span className="font-body text-sm text-vxr-text">{amenity}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="font-body text-sm text-vxr-text-muted">
                    No amenities listed yet.
                  </p>
                )}
              </Card>
            )}

            {activeTab === "location" && (
              <Card className="p-6">
                <h3 className="font-display text-lg font-extrabold text-vxr-text mb-3">
                  Location
                </h3>
                <div className="flex items-start gap-2 mb-4">
                  <MapPin size={18} className="text-vxr-accent mt-0.5 flex-shrink-0" />
                  <p className="font-body text-sm text-vxr-text">
                    {listing.fullAddress || listing.location || "Address not provided"}
                  </p>
                </div>
                <div className="w-full h-56 bg-vxr-surface2 rounded-vxr-md overflow-hidden">
                  {hasLocation ? (
                    <MapSection
                      lat={listing.latitude}
                      lng={listing.longitude}
                      title={listing.title}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-vxr-text-muted">
                      <MapPin size={24} />
                      <span className="font-body text-xs">
                        No map coordinates for this listing
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {activeTab === "rules" && (
              <Card className="p-6">
                <h3 className="font-display text-lg font-extrabold text-vxr-text mb-4">
                  Rental Rules & Policies
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Rule
                    label="Pet Policy"
                    value={listing.petPolicy || "—"}
                    bad={listing.petPolicy === "No Pets"}
                  />
                  <Rule
                    label="Smoking"
                    value={listing.smokingPolicy || "—"}
                    bad={listing.smokingPolicy === "No"}
                  />
                  <Rule label="Guest Policy" value={listing.guestPolicy || "—"} />
                  <Rule label="Curfew" value={listing.curfew || "—"} />
                </div>
              </Card>
            )}

            {/* Landlord card */}
            <Card className="p-6 mt-6">
              <h3 className="font-display text-lg font-extrabold text-vxr-text mb-4">
                Hosted by
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <VxrAvatar
                  name={hostDisplayName}
                  src={hostAvatarUrl}
                  gradient
                  size={56}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-bold text-vxr-text">
                      {hostDisplayName}
                    </p>
                    <Badge tone="success" icon={Shield}>
                      Verified
                    </Badge>
                  </div>
                  <p className="font-body text-xs text-vxr-text-sub mt-0.5">
                    {listing.hostRole || "Verified Partner"}
                  </p>
                  <p className="font-body text-xs text-vxr-text-muted mt-1">
                    Response time: {listing.responseTime || "Usually within a day"}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={MessageCircle}
                  disabled={isOwner || openingChat}
                  onClick={handleMessageHost}
                >
                  {openingChat ? "Opening…" : "Message"}
                </Button>
              </div>
            </Card>
          </div>

          {/* Right column — sticky booking card */}
          <div className="w-full lg:w-[380px] shrink-0">
            <div className="sticky top-24 space-y-4">
              <Card className="p-6">
                <div className="mb-4">
                  <span className="font-body text-sm text-vxr-text-sub">
                    Price per month
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-3xl font-extrabold text-vxr-accent">
                      {listing.price || "₱—"}
                    </span>
                    <span className="font-body text-sm text-vxr-text-sub">/month</span>
                  </div>
                </div>

                <div className="space-y-2.5 mb-5 font-body text-sm">
                  {listing.securityDeposit && (
                    <Row
                      label="Security Deposit"
                      value={`₱${Number(listing.securityDeposit).toLocaleString()}`}
                    />
                  )}
                  {listing.advancePayment && (
                    <Row
                      label="Advance Payment"
                      value={`₱${Number(listing.advancePayment).toLocaleString()}`}
                    />
                  )}
                  {listing.paymentTerms && (
                    <Row label="Payment Terms" value={listing.paymentTerms} />
                  )}
                  <Row
                    label="Availability"
                    value={
                      listing.availability === "immediate"
                        ? "Immediate"
                        : listing.availableFrom || "Future"
                    }
                    highlight
                  />
                  {listing.leaseTerm && (
                    <Row label="Lease Term" value={`${listing.leaseTerm} Months`} />
                  )}
                </div>

                {!isOwner && (
                  <>
                    <Button
                      fullWidth
                      disabled={!verified || !active}
                      title={canApply ? "" : reason}
                      onClick={handleApplyClick}
                      className="mb-2"
                    >
                      {!active
                        ? "Not Accepting Applications"
                        : !verified
                        ? "Pending Verification"
                        : !userVerified
                        ? "Verify Identity to Apply"
                        : "Apply Now"}
                    </Button>
                    {!canApply && (
                      <p className="font-body text-xs text-vxr-text-muted mb-2 text-center">
                        {reason}
                      </p>
                    )}
                    <Button
                      fullWidth
                      variant="secondary"
                      icon={MessageCircle}
                      disabled={isOwner || openingChat}
                      onClick={handleMessageHost}
                    >
                      {openingChat ? "Opening…" : "Contact Host"}
                    </Button>
                  </>
                )}
                {isOwner && (
                  <p className="w-full py-3 text-center font-body text-sm text-vxr-text-sub bg-vxr-surface2 rounded-vxr-md">
                    This is your listing.
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2 bg-vxr-success-soft text-vxr-success rounded-vxr-md px-3 py-2 font-body text-xs">
                  <Lock size={12} />
                  Free cancellation up to 48 hours before move-in.
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <ApplicationModal
        isOpen={showApplicationModal}
        onClose={() => {
          setShowApplicationModal(false);
          setAppError(null);
        }}
        unitTitle={listing.title}
        unitPrice={listing.price}
        onSubmit={handleApplicationSubmit}
        submitting={appSubmitting}
        submitError={appError}
      />

      <IdentityVerificationModal
        open={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        onDone={() => {
          refreshProfile?.();
        }}
      />

      <ImageLightbox
        images={carouselImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
      <Footer />
    </div>
  );
}

function SpecTile({ icon: Icon, label, value }) {
  return (
    <div className="bg-vxr-surface border border-vxr-border rounded-vxr-md px-3 py-3 flex items-center gap-2">
      <div className="w-9 h-9 rounded-vxr-sm bg-vxr-accent-soft flex items-center justify-center">
        <Icon size={16} className="text-vxr-accent" />
      </div>
      <div className="min-w-0">
        <div className="font-body text-[10px] uppercase tracking-wider text-vxr-text-muted">
          {label}
        </div>
        <div className="font-display text-sm font-bold text-vxr-text truncate">
          {value}
        </div>
      </div>
    </div>
  );
}

function Rule({ label, value, bad }) {
  return (
    <div>
      <h4 className="font-body text-sm font-semibold text-vxr-text-sub mb-1">{label}</h4>
      <p className="font-body text-sm text-vxr-text flex items-center gap-2">
        {bad ? (
          <X size={14} className="text-vxr-danger" />
        ) : (
          <Check size={14} className="text-vxr-success" />
        )}
        {value}
      </p>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between">
      <span className="text-vxr-text-sub">{label}</span>
      <span
        className={`font-medium ${
          highlight ? "text-vxr-success" : "text-vxr-text"
        }`}
      >
        {value}
      </span>
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
      <div className="w-full h-full flex items-center justify-center font-body text-xs text-vxr-text-sub px-6 text-center">
        Map failed to load. Check that your Maps API key has Maps JavaScript API enabled.
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center font-body text-xs text-vxr-text-sub">
        <Loader2 className="animate-spin mr-2" size={14} /> Loading map...
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={{ lat, lng }}
      zoom={15}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      <MarkerF position={{ lat, lng }} title={title} />
    </GoogleMap>
  );
}
