import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MapPin, Home, Camera, Upload, Image as ImageIcon, ArrowLeft, X, Bell,
  Loader2, AlertCircle, Locate, Crosshair, Search,
} from "lucide-react";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import {
  fetchListingById,
  createListing,
  updateListing,
  uploadListingImages,
  saveListingImageRecords,
  deleteListingImageRecord,
} from "./lib/listingsService";

const DEFAULT_FORM = {
  title: "",
  status: "active",
  city: "",
  province: "",
  address: "",
  barangay: "",
  postalCode: "",
  propertyType: "",
  furnishing: "",
  bedrooms: "",
  bathrooms: "",
  area: "",
  maxOccupants: "",
  monthlyRent: "",
  securityDeposit: "",
  advancePayment: "",
  paymentTerms: "",
  availability: "immediate",
  availableFrom: "",
  leaseTerm: "12",
  aboutPlace: "",
  unitDetails: "",
  amenities: [],
  petPolicy: "No Pets",
  smokingPolicy: "No",
  guestPolicy: "Day/Nite Only",
  curfew: "No Curfew",
  hostName: "",
  hostRole: "",
  responseTime: "Within 1 Hour",
  latitude: "",
  longitude: "",
};

const AMENITIES = [
  "No Smoking", "Parking", "Seating Spot", "Air Conditioning",
  "Kitchen", "CCTV", "WiFi", "Swimming Pool",
  "Balcony", "Water Tank",
];

