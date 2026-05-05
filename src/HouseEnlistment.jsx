import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Info, Home,
  FileEdit, Camera as CameraIcon, Rocket,
  Users, ShieldCheck, LayoutDashboard, BadgeDollarSign,
  CheckCircle2, PlusCircle,
  MapPin, Upload, Image as ImageIcon, X, Bell,
  Loader2, AlertCircle, Crosshair, Search,
  Hourglass, ShieldAlert,
  Repeat, FileSignature,
  Eye, FileText, Trash2, ExternalLink,
  RotateCcw, Edit3, ChevronDown, ChevronUp,
} from "lucide-react";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import PsgcLocationField from "./components/PsgcLocationField.jsx";
import MapAddressPicker from "./components/MapAddressPicker.jsx";
import ContractTemplatePreview from "./components/ContractTemplatePreview.jsx";
import { resolveTerms, defaultTermsForType } from "./lib/contractTemplates.js";
import { useAuth } from "./context/AuthContext.jsx";
import {
  fetchListingById,
  createListing,
  updateListing,
  uploadListingImages,
  saveListingImageRecords,
  deleteListingImageRecord,
  uploadContractTemplate,
  deleteContractTemplate,
  getContractTemplateSignedUrl,
} from "./lib/listingsService";
import { getVerificationStatus } from "./lib/profileService";

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const BRAND   = "#F36C6C";
const DARK    = "#E85D5D";
const INK     = "#1A1A2E";
const MUTED   = "#6B7280";
const BG      = "#F5F5F5";

// ─── Intro-page data ───────────────────────────────────────────────────────────
const HOW_STEPS = [
  { number: "1", title: "Fill in Property Details", description: "Provide your property information, location, amenities, and pricing.", Icon: FileEdit },
  { number: "2", title: "Upload Photos", description: "Add high-quality photos of your property to attract potential tenants.", Icon: CameraIcon },
  { number: "3", title: "Publish & Get Tenants", description: "Your listing goes live and tenants can apply to rent your property.", Icon: Rocket },
];

const BENEFITS = [
  { Icon: Users,           title: "Reach More Tenants",    subtitle: "Thousands of active renters searching daily" },
  { Icon: ShieldCheck,     title: "Verified Applicants",   subtitle: "Tenant applications with ID and background info" },
  { Icon: LayoutDashboard, title: "Easy Management",       subtitle: "Manage listings, applications, and tenants in one place" },
  { Icon: BadgeDollarSign, title: "No Listing Fees",       subtitle: "List your property completely free of charge" },
];

const REQUIREMENTS = [
  "Property title and description",
  "Complete address and location",
  "Rental price and payment terms",
  "Photos of the property",
  "Amenities and house rules",
];

// ─── Form constants ────────────────────────────────────────────────────────────
const DEFAULT_FORM = {
  title: "", status: "active",
  // Listing type — drives rules / terms / contract template (mobile parity).
  listingType: "lease",
  // Region/province/city/barangay come from PSGC; we still keep the four
  // human-readable strings so the existing save path (city/province/barangay
  // text) keeps working unchanged.
  region: "", city: "", province: "", address: "", barangay: "", postalCode: "",
  propertyType: "", furnishing: "",
  bedrooms: "", bathrooms: "", area: "", maxOccupants: "",
  monthlyRent: "", securityDeposit: "", advancePayment: "",
  paymentTerms: "", paymentMethod: "",
  availability: "immediate", availableFrom: "", leaseTerm: "12",
  aboutPlace: "", unitDetails: "",
  // Appliance amenities
  amenities: [],
  // Utilities (Water / Electricity / Internet / Parking) — stored as
  // amenity labels so listingsService's AMENITY_TO_FLAG routes them to
  // listing_utilities.with_water/with_electricity/with_internet/with_parking.
  utilities: [],
  // Building features — same routing strategy via AMENITY_TO_FLAG to
  // listing_building_features.has_*.
  buildingFeatures: [],
  petPolicy: "No Pets", smokingPolicy: "No", guestPolicy: "Day/Nite Only", curfew: "No Curfew",
  sublettingAllowed: false, modificationAllowed: false,
  hostName: "", hostRole: "", responseTime: "Within 1 Hour",
  latitude: "", longitude: "",
  // Contract template — null until the landlord uploads a custom file.
  // contractTemplateUrl is the storage path inside the listing-contracts
  // bucket; contractTemplateName is the original filename for display.
  contractTemplateUrl: null,
  contractTemplateName: null,
  // termsOverride: null means use the built-in default; array means custom clauses.
  termsOverride: null,
};

// Appliance amenities → AMENITY_TO_FLAG (listing_amenities + listing_details)
const AMENITIES_LIST = [
  "Air Conditioning", "Bed", "Cabinet", "Refrigerator", "Stove",
  "Washing Machine", "Water Heater", "Balcony", "Storage",
];

// Utility amenity labels → listing_utilities flags
const UTILITY_LABELS = [
  ["Water Included",      "Water"],
  ["Electricity Included","Electricity"],
  ["WiFi",                "Internet"],
  ["Parking",             "Parking"],
];

// Building feature labels → listing_building_features flags
const BUILDING_FEATURES = [
  "Security", "Elevator", "Backup Power", "Swimming Pool",
  "Gym", "Laundry Area", "Function Hall", "Playground",
];

// ─── Intro sub-components ──────────────────────────────────────────────────────
function HowStep({ step, isLast }) {
  return (
    <>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base text-white" style={{ background: BRAND }}>
          {step.number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-[15px]" style={{ color: INK }}>{step.title}</p>
            <step.Icon size={20} color={BRAND} className="flex-shrink-0" />
          </div>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: MUTED }}>{step.description}</p>
        </div>
      </div>
      {!isLast && <div className="ml-4 my-1 w-0.5 h-5" style={{ background: `${BRAND}4D` }} />}
    </>
  );
}