export default function ListingDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const queryParams = new URLSearchParams(location.search);
  const editId = queryParams.get("edit");
  const isEditMode = !!editId;

  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [existingImages, setExistingImages] = useState([]);  // [{id, url, is_cover}]
  const [removedImageIds, setRemovedImageIds] = useState([]); // image record ids to delete on save
  const [newImageFiles, setNewImageFiles] = useState([]);     // File[] for upload
  const [newImagePreviews, setNewImagePreviews] = useState([]); // blob previews for unsaved
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  // Load listing data when editing
  useEffect(() => {
    if (!editId) return;
    setLoading(true);
    fetchListingById(editId).then(({ data, error }) => {
      if (error) setError(error);
      if (data) {
        setFormData({
          title: data.title || "",
          status: data.status || "active",
          city: data.city || "",
          province: data.province || "",
          address: data.address || "",
          barangay: data.barangay || "",
          postalCode: data.postalCode || "",
          propertyType: data.propertyType || "",
          furnishing: data.furnishing || "",
          bedrooms: data.bedrooms?.toString() || "",
          bathrooms: data.bathrooms?.toString() || "",
          area: data.area?.toString() || "",
          maxOccupants: data.maxOccupants?.toString() || "",
          monthlyRent: data.monthlyRent?.toString() || "",
          securityDeposit: data.securityDeposit?.toString() || "",
          advancePayment: data.advancePayment?.toString() || "",
          paymentTerms: data.paymentTerms || "",
          availability: data.availability || "immediate",
          availableFrom: data.availableFrom ? data.availableFrom.slice(0, 10) : "",
          leaseTerm: data.leaseTerm?.toString() || "12",
          aboutPlace: data.aboutPlace || "",
          unitDetails: data.unitDetails || "",
          amenities: data.amenities || [],
          petPolicy: data.petPolicy || "No Pets",
          smokingPolicy: data.smokingPolicy || "No",
          guestPolicy: data.guestPolicy || "Day/Nite Only",
          curfew: data.curfew || "No Curfew",
          hostName: data.hostName || "",
          hostRole: data.hostRole || "",
          responseTime: data.responseTime || "Within 1 Hour",
          latitude: data.latitude?.toString() || "",
          longitude: data.longitude?.toString() || "",
        });
        setExistingImages(data.imageRecords || []);
      }
      setLoading(false);
    });
  }, [editId]);

  // Revoke any blob preview URLs on unmount
  useEffect(() => {
    return () => newImagePreviews.forEach(URL.revokeObjectURL);
  }, [newImagePreviews]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const previews = files.map((f) => URL.createObjectURL(f));
    setNewImageFiles((prev) => [...prev, ...files]);
    setNewImagePreviews((prev) => [...prev, ...previews]);
    e.target.value = "";
  };

  const removeExistingImage = (recordId) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== recordId));
    setRemovedImageIds((prev) => [...prev, recordId]);
  };

  const removeNewImage = (index) => {
    setNewImagePreviews((prev) => {
      const preview = prev[index];
      if (preview) URL.revokeObjectURL(preview);
      return prev.filter((_, i) => i !== index);
    });
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        amenities: checked
          ? [...prev.amenities, name]
          : prev.amenities.filter((a) => a !== name),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(new Error("Geolocation not supported by your browser"));
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setGeoLoading(false);
      },
      (err) => {
        setError(new Error(err.message || "Could not get location"));
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const geocodeFromAddress = useCallback(async () => {
    const parts = [formData.address, formData.barangay, formData.city, formData.province].filter(Boolean);
    if (parts.length === 0) {
      setError(new Error("Please enter an address first"));
      return;
    }
    const query = parts.join(", ");
    setGeoLoading(true);
    try {
      const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status !== "OK" || !json.results?.[0]) {
        throw new Error(json.error_message || "Address not found");
      }
      const loc = json.results[0].geometry.location;
      setFormData((prev) => ({
        ...prev,
        latitude: loc.lat.toFixed(6),
        longitude: loc.lng.toFixed(6),
      }));
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

    if (!formData.title.trim()) {
      setError(new Error("Please provide a listing title."));
      return;
    }
    if (!formData.monthlyRent || Number(formData.monthlyRent) <= 0) {
      setError(new Error("Please provide a valid monthly rent."));
      return;
    }

    setSaving(true);
    try {
      // 1. Upload any new image files to Supabase Storage → public URLs
      let newUrls = [];
      if (newImageFiles.length > 0) {
        newUrls = await uploadListingImages(user.id, newImageFiles);
      }

      // 2. Compute cover photo URL (keep existing if present, otherwise first new upload)
      const existingCover = existingImages.find((i) => i.is_cover)?.url;
      const firstExisting = existingImages[0]?.url;
      const coverUrl = existingCover || firstExisting || newUrls[0] || null;

      const payload = {
        ...formData,
        ownerId: user.id,
        cover: coverUrl,
        monthlyRent: formData.monthlyRent ? Number(formData.monthlyRent) : undefined,
        securityDeposit: formData.securityDeposit ? Number(formData.securityDeposit) : undefined,
        advancePayment: formData.advancePayment ? Number(formData.advancePayment) : undefined,
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : undefined,
        area: formData.area ? Number(formData.area) : undefined,
        maxOccupants: formData.maxOccupants ? Number(formData.maxOccupants) : undefined,
        latitude: formData.latitude ? Number(formData.latitude) : undefined,
        longitude: formData.longitude ? Number(formData.longitude) : undefined,
      };

      // 3. Upsert the listing row
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

      // 4. Delete any removed listing_image rows + their storage objects
      for (const recId of removedImageIds) {
        const rec = existingImages.find((i) => i.id === recId);
        await deleteListingImageRecord(recId, rec?.url);
      }

      // 5. Insert listing_image rows for new uploads
      if (newUrls.length > 0) {
        const { error: imgErr } = await saveListingImageRecords({
          listingId,
          urls: newUrls,
          uploadedBy: user.id,
          coverUrl,
          startingSortOrder: existingImages.length,
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

  const handleLogout = () => {
    setDropdownOpen(false);
    navigate("/");
  };

  const allPreviews = [
    ...existingImages.map((img) => ({ url: img.url, existing: true, recordId: img.id })),
    ...newImagePreviews.map((url, i) => ({ url, existing: false, index: i })),
  ];

  if (authLoading || (isEditMode && loading)) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 text-sm">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading...
      </div>
    );
  }

  return (
    <div className="w-[100%] min-h-[100vh] bg-gray-50">
      <Header navigate={navigate} dropdownOpen={dropdownOpen} setDropdownOpen={setDropdownOpen} onLogout={handleLogout} />

      <div className="w-[100%] max-w-[64rem] mx-auto px-[1rem] py-[2rem]">
        <form onSubmit={handleSubmit}>
          <h2 className="text-[2rem] font-semibold mb-6" style={{ color: "#e8756a" }}>
            {isEditMode ? "Edit Listing" : "Create New Listing"}
          </h2>

          {error && (
            <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Error</div>
                <div className="text-xs opacity-90">
                  {error.message || "Something went wrong"}
                  {error.message?.includes("Bucket") || error.message?.includes("bucket")
                    ? " — make sure the `listing-images` Storage bucket exists in Supabase."
                    : ""}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Listing Title */}
            <Section title="Listing Title">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="flex gap-6">
                    {[
                      { v: "active", l: "Active" },
                      { v: "draft", l: "Draft" },
                      { v: "rented", l: "Rented" },
                    ].map((o) => (
                      <label key={o.v} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="status"
                          value={o.v}
                          checked={formData.status === o.v}
                          onChange={handleChange}
                          className="w-4 h-4"
                          style={{ accentColor: "#e8756a" }}
                        />
                        {o.l}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Listing Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g., Modern Studio in Makati"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
            </Section>

            {/* Location */}
            <Section title="Location Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="City">
                  <input name="city" value={formData.city} onChange={handleChange} placeholder="e.g., Dasmariñas" className="w-full p-3 border border-gray-300 rounded-lg" />
                </Field>
                <Field label="Province / Region">
                  <input name="province" value={formData.province} onChange={handleChange} placeholder="e.g., Cavite" className="w-full p-3 border border-gray-300 rounded-lg" />
                </Field>
                <Field label="Barangay">
                  <input name="barangay" value={formData.barangay} onChange={handleChange} placeholder="e.g., Salitran" className="w-full p-3 border border-gray-300 rounded-lg" />
                </Field>
                <Field label="Postal Code">
                  <input name="postalCode" value={formData.postalCode} onChange={handleChange} placeholder="e.g., 4114" className="w-full p-3 border border-gray-300 rounded-lg" />
                </Field>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Address</label>
                  <input name="address" value={formData.address} onChange={handleChange} placeholder="Street, building, unit number…" className="w-full p-3 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div className="mt-5 border-t border-gray-100 pt-5">
                <h4 className="font-medium mb-2 text-sm">Map coordinates</h4>
                <p className="text-xs text-gray-500 mb-3">
                  Required for this listing to show on the map. Enter manually or use auto-locate.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Latitude">
                    <input type="number" step="any" name="latitude" value={formData.latitude} onChange={handleChange} placeholder="14.329567" className="w-full p-3 border border-gray-300 rounded-lg" />
                  </Field>
                  <Field label="Longitude">
                    <input type="number" step="any" name="longitude" value={formData.longitude} onChange={handleChange} placeholder="120.933433" className="w-full p-3 border border-gray-300 rounded-lg" />
                  </Field>
                  <div className="flex gap-2 items-end">
                    <button type="button" onClick={useCurrentLocation} disabled={geoLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 p-3 text-xs font-semibold text-white rounded-lg transition hover:opacity-90 disabled:opacity-60"
                      style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}>
                      {geoLoading ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
                      My location
                    </button>
                    <button type="button" onClick={geocodeFromAddress} disabled={geoLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 p-3 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60">
                      {geoLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                      From address
                    </button>
                  </div>
                </div>
              </div>
            </Section>

            {/* Property Details */}
            <Section title="Property Details">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Property Type">
                  <select name="propertyType" value={formData.propertyType} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                    <option value="">Select property type</option>
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="condo">Condo</option>
                    <option value="studio">Studio</option>
                    <option value="townhouse">Townhouse</option>
                  </select>
                </Field>
                <Field label="Furnishing">
                  <select name="furnishing" value={formData.furnishing} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                    <option value="">Select furnishing</option>
                    <option value="Fully Furnished">Fully Furnished</option>
                    <option value="Semi-Furnished">Semi-Furnished</option>
                    <option value="Unfurnished">Unfurnished</option>
                  </select>
                </Field>
                <Field label="Bedrooms">
                  <select name="bedrooms" value={formData.bedrooms} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                    <option value="">Number of bedrooms</option>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
                <Field label="Bathrooms">
                  <select name="bathrooms" value={formData.bathrooms} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                    <option value="">Number of bathrooms</option>
                    {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
                <Field label="Floor Area (m²)">
                  <input type="number" name="area" value={formData.area} onChange={handleChange} placeholder="e.g., 45" min="0" className="w-full p-3 border border-gray-300 rounded-lg" />
                </Field>
                <Field label="Max Occupants">
                  <input type="number" name="maxOccupants" value={formData.maxOccupants} onChange={handleChange} placeholder="e.g., 4" min="0" className="w-full p-3 border border-gray-300 rounded-lg" />
                </Field>
              </div>
            </Section>

            {/* Pricing */}
            <Section title="Rental Pricing">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Monthly Rent (₱) *">
                  <input type="number" name="monthlyRent" value={formData.monthlyRent} onChange={handleChange} placeholder="e.g., 5000" min="0" className="w-full p-3 border border-gray-300 rounded-lg" required />
                </Field>
                <Field label="Security Deposit (₱)">
                  <input type="number" name="securityDeposit" value={formData.securityDeposit} onChange={handleChange} placeholder="e.g., 5000" min="0" className="w-full p-3 border border-gray-300 rounded-lg" />
                </Field>
                <Field label="Advance Payment (₱)">
                  <input type="number" name="advancePayment" value={formData.advancePayment} onChange={handleChange} placeholder="e.g., 5000" min="0" className="w-full p-3 border border-gray-300 rounded-lg" />
                </Field>
                <div className="md:col-span-3">
                  <Field label="Payment Terms">
                    <select name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                      <option value="">Select payment terms</option>
                      <option>1 Month Advance + 1 Month Upfront</option>
                      <option>1 Month Advance + 1 Month Deposit</option>
                      <option>2 Months Advance + 1 Month Deposit</option>
                    </select>
                  </Field>
                </div>
              </div>
            </Section>

            {/* Availability & Lease */}
            <Section title="Availability & Lease">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                  <div className="flex gap-6 pt-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="availability" value="immediate" checked={formData.availability === "immediate"} onChange={handleChange} className="w-4 h-4" style={{ accentColor: "#e8756a" }} /> Immediate
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="availability" value="future" checked={formData.availability === "future"} onChange={handleChange} className="w-4 h-4" style={{ accentColor: "#e8756a" }} /> Future Date
                    </label>
                  </div>
                </div>
                <Field label="Available From">
                  <input type="date" name="availableFrom" value={formData.availableFrom} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" />
                </Field>
                <Field label="Lease Term (Months)">
                  <select name="leaseTerm" value={formData.leaseTerm} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                    {[6, 12, 24, 36].map((m) => <option key={m} value={m}>{m} months</option>)}
                  </select>
                </Field>
              </div>
            </Section>

            {/* Description */}
            <Section title="Unit Description">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="About The Place">
                  <textarea name="aboutPlace" value={formData.aboutPlace} onChange={handleChange} rows="3" placeholder="Describe the place, its features, neighborhood…" className="w-full p-3 border border-gray-300 rounded-lg" />
                </Field>
                <Field label="Unit Details">
                  <textarea name="unitDetails" value={formData.unitDetails} onChange={handleChange} rows="3" placeholder="Room details, included utilities, etc." className="w-full p-3 border border-gray-300 rounded-lg" />
                </Field>
              </div>
            </Section>

            {/* Amenities */}
            <Section title="Amenities & Features">
              <p className="text-sm text-gray-600 mb-3">Select all amenities that are available</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {AMENITIES.map((amenity) => (
                  <label key={amenity} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={amenity}
                      checked={formData.amenities.includes(amenity)}
                      onChange={handleChange}
                      className="w-4 h-4"
                      style={{ accentColor: "#e8756a" }}
                    />
                    {amenity}
                  </label>
                ))}
              </div>
            </Section>

            {/* Rules */}
            <Section title="Rental Rules & Policies">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Pet Policy">
                  <select name="petPolicy" value={formData.petPolicy} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                    <option>No Pets</option><option>Pets Allowed</option><option>Small Pets Only</option>
                  </select>
                </Field>
                <Field label="Smoking">
                  <select name="smokingPolicy" value={formData.smokingPolicy} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                    <option>No</option><option>Outside Only</option><option>Yes</option>
                  </select>
                </Field>
                <Field label="Guest Policy">
                  <select name="guestPolicy" value={formData.guestPolicy} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                    <option>Day/Nite Only</option><option>Weekend</option><option>Not Allowed</option><option>Full Allowance</option>
                  </select>
                </Field>
                <Field label="Curfew">
                  <select name="curfew" value={formData.curfew} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                    <option>No Curfew</option><option>With Curfew</option>
                  </select>
                </Field>
              </div>
            </Section>

            {/* Host */}
            <Section title="Host Information">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Host Name">
                  <input type="text" name="hostName" value={formData.hostName} onChange={handleChange} placeholder="Enter host name" className="w-full p-3 border border-gray-300 rounded-lg" />
                </Field>
                <Field label="Role">
                  <select name="hostRole" value={formData.hostRole} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                    <option value="">Select role</option>
                    <option>Property Owner</option>
                    <option>Property Manager</option>
                    <option>Agent</option>
                    <option>Co-Owner</option>
                  </select>
                </Field>
                <Field label="Response Time">
                  <select name="responseTime" value={formData.responseTime} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                    <option>Within 1 Hour</option><option>Within 2 Hours</option><option>Within 6 Hours</option><option>Within 24 Hours</option>
                  </select>
                </Field>
              </div>
            </Section>

            {/* Media */}
            <Section title="Media Upload">
              <p className="text-sm text-gray-600 mb-4">Photos are uploaded to Supabase Storage and displayed on every device.</p>

              {allPreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {allPreviews.map((p, index) => {
                    const handler = p.existing
                      ? () => removeExistingImage(p.recordId)
                      : () => removeNewImage(p.index);
                    return (
                      <div key={`${p.existing ? p.recordId : "new"}-${p.url}`} className="relative group">
                        <img src={p.url} alt={`Upload ${index}`} className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                        {!p.existing && (
                          <span className="absolute bottom-1 left-1 text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                            new
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handler}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 opacity-80 group-hover:opacity-100"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-orange-400 transition">
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                  <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="font-medium text-sm">Property Images</p>
                  <p className="text-xs text-gray-500">Click to upload</p>
                </label>

                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-not-allowed opacity-60">
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="font-medium text-sm">360 Media</p>
                  <p className="text-xs text-gray-500">Coming soon</p>
                </div>

                <label className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-orange-400 transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setNewImageFiles((prev) => [file, ...prev]);
                      setNewImagePreviews((prev) => [URL.createObjectURL(file), ...prev]);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="font-medium text-sm">Cover Photo</p>
                  <p className="text-xs text-gray-500">Added to front</p>
                </label>
              </div>
            </Section>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate("/my-listings")}
                disabled={saving}
                className="px-8 py-3 text-gray-600 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 text-white rounded-lg font-medium hover:opacity-90 transition inline-flex items-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: "#e8756a" }}
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "Saving..." : isEditMode ? "Update Listing" : "Create Listing"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {children}
    </div>
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
            }}>
              U
            </div>
            <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid #222" }} />
          </button>
          {dropdownOpen && <ProfileDropdown onLogout={onLogout} />}
        </div>
      </div>
    </nav>
  );
}