function BenefitTile({ benefit }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0 rounded-xl p-2.5" style={{ background: `${BRAND}1A` }}>
        <benefit.Icon size={22} color={BRAND} />
      </div>
      <div>
        <p className="font-semibold text-sm" style={{ color: INK }}>{benefit.title}</p>
        <p className="text-xs mt-0.5" style={{ color: MUTED }}>{benefit.subtitle}</p>
      </div>
    </div>
  );
}

// ─── Form sub-components ───────────────────────────────────────────────────────
function FormCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 rounded-full" style={{ background: BRAND }} />
        <h3 className="text-base font-bold" style={{ color: INK }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FLabel({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition";
const inputStyle = { "--tw-ring-color": `${BRAND}66` };

// ─── Verification gate dialog (mirrors mobile flow) ────────────────────────────
function VerificationDialog({ kind, onClose, onGoToProfile }) {
  const isPending = kind === "pending";
  const Icon = isPending ? Hourglass : ShieldAlert;
  const title = isPending ? "Verification Pending" : "Identity Verification Required";
  const body  = isPending
    ? "Your identity submission is currently being reviewed. You'll be able to create listings once it's approved."
    : "To create a listing, please verify your identity from your profile. This protects both landlords and tenants on ViewxRent.";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-xl p-2.5" style={{ background: `${BRAND}1A` }}>
            <Icon size={22} color={BRAND} />
          </div>
          <h3 className="text-lg font-bold" style={{ color: INK }}>{title}</h3>
        </div>
        <p className="text-sm leading-relaxed mb-5" style={{ color: MUTED }}>{body}</p>
        <div className="flex justify-end gap-2">
          {!isPending && (
            <button
              onClick={onGoToProfile}
              className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition hover:opacity-90"
              style={{ background: BRAND }}
            >
              Go to Profile
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
          >
            {isPending ? "OK" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function HouseEnlistment() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const queryParams = new URLSearchParams(location.search);
  const editId      = queryParams.get("edit");
  const isEditMode  = !!editId;

  // If edit mode → start directly on form; otherwise show intro
  const [view, setView] = useState(isEditMode ? "form" : "intro");

  // ── Form state ──────────────────────────────────────────────────────────────
  const [formData, setFormData]               = useState(DEFAULT_FORM);
  const [existingImages, setExistingImages]   = useState([]);
  const [existingCoverUrl, setExistingCoverUrl] = useState(null);
  const [removedImageIds, setRemovedImageIds] = useState([]);
  const [newImageFiles, setNewImageFiles]     = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // Verification gate (mirrors mobile's ensureVerifiedToCreateListing)
  const [verifyChecking, setVerifyChecking] = useState(false);
  const [verifyDialog,   setVerifyDialog]   = useState(null); // 'pending' | 'required' | null

  const handleStartListing = async () => {
    if (!user?.id) { navigate("/login"); return; }
    setVerifyChecking(true);
    try {
      const { verified, pending } = await getVerificationStatus(user.id);
      if (verified) { setView("form"); return; }
      setVerifyDialog(pending ? "pending" : "required");
    } finally {
      setVerifyChecking(false);
    }
  };

  // Redirect unauthenticated
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  // Load listing when editing.
  // amenities/utilities/buildingFeatures are split apart by category so the
  // matching FormCard checkbox grids show the right initial selections.
  useEffect(() => {
    if (!editId) return;
    setLoading(true);
    fetchListingById(editId).then(({ data, error }) => {
      if (error) setError(error);
      if (data) {
        const allAmenities = data.amenities || [];
        const utilityLabels = UTILITY_LABELS.map(([label]) => label);
        setFormData({
          title: data.title || "", status: data.status === "active" ? "active" : "inactive",
          listingType: data.listingType || data.listing_type || "lease",
          region: "",
          city: data.city || "", province: data.province || "",
          address: data.address || "", barangay: data.barangay || "", postalCode: data.postalCode || "",
          propertyType: data.propertyType || "", furnishing: data.furnishing || "",
          bedrooms: data.bedrooms?.toString() || "", bathrooms: data.bathrooms?.toString() || "",
          area: data.area?.toString() || "", maxOccupants: data.maxOccupants?.toString() || "",
          monthlyRent: data.monthlyRent?.toString() || "",
          securityDeposit: data.securityDeposit?.toString() || "",
          advancePayment: data.advancePayment?.toString() || "",
          paymentTerms: data.paymentTerms || "",
          paymentMethod: data.paymentMethod || "",
          availability: data.availability || "immediate",
          availableFrom: data.availableFrom ? data.availableFrom.slice(0, 10) : "",
          leaseTerm: data.leaseTerm?.toString() || "12",
          aboutPlace: data.aboutPlace || "", unitDetails: data.unitDetails || "",
          amenities:        allAmenities.filter((a) => AMENITIES_LIST.includes(a)),
          utilities:        allAmenities.filter((a) => utilityLabels.includes(a)),
          buildingFeatures: allAmenities.filter((a) => BUILDING_FEATURES.includes(a)),
          petPolicy: data.petPolicy || "No Pets",
          smokingPolicy: data.smokingPolicy || "No",
          guestPolicy: data.guestPolicy || "Day/Nite Only",
          curfew: data.curfew || "No Curfew",
          sublettingAllowed:   !!data.sublettingAllowed,
          modificationAllowed: !!data.modificationAllowed,
          hostName: data.hostName || "", hostRole: data.hostRole || "",
          responseTime: data.responseTime || "Within 1 Hour",
          latitude: data.latitude?.toString() || "",
          longitude: data.longitude?.toString() || "",
          contractTemplateUrl:  data.contractTemplateUrl  ?? null,
          contractTemplateName: data.contractTemplateName ?? null,
          termsOverride:        data.termsOverride         ?? null,
        });
        setExistingImages(data.imageRecords || []);
        setExistingCoverUrl(data.cover ?? null);
      }
      setLoading(false);
    });
  }, [editId]);

  // Revoke blob preview URLs on unmount
  useEffect(() => () => newImagePreviews.forEach(URL.revokeObjectURL), [newImagePreviews]);

  // ── Form handlers ───────────────────────────────────────────────────────────
  // For checkbox inputs we look at `data-group` to know which array to splice
  // (amenities / utilities / buildingFeatures). Plain radios + text/select
  // fall through to the generic `[name]: value` write.
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      const group = e.target.dataset.group || "amenities";
      setFormData((prev) => ({
        ...prev,
        [group]: checked
          ? [...(prev[group] || []), name]
          : (prev[group] || []).filter((a) => a !== name),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // PSGC cascade callback — keep both human-readable strings (so save path
  // continues to work) and reset the address/barangay where appropriate.
  const handlePsgcChange = useCallback((val) => {
    setFormData((prev) => ({
      ...prev,
      region:   val.region?.name   ?? "",
      province: val.province?.name ?? (val.region?.name ?? ""), // NCR has no province → fall back to region
      city:     val.city?.name     ?? "",
      barangay: val.barangay?.name ?? "",
    }));
  }, []);

  // Contract template UI state
  const [contractPreviewOpen, setContractPreviewOpen] = useState(false);
  const [contractUploading, setContractUploading]     = useState(false);
  const [termsEditorOpen, setTermsEditorOpen]         = useState(false);

  // Derive the editable terms array: custom override or built-in defaults.
  const editableTerms = resolveTerms(formData.listingType, formData.termsOverride);
  const hasCustomTerms = Array.isArray(formData.termsOverride) && formData.termsOverride.length > 0;

  const handleTermChange = (index, value) => {
    const updated = [...editableTerms];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, termsOverride: updated }));
  };

  const handleResetTerms = () => {
    if (!window.confirm("Reset all contract clauses back to the ViewxRent defaults?")) return;
    setFormData((prev) => ({ ...prev, termsOverride: null }));
  };

  const handleContractUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!user?.id) { setError(new Error("You must be signed in to upload a contract.")); return; }
    setContractUploading(true);
    try {
      // Replace any existing uploaded contract for this listing.
      if (formData.contractTemplateUrl) {
        await deleteContractTemplate(formData.contractTemplateUrl);
      }
      const { path, name } = await uploadContractTemplate(user.id, file);
      setFormData((prev) => ({
        ...prev,
        contractTemplateUrl:  path,
        contractTemplateName: name,
      }));
    } catch (err) {
      setError(new Error(err?.message || "Could not upload contract."));
    } finally {
      setContractUploading(false);
    }
  };

  const handleContractRemove = async () => {
    if (!formData.contractTemplateUrl) return;
    if (!window.confirm("Remove the uploaded contract template? Tenants will see the default ViewxRent template instead.")) return;
    try {
      await deleteContractTemplate(formData.contractTemplateUrl);
    } catch {
      /* best-effort: still clear the local reference */
    }
    setFormData((prev) => ({ ...prev, contractTemplateUrl: null, contractTemplateName: null }));
  };

  const handleContractOpen = async () => {
    if (!formData.contractTemplateUrl) return;
    const { url, error: urlErr } = await getContractTemplateSignedUrl(formData.contractTemplateUrl);
    if (urlErr || !url) {
      setError(new Error(urlErr?.message || "Could not open the uploaded contract."));
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Map address picker — populates address + admin parts + lat/lng atomically
  const [mapOpen, setMapOpen] = useState(false);
  const handleMapPick = (result) => {
    setFormData((prev) => ({
      ...prev,
      address:    result.full_address || prev.address,
      city:       result.city         || prev.city,
      province:   result.province     || prev.province,
      barangay:   result.barangay     || prev.barangay,
      postalCode: result.postal_code  || prev.postalCode,
      latitude:   result.lat != null ? Number(result.lat).toFixed(6) : prev.latitude,
      longitude:  result.lng != null ? Number(result.lng).toFixed(6) : prev.longitude,
    }));
    setMapOpen(false);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setNewImageFiles((prev) => [...prev, ...files]);
    setNewImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removeExistingImage = (id) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
    setRemovedImageIds((prev) => [...prev, id]);
  };

  const removeNewImage = (index) => {
    setNewImagePreviews((prev) => { URL.revokeObjectURL(prev[index]); return prev.filter((_, i) => i !== index); });
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setError(new Error("Geolocation not supported")); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({ ...prev, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setGeoLoading(false);
      },
      (err) => { setError(new Error(err.message || "Could not get location")); setGeoLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const geocodeFromAddress = useCallback(async () => {
    const parts = [formData.address, formData.barangay, formData.city, formData.province].filter(Boolean);
    if (!parts.length) { setError(new Error("Please enter an address first")); return; }
    setGeoLoading(true);
    try {
      const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const res  = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(parts.join(", "))}&key=${key}`);
      const json = await res.json();
      if (json.status !== "OK" || !json.results?.[0]) throw new Error(json.error_message || "Address not found");
      const { lat, lng } = json.results[0].geometry.location;
      setFormData((prev) => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
    } catch (err) {
      setError(new Error(err.message || "Geocoding failed"));
    } finally {
      setGeoLoading(false);
    }
  }, [formData.address, formData.barangay, formData.city, formData.province]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    if (!formData.title.trim()) { setError(new Error("Please provide a listing title.")); return; }
    if (!formData.monthlyRent || Number(formData.monthlyRent) <= 0) { setError(new Error("Please provide a valid monthly rent.")); return; }

    setSaving(true);
    try {
      let newUrls = [];
      if (newImageFiles.length > 0) newUrls = await uploadListingImages(user.id, newImageFiles);

      const existingCover = existingImages.find((i) => i.is_cover)?.url;
      const coverUrl = existingCover || existingCoverUrl || existingImages[0]?.url || newUrls[0] || null;

      // Merge appliance amenities + utility labels + building features into
      // one array — listingsService.AMENITY_TO_FLAG fans them out into the
      // correct satellite tables.
      const mergedAmenities = [
        ...(formData.amenities || []),
        ...(formData.utilities || []),
        ...(formData.buildingFeatures || []),
      ];

      const payload = {
        ...formData, ownerId: user.id, cover: coverUrl,
        amenities:       mergedAmenities,
        contractTemplateUrl:  formData.contractTemplateUrl  ?? null,
        contractTemplateName: formData.contractTemplateName ?? null,
        monthlyRent:     formData.monthlyRent     ? Number(formData.monthlyRent)     : undefined,
        securityDeposit: formData.securityDeposit ? Number(formData.securityDeposit) : undefined,
        advancePayment:  formData.advancePayment  ? Number(formData.advancePayment)  : undefined,
        bedrooms:    formData.bedrooms    ? Number(formData.bedrooms)    : undefined,
        bathrooms:   formData.bathrooms   ? Number(formData.bathrooms)   : undefined,
        area:        formData.area        ? Number(formData.area)        : undefined,
        maxOccupants: formData.maxOccupants ? Number(formData.maxOccupants) : undefined,
        latitude:    formData.latitude    ? Number(formData.latitude)    : undefined,
        longitude:   formData.longitude   ? Number(formData.longitude)   : undefined,
      };

      let listingId = editId;
      if (isEditMode) {
        const { error } = await updateListing(editId, payload);
        if (error) throw error;
      } else {
        const { data, error } = await createListing(payload);
        if (error) throw error;
        listingId = data?.id;
        if (!listingId) throw new Error("Listing was created but no id returned");
      }

      for (const recId of removedImageIds) {
        const rec = existingImages.find((i) => i.id === recId);
        await deleteListingImageRecord(recId, rec?.url);
      }

      if (newUrls.length > 0) {
        const { error: imgErr } = await saveListingImageRecords({
          listingId, urls: newUrls, uploadedBy: user.id,
          coverUrl, startingSortOrder: existingImages.length,
        });
        if (imgErr) throw imgErr;
      }

      navigate("/my-listings");
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (authLoading || (isEditMode && loading)) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <Loader2 className="animate-spin mr-2" size={20} color={BRAND} />
        <span className="text-sm text-gray-500">Loading…</span>
      </div>
    );
  }

  // ── INTRO VIEW ───────────────────────────────────────────────────────────────
  if (view === "intro") {
    return (
      <div className="min-h-screen" style={{ background: BG }}>
        {/* Hero */}
        <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${DARK} 100%)`, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
          <div className="absolute pointer-events-none rounded-full" style={{ width: 220, height: 220, right: -70, top: -70, background: "rgba(255,255,255,0.08)" }} />
          <div className="absolute pointer-events-none rounded-full" style={{ width: 160, height: 160, left: -50, bottom: -80, background: "rgba(255,255,255,0.06)" }} />

          <div className="relative z-10 max-w-3xl mx-auto px-5 pt-5 pb-8">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.20)" }} aria-label="Go back">
                <ArrowLeft size={20} color="white" />
              </button>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: "rgba(255,255,255,0.20)" }}>
                <Info size={14} /> Free to List
              </span>
            </div>
            <Home size={48} color="white" className="mb-4" />
            <h1 className="text-[26px] font-bold text-white leading-tight mb-3">List Your Property</h1>
            <p className="text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.92)" }}>
              Start earning by renting out your property on ViewXRent. Reach thousands of tenants looking for their next home.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="max-w-3xl mx-auto px-4 py-5 flex flex-col gap-4 pb-10">
          {/* How It Works */}
          <div className="rounded-2xl p-5 bg-white shadow-sm">
            <h2 className="text-lg font-bold mb-4" style={{ color: INK }}>How It Works</h2>
            <div className="flex flex-col">
              {HOW_STEPS.map((step, i) => (
                <HowStep key={step.number} step={step} isLast={i === HOW_STEPS.length - 1} />
              ))}
            </div>
          </div>

          {/* Why List */}
          <div className="rounded-2xl p-5 bg-white shadow-sm">
            <h2 className="text-lg font-bold mb-4" style={{ color: INK }}>Why List on ViewXRent?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {BENEFITS.map((b) => <BenefitTile key={b.title} benefit={b} />)}
            </div>
          </div>

          {/* What You'll Need */}
          <div className="rounded-2xl p-5" style={{ background: "#FFF8F0", border: "1px solid #FFE0C0" }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={22} color="#E07820" />
              <h2 className="text-base font-bold" style={{ color: INK }}>What You&apos;ll Need</h2>
            </div>
            <ul className="flex flex-col gap-2">
              {REQUIREMENTS.map((req) => (
                <li key={req} className="flex items-center gap-2.5">
                  <CheckCircle2 size={18} color="#1A9E4A" className="flex-shrink-0" />
                  <span className="text-sm" style={{ color: MUTED }}>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <button
            onClick={handleStartListing}
            disabled={verifyChecking}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-full text-white font-bold text-base transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-70"
            style={{ background: BRAND, boxShadow: `0 4px 18px ${BRAND}55` }}
          >
            {verifyChecking ? <Loader2 size={20} className="animate-spin" /> : <PlusCircle size={22} />}
            {verifyChecking ? "Checking…" : "Start Listing Your Property"}
          </button>
        </div>

        {verifyDialog && (
          <VerificationDialog
            kind={verifyDialog}
            onClose={() => setVerifyDialog(null)}
            onGoToProfile={() => { setVerifyDialog(null); navigate("/profile"); }}
          />
        )}
      </div>
    );
  }

  // ── FORM VIEW ────────────────────────────────────────────────────────────────
  const allPreviews = [
    ...existingImages.map((img) => ({ url: img.url, existing: true, recordId: img.id })),
    ...newImagePreviews.map((url, i) => ({ url, existing: false, index: i })),
  ];

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50"
        style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${DARK} 100%)` }}
        onClick={() => setDropdownOpen(false)}
      >
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => isEditMode ? navigate("/my-listings") : setView("intro")}
              className="p-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.20)" }}
              aria-label="Go back"
            >
              <ArrowLeft size={20} color="white" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <span className="font-black text-base" style={{ color: BRAND }}>V</span>
              </div>
              <span className="font-bold text-white text-base tracking-wide">ViewxRent</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/home2")} className="p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.15)" }}>
              <Bell size={18} color="white" />
            </button>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                aria-label="Open profile menu"
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "white", border: "none", cursor: "pointer",
                  borderRadius: 999, padding: "5px 14px 5px 6px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "linear-gradient(135deg, #EC6138, #FF8E9E)",
                  color: "white", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14,
                }}>
                  {(user?.email || "?").charAt(0).toUpperCase()}
                </div>
                <div style={{
                  width: 0, height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "8px solid #222",
                }} />
              </button>
              {dropdownOpen && <ProfileDropdown onLogout={() => setDropdownOpen(false)} />}
            </div>
          </div>
        </div>

        {/* Page title strip */}
        <div className="max-w-5xl mx-auto px-5 pb-4">
          <h1 className="text-xl font-bold text-white">
            {isEditMode ? "Edit Listing" : "Create New Listing"}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.80)" }}>
            {isEditMode ? "Update your property details below" : "Fill in the details to publish your property"}
          </p>
        </div>
      </div>

      {/* Form body */}
      <div className="max-w-5xl mx-auto px-4 py-5 pb-12">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Error</div>
                <div className="text-xs opacity-90">{error.message || "Something went wrong"}</div>
              </div>
            </div>
          )}

          {/* ── Listing Type (For Rent / For Lease) ─────────────────────── */}
          <FormCard title="Listing Type">
            <p className="text-xs text-gray-500 mb-4">
              Choose how this property is offered. This drives the rental rules,
              terms &amp; conditions, and contract template tenants will see and sign.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { v: "rent",  Icon: Repeat,        title: "For Rent",
                  subtitle: "Month-to-month, auto-renews each month with 30-day notice to terminate." },
                { v: "lease", Icon: FileSignature, title: "For Lease",
                  subtitle: "Fixed term (e.g. 12 months). Early termination forfeits the security deposit." },
              ].map((o) => {
                const selected = formData.listingType === o.v;
                return (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, listingType: o.v }))}
                    className="text-left p-4 rounded-xl border-2 transition"
                    style={{
                      borderColor: selected ? BRAND : "#E5E7EB",
                      background:  selected ? `${BRAND}0F` : "white",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="p-1.5 rounded-lg" style={{ background: selected ? `${BRAND}26` : "#F3F4F6" }}>
                        <o.Icon size={16} color={selected ? BRAND : "#6B7280"} />
                      </div>
                      <span className="font-bold text-sm" style={{ color: selected ? BRAND : INK }}>{o.title}</span>
                      <span className="ml-auto">
                        <input type="radio" name="listingType" checked={selected} onChange={() => {}} className="w-4 h-4" style={{ accentColor: BRAND, pointerEvents: "none" }} />
                      </span>
                    </div>
                    <p className="text-xs leading-snug" style={{ color: MUTED }}>{o.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </FormCard>

          {/* ── Listing title & status ─────────────────────────────────────── */}
          <FormCard title="Listing Title">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FLabel label="Status">
                <div className="flex gap-5 pt-1">
                  {[{ v: "active", l: "Active" }, { v: "inactive", l: "Inactive" }].map((o) => (
                    <label key={o.v} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="status" value={o.v} checked={formData.status === o.v} onChange={handleChange} className="w-4 h-4" style={{ accentColor: BRAND }} />
                      {o.l}
                    </label>
                  ))}
                </div>
              </FLabel>
              <FLabel label="Listing Title *">
                <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g., Modern Studio in Makati" className={inputCls} style={inputStyle} required />
              </FLabel>
            </div>
          </FormCard>

          {/* ── Location ──────────────────────────────────────────────────── */}
          <FormCard title="Location Details">
            {/* Cascading PSGC picker — Region → Province (skipped for NCR) → City → Barangay */}
            <PsgcLocationField
              initialProvinceName={formData.province}
              initialCityName={formData.city}
              initialBarangayName={formData.barangay}
              onChange={handlePsgcChange}
            />

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <FLabel label="Full Address">
                  <input name="address" value={formData.address} onChange={handleChange} placeholder="Street, building, unit number…" className={inputCls} style={inputStyle} />
                </FLabel>
              </div>
              <FLabel label="Postal Code">
                <input name="postalCode" value={formData.postalCode} onChange={handleChange} placeholder="e.g., 4114" className={inputCls} style={inputStyle} />
              </FLabel>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setMapOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl border-2 transition hover:opacity-90"
                  style={{ borderColor: BRAND, color: BRAND, background: "white" }}
                >
                  <MapPin size={16} />
                  Pick Address from Map
                </button>
              </div>
            </div>

            {/* Map coordinates */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={14} color={BRAND} />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Map Coordinates</p>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Auto-filled when you pick from the map. You can also enter manually or auto-locate.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FLabel label="Latitude"><input type="number" step="any" name="latitude" value={formData.latitude} onChange={handleChange} placeholder="14.329567" className={inputCls} style={inputStyle} /></FLabel>
                <FLabel label="Longitude"><input type="number" step="any" name="longitude" value={formData.longitude} onChange={handleChange} placeholder="120.933433" className={inputCls} style={inputStyle} /></FLabel>
                <div className="flex gap-2 items-end">
                  <button type="button" onClick={useCurrentLocation} disabled={geoLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-white rounded-xl transition hover:opacity-90 disabled:opacity-60"
                    style={{ background: BRAND }}>
                    {geoLoading ? <Loader2 size={13} className="animate-spin" /> : <Crosshair size={13} />}
                    My Location
                  </button>
                  <button type="button" onClick={geocodeFromAddress} disabled={geoLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60">
                    {geoLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                    From Address
                  </button>
                </div>
              </div>
            </div>
          </FormCard>

          {/* ── Property Details ───────────────────────────────────────────── */}
          <FormCard title="Property Details">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FLabel label="Property Type">
                <select name="propertyType" value={formData.propertyType} onChange={handleChange} className={inputCls} style={inputStyle}>
                  <option value="">Select type</option>
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="condo">Condo</option>
                  <option value="studio">Studio</option>
                  <option value="room">Room</option>
                  <option value="townhouse">Townhouse</option>
                </select>
              </FLabel>
              <FLabel label="Furnishing">
                <select name="furnishing" value={formData.furnishing} onChange={handleChange} className={inputCls} style={inputStyle}>
                  <option value="">Select furnishing</option>
                  <option>Fully Furnished</option><option>Semi-Furnished</option><option>Unfurnished</option>
                </select>
              </FLabel>
              <FLabel label="Bedrooms">
                <select name="bedrooms" value={formData.bedrooms} onChange={handleChange} className={inputCls} style={inputStyle}>
                  <option value="">Bedrooms</option>
                  <option value="Studio">Studio</option>
                  {[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
                  <option value="5+">5+</option>
                </select>
              </FLabel>
              <FLabel label="Bathrooms">
                <select name="bathrooms" value={formData.bathrooms} onChange={handleChange} className={inputCls} style={inputStyle}>
                  <option value="">Bathrooms</option>
                  {[1,2,3].map((n) => <option key={n} value={n}>{n}</option>)}
                  <option value="4+">4+</option>
                </select>
              </FLabel>
              <FLabel label="Floor Area (m²)">
                <input type="number" name="area" value={formData.area} onChange={handleChange} placeholder="e.g., 45" min="0" className={inputCls} style={inputStyle} />
              </FLabel>
              <FLabel label="Max Occupants">
                <input type="number" name="maxOccupants" value={formData.maxOccupants} onChange={handleChange} placeholder="e.g., 4" min="0" className={inputCls} style={inputStyle} />
              </FLabel>
            </div>
          </FormCard>

          {/* ── Pricing ────────────────────────────────────────────────────── */}
          <FormCard title="Rental Pricing">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FLabel label="Monthly Rent (₱) *">
                <input type="number" name="monthlyRent" value={formData.monthlyRent} onChange={handleChange} placeholder="e.g., 5000" min="0" className={inputCls} style={inputStyle} required />
              </FLabel>
              <FLabel label="Security Deposit (₱)">
                <input type="number" name="securityDeposit" value={formData.securityDeposit} onChange={handleChange} placeholder="e.g., 5000" min="0" className={inputCls} style={inputStyle} />
              </FLabel>
              <FLabel label="Advance Payment (₱)">
                <input type="number" name="advancePayment" value={formData.advancePayment} onChange={handleChange} placeholder="e.g., 5000" min="0" className={inputCls} style={inputStyle} />
              </FLabel>
              <FLabel label="Payment Terms">
                <select name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} className={inputCls} style={inputStyle}>
                  <option value="">Select payment terms</option>
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>Semi-Annual</option>
                  <option>Annual</option>
                </select>
              </FLabel>
              <div className="col-span-2 md:col-span-2">
                <FLabel label="Payment Method">
                  <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className={inputCls} style={inputStyle}>
                    <option value="">Select payment method</option>
                    <option>Post-Dated Checks</option>
                    <option>Bank Transfer</option>
                    <option>GCash</option>
                    <option>Maya</option>
                    <option>Cash</option>
                    <option>Any</option>
                  </select>
                </FLabel>
              </div>
            </div>
          </FormCard>

          {/* ── Availability & Lease ────────────────────────────────────────── */}
          <FormCard title="Availability & Lease">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FLabel label="Availability">
                <div className="flex gap-5 pt-1">
                  {[{ v: "immediate", l: "Immediate" }, { v: "future", l: "Future Date" }].map((o) => (
                    <label key={o.v} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="availability" value={o.v} checked={formData.availability === o.v} onChange={handleChange} className="w-4 h-4" style={{ accentColor: BRAND }} />
                      {o.l}
                    </label>
                  ))}
                </div>
              </FLabel>
              <FLabel label="Available From">
                <input type="date" name="availableFrom" value={formData.availableFrom} onChange={handleChange} className={inputCls} style={inputStyle} />
              </FLabel>
              {formData.listingType === "lease" && (
                <FLabel label="Lease Term (Months)">
                  <select name="leaseTerm" value={formData.leaseTerm} onChange={handleChange} className={inputCls} style={inputStyle}>
                    {[1,3,6,12,24].map((m) => <option key={m} value={m}>{m} {m === 1 ? "month" : "months"}</option>)}
                  </select>
                </FLabel>
              )}
            </div>
          </FormCard>

          {/* ── Description ────────────────────────────────────────────────── */}
          <FormCard title="Unit Description">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FLabel label="About The Place">
                <textarea name="aboutPlace" value={formData.aboutPlace} onChange={handleChange} rows="3" placeholder="Describe the place, features, neighborhood…" className={inputCls} style={inputStyle} />
              </FLabel>
              <FLabel label="Unit Details">
                <textarea name="unitDetails" value={formData.unitDetails} onChange={handleChange} rows="3" placeholder="Room details, included utilities, etc." className={inputCls} style={inputStyle} />
              </FLabel>
            </div>
          </FormCard>

          {/* ── Amenities & Features (appliances) ────────────────────────── */}
          <FormCard title="Amenities & Features">
            <p className="text-xs text-gray-400 mb-3">Select all amenities that are available.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AMENITIES_LIST.map((amenity) => (
                <label key={amenity} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name={amenity}
                    data-group="amenities"
                    checked={formData.amenities.includes(amenity)}
                    onChange={handleChange}
                    className="w-4 h-4"
                    style={{ accentColor: BRAND }}
                  />
                  {amenity}
                </label>
              ))}
            </div>
          </FormCard>

          {/* ── Utilities & Inclusions ─────────────────────────────────────── */}
          <FormCard title="Utilities & Inclusions">
            <p className="text-xs text-gray-400 mb-3">Select included utilities.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {UTILITY_LABELS.map(([flag, display]) => (
                <label key={flag} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name={flag}
                    data-group="utilities"
                    checked={formData.utilities.includes(flag)}
                    onChange={handleChange}
                    className="w-4 h-4"
                    style={{ accentColor: BRAND }}
                  />
                  {display}
                </label>
              ))}
            </div>
          </FormCard>

          {/* ── Building Features ─────────────────────────────────────────── */}
          <FormCard title="Building Features">
            <p className="text-xs text-gray-400 mb-3">Select available building features.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {BUILDING_FEATURES.map((feature) => (
                <label key={feature} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name={feature}
                    data-group="buildingFeatures"
                    checked={formData.buildingFeatures.includes(feature)}
                    onChange={handleChange}
                    className="w-4 h-4"
                    style={{ accentColor: BRAND }}
                  />
                  {feature}
                </label>
              ))}
            </div>
          </FormCard>

          {/* ── Rental Policies ─────────────────────────────────────────────── */}
          <FormCard title={formData.listingType === "lease" ? "Lease Rules & Policies" : "Rental Rules & Policies"}>
            <div
              className="flex items-start gap-2 p-3 rounded-xl mb-4"
              style={{ background: `${BRAND}10`, border: `1px solid ${BRAND}40` }}
            >
              {formData.listingType === "lease"
                ? <FileSignature size={16} color={BRAND} className="mt-0.5 flex-shrink-0" />
                : <Repeat size={16} color={BRAND} className="mt-0.5 flex-shrink-0" />}
              <p className="text-xs leading-relaxed" style={{ color: INK }}>
                {formData.listingType === "lease"
                  ? "These policies apply to a fixed-term lease and will be referenced in the lease agreement."
                  : "These policies apply to a month-to-month rental and will be referenced in the rental agreement."}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FLabel label="Pet Policy">
                <select name="petPolicy" value={formData.petPolicy} onChange={handleChange} className={inputCls} style={inputStyle}>
                  <option>No Pets</option><option>Pets Allowed</option><option>Small Pets Only</option>
                </select>
              </FLabel>
              <FLabel label="Smoking">
                <select name="smokingPolicy" value={formData.smokingPolicy} onChange={handleChange} className={inputCls} style={inputStyle}>
                  <option>No</option><option>Outside Only</option><option>Yes</option>
                </select>
              </FLabel>
              <FLabel label="Guest Policy">
                <select name="guestPolicy" value={formData.guestPolicy} onChange={handleChange} className={inputCls} style={inputStyle}>
                  <option>Day/Nite Only</option>
                  <option>Day Only</option>
                  <option>No Guests</option>
                  <option>Open Policy</option>
                </select>
              </FLabel>
              <FLabel label="Curfew">
                <select name="curfew" value={formData.curfew} onChange={handleChange} className={inputCls} style={inputStyle}>
                  <option>No Curfew</option><option>With Curfew</option>
                </select>
              </FLabel>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <FLabel label="Subletting">
                <div className="flex gap-5 pt-1">
                  {[{ v: true, l: "Allowed" }, { v: false, l: "Not Allowed" }].map((o) => (
                    <label key={String(o.v)} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="sublettingAllowed"
                        checked={formData.sublettingAllowed === o.v}
                        onChange={() => setFormData((p) => ({ ...p, sublettingAllowed: o.v }))}
                        className="w-4 h-4"
                        style={{ accentColor: BRAND }}
                      />
                      {o.l}
                    </label>
                  ))}
                </div>
              </FLabel>
              <FLabel label="Modifications">
                <div className="flex gap-5 pt-1">
                  {[{ v: true, l: "Allowed" }, { v: false, l: "Not Allowed" }].map((o) => (
                    <label key={String(o.v)} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="modificationAllowed"
                        checked={formData.modificationAllowed === o.v}
                        onChange={() => setFormData((p) => ({ ...p, modificationAllowed: o.v }))}
                        className="w-4 h-4"
                        style={{ accentColor: BRAND }}
                      />
                      {o.l}
                    </label>
                  ))}
                </div>
              </FLabel>
            </div>
          </FormCard>

          {/* ── Contract Template ──────────────────────────────────────────── */}
          <FormCard title="Contract Template">
            <p className="text-xs text-gray-500 mb-4">
              Tenants see the {formData.listingType === "lease" ? "fixed-term lease" : "month-to-month rental"} template
              when they sign. Preview it below, customize individual clauses inline, or upload your own file to fully override the default.
            </p>

            {/* Action row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <button
                type="button"
                onClick={() => setContractPreviewOpen(true)}
                className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-xl transition hover:opacity-90"
                style={{ background: BRAND }}
              >
                <Eye size={16} /> Preview &amp; Export
              </button>

              <label className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl border-2 cursor-pointer transition hover:opacity-90"
                style={{ borderColor: BRAND, color: BRAND, background: "white" }}>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleContractUpload}
                  disabled={contractUploading}
                />
                {contractUploading
                  ? <><Loader2 size={16} className="animate-spin" /> Uploading…</>
                  : <><Upload size={16} /> {formData.contractTemplateUrl ? "Replace Uploaded" : "Upload Custom File"}</>}
              </label>

              <button
                type="button"
                onClick={() => setTermsEditorOpen((p) => !p)}
                className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl border-2 transition hover:opacity-90"
                style={{ borderColor: hasCustomTerms ? "#059669" : BRAND, color: hasCustomTerms ? "#059669" : BRAND, background: "white" }}
              >
                <Edit3 size={16} />
                {hasCustomTerms ? "Custom Terms" : "Edit Clauses"}
                {termsEditorOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </div>

            {/* Uploaded contract badge */}
            {formData.contractTemplateUrl && (
              <div className="mb-3 flex flex-wrap items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText size={18} className="text-emerald-700 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-900 truncate">
                      {formData.contractTemplateName || "Uploaded contract"}
                    </p>
                    <p className="text-[11px] text-emerald-700">This file overrides the default template for tenants.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleContractOpen}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-100"
                >
                  <ExternalLink size={13} /> Open
                </button>
                <button
                  type="button"
                  onClick={handleContractRemove}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50"
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            )}

            {/* Inline terms editor */}
            {termsEditorOpen && (
              <div className="mt-1 border border-gray-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <FileSignature size={15} color={BRAND} />
                    <span className="text-sm font-semibold text-gray-700">Contract Clauses</span>
                    {hasCustomTerms && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${BRAND}1A`, color: BRAND }}>
                        Customized
                      </span>
                    )}
                  </div>
                  {hasCustomTerms && (
                    <button
                      type="button"
                      onClick={handleResetTerms}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
                    >
                      <RotateCcw size={12} /> Reset to Default
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
                  {editableTerms.map((clause, idx) => (
                    <div key={idx} className="px-4 py-3">
                      <p className="text-[10.5px] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND }}>
                        Clause {idx + 1}
                      </p>
                      <textarea
                        rows={3}
                        value={clause}
                        onChange={(e) => handleTermChange(idx, e.target.value)}
                        className="w-full text-sm text-gray-800 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 resize-y"
                        style={{ focusRingColor: BRAND, lineHeight: 1.6 }}
                      />
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <p className="text-[11px] text-gray-400">Changes are saved when you click <strong>Update Listing</strong>. The preview reflects your customized clauses.</p>
                </div>
              </div>
            )}
          </FormCard>

          {/* ── Host Info ───────────────────────────────────────────────────── */}
          <FormCard title="Host Information">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FLabel label="Host Name"><input type="text" name="hostName" value={formData.hostName} onChange={handleChange} placeholder="Enter host name" className={inputCls} style={inputStyle} /></FLabel>
              <FLabel label="Role">
                <select name="hostRole" value={formData.hostRole} onChange={handleChange} className={inputCls} style={inputStyle}>
                  <option value="">Select role</option>
                  <option>Owner</option>
                  <option>Agent</option>
                  <option>Property Manager</option>
                </select>
              </FLabel>
              <FLabel label="Response Time">
                <select name="responseTime" value={formData.responseTime} onChange={handleChange} className={inputCls} style={inputStyle}>
                  <option>Within 1 Hour</option>
                  <option>Within 3 Hours</option>
                  <option>Within 6 Hours</option>
                  <option>Within 24 Hours</option>
                </select>
              </FLabel>
            </div>
          </FormCard>

          {/* ── Photos ──────────────────────────────────────────────────────── */}
          <FormCard title="Photos">
            <p className="text-xs text-gray-400 mb-4">Photos are uploaded to Supabase Storage and shown across all devices.</p>

            {allPreviews.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                {allPreviews.map((p, idx) => (
                  <div key={`${p.existing ? p.recordId : "new"}-${idx}`} className="relative group">
                    <img src={p.url} alt="" className="w-full h-20 object-cover rounded-xl border border-gray-100" />
                    {!p.existing && (
                      <span className="absolute bottom-1 left-1 text-[9px] bg-emerald-500 text-white px-1 py-0.5 rounded">new</span>
                    )}
                    <button type="button"
                      onClick={() => p.existing ? removeExistingImage(p.recordId) : removeNewImage(p.index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl p-5 cursor-pointer hover:border-[#F36C6C] transition">
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${BRAND}1A` }}>
                  <ImageIcon size={20} color={BRAND} />
                </div>
                <p className="text-sm font-semibold text-gray-700">Property Images</p>
                <p className="text-xs text-gray-400">Tap to add multiple</p>
              </label>

              <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-100 rounded-2xl p-5 opacity-50 cursor-not-allowed">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100">
                  <CameraIcon size={20} className="text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-500">360° Media</p>
                <p className="text-xs text-gray-400">Coming soon</p>
              </div>

              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl p-5 cursor-pointer hover:border-[#F36C6C] transition">
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files[0]; if (!file) return;
                  setNewImageFiles((prev) => [file, ...prev]);
                  setNewImagePreviews((prev) => [URL.createObjectURL(file), ...prev]);
                  e.target.value = "";
                }} className="hidden" />
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${BRAND}1A` }}>
                  <Upload size={20} color={BRAND} />
                </div>
                <p className="text-sm font-semibold text-gray-700">Cover Photo</p>
                <p className="text-xs text-gray-400">Added to front</p>
              </label>
            </div>
          </FormCard>

          {/* ── Actions ─────────────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button"
              onClick={() => isEditMode ? navigate("/my-listings") : setView("intro")}
              disabled={saving}
              className="px-7 py-3 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition disabled:opacity-60"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-7 py-3 text-sm font-semibold text-white rounded-xl inline-flex items-center gap-2 transition hover:opacity-90 disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${DARK} 100%)` }}
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? "Saving…" : isEditMode ? "Update Listing" : "Publish Listing"}
            </button>
          </div>

        </form>
      </div>

      {mapOpen && (
        <MapAddressPicker
          initialPosition={
            formData.latitude && formData.longitude
              ? { lat: Number(formData.latitude), lng: Number(formData.longitude) }
              : null
          }
          onClose={() => setMapOpen(false)}
          onPick={handleMapPick}
        />
      )}

      {contractPreviewOpen && (
        <ContractTemplatePreview
          formData={formData}
          hostName={formData.hostName}
          onClose={() => setContractPreviewOpen(false)}
        />
      )}
    </div>
  );
}
