import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Search, Home, ChevronDown, ChevronUp,
  Maximize2, Minimize2, X, Bell,
  SlidersHorizontal, MapPin, Loader2, AlertCircle, Star,
  Crosshair, Navigation2,
} from "lucide-react";
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, CircleF } from "@react-google-maps/api";
import PropertyCard from "./components/PropertyCard.jsx";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import { useListings } from "./hooks/useListings";
import { useAuth } from "./context/AuthContext.jsx";

const DEFAULT_CENTER = { lat: 14.3294, lng: 120.9367 }; // Dasmariñas, Cavite
const MAP_LIBRARIES = ["places"];
const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };
const RADIUS_KM = 5;

const DEFAULT_FILTERS = {
  sortBy: "Any",
  propertyType: "Any",
  city: "Any",
  bedrooms: "Any",
  bathrooms: "Any",
  areaMin: "",
  areaMax: "",
  furnishing: "Any",
  petPolicy: "Any",
  radius: "all", // 'within' | 'beyond' | 'all'
};

/** Haversine distance in kilometers. */
function distanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function SearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { listings, loading, error } = useListings();

  const [where, setWhere] = useState("");
  const [when, setWhen] = useState("");
  const [showMap, setShowMap] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [activeMarker, setActiveMarker] = useState(null);
  const [showBedroomsDropdown, setShowBedroomsDropdown] = useState(false);
  const [showBathroomsDropdown, setShowBathroomsDropdown] = useState(false);

  // Geolocation state
  const [userLocation, setUserLocation] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);

  useEffect(() => {
    if (location.state?.searchQuery) setWhere(location.state.searchQuery);
    if (location.state?.dateQuery) setWhen(location.state.dateQuery);

    const sortParam = searchParams.get("sort");
    if (sortParam === "rating") setFilters(f => ({ ...f, sortBy: "Rating: High to Low" }));
    else if (sortParam === "price-asc") setFilters(f => ({ ...f, sortBy: "Price: Low to High" }));
    else if (sortParam === "price-desc") setFilters(f => ({ ...f, sortBy: "Price: High to Low" }));
    else if (sortParam === "newest") setFilters(f => ({ ...f, sortBy: "Newest First" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Your browser doesn't support geolocation.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(err.message || "Couldn't get your location.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const clearLocation = useCallback(() => {
    setUserLocation(null);
    setFilters(f => ({ ...f, radius: "all" }));
  }, []);

  const cityOptions = useMemo(() => {
    const cities = new Set();
    listings.forEach(l => l.city && cities.add(l.city));
    return ["Any", ...Array.from(cities).sort()];
  }, [listings]);

  const propertyTypeOptions = useMemo(() => {
    const types = new Set();
    listings.forEach(l => l.propertyType && types.add(l.propertyType));
    return ["Any", ...Array.from(types).map(t => t.charAt(0).toUpperCase() + t.slice(1)).sort()];
  }, [listings]);

  // Compute distance once per listing
  const withDistance = useMemo(() => {
    if (!userLocation) return listings.map(l => ({ ...l, distanceKm: null }));
    return listings.map(l => {
      if (l.latitude == null || l.longitude == null) return { ...l, distanceKm: null };
      const d = distanceKm(userLocation, { lat: l.latitude, lng: l.longitude });
      return { ...l, distanceKm: d };
    });
  }, [listings, userLocation]);

  const filteredListings = useMemo(() => {
    let result = [...withDistance];

    if (where.trim()) {
      const q = where.toLowerCase();
      result = result.filter(l =>
        [l.title, l.location, l.city, l.barangay, l.type, l.propertyType]
          .filter(Boolean)
          .some(v => v.toLowerCase().includes(q))
      );
    }

    if (filters.propertyType !== "Any") {
      result = result.filter(l =>
        (l.propertyType || "").toLowerCase() === filters.propertyType.toLowerCase()
      );
    }
    if (filters.city !== "Any") {
      result = result.filter(l => (l.city || "").toLowerCase() === filters.city.toLowerCase());
    }
    if (filters.bedrooms !== "Any") {
      if (filters.bedrooms === "5+") result = result.filter(l => (l.bedrooms ?? 0) >= 5);
      else result = result.filter(l => (l.bedrooms ?? 0) === parseInt(filters.bedrooms, 10));
    }
    if (filters.bathrooms !== "Any") {
      if (filters.bathrooms === "4+") result = result.filter(l => (l.bathrooms ?? 0) >= 4);
      else result = result.filter(l => (l.bathrooms ?? 0) === parseInt(filters.bathrooms, 10));
    }
    const min = parseInt(filters.areaMin, 10);
    const max = parseInt(filters.areaMax, 10);
    if (!isNaN(min)) result = result.filter(l => (l.area ?? 0) >= min);
    if (!isNaN(max)) result = result.filter(l => (l.area ?? 0) <= max);

    if (filters.furnishing !== "Any") {
      const v = filters.furnishing.toLowerCase();
      result = result.filter(l => (l.furnishing || "").toLowerCase().includes(v.split(" ")[0]));
    }
    if (filters.petPolicy !== "Any") {
      const v = filters.petPolicy.toLowerCase();
      result = result.filter(l => (l.petPolicy || "").toLowerCase().includes(v.split(" ")[0]));
    }

    // 5km radius filter
    if (userLocation && filters.radius !== "all") {
      result = result.filter(l => {
        if (l.distanceKm == null) return false;
        return filters.radius === "within" ? l.distanceKm <= RADIUS_KM : l.distanceKm > RADIUS_KM;
      });
    }

    switch (filters.sortBy) {
      case "Price: Low to High":
        result.sort((a, b) => (a.monthlyRent ?? 0) - (b.monthlyRent ?? 0));
        break;
      case "Price: High to Low":
        result.sort((a, b) => (b.monthlyRent ?? 0) - (a.monthlyRent ?? 0));
        break;
      case "Rating: High to Low":
        result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case "Newest First":
        result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      default:
        if (userLocation) {
          // default sort by distance when user location is set
          result.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
        }
        break;
    }

    return result;
  }, [withDistance, where, filters, userLocation]);

  // Counts of within/beyond in filtered listings before radius filter (for UI hints)
  const radiusCounts = useMemo(() => {
    if (!userLocation) return null;
    let within = 0, beyond = 0, missing = 0;
    withDistance.forEach(l => {
      if (l.distanceKm == null) missing++;
      else if (l.distanceKm <= RADIUS_KM) within++;
      else beyond++;
    });
    return { within, beyond, missing };
  }, [withDistance, userLocation]);

  const mappableListings = useMemo(
    () => filteredListings.filter(l => l.latitude != null && l.longitude != null),
    [filteredListings]
  );

  const mapCenter = useMemo(() => {
    if (userLocation) return userLocation;
    if (mappableListings.length > 0) {
      return { lat: mappableListings[0].latitude, lng: mappableListings[0].longitude };
    }
    return DEFAULT_CENTER;
  }, [userLocation, mappableListings]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.sortBy !== "Any") n++;
    if (filters.propertyType !== "Any") n++;
    if (filters.city !== "Any") n++;
    if (filters.bedrooms !== "Any") n++;
    if (filters.bathrooms !== "Any") n++;
    if (filters.furnishing !== "Any") n++;
    if (filters.petPolicy !== "Any") n++;
    if (filters.areaMin || filters.areaMax) n++;
    if (filters.radius !== "all") n++;
    return n;
  }, [filters]);

  return (
    <div className="w-[100%] min-h-[100vh] bg-gray-50 flex flex-col relative">
      <Header
        where={where}
        setWhere={setWhere}
        when={when}
        setWhen={setWhen}
        isAuthenticated={isAuthenticated}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        navigate={navigate}
      />

      {error && (
        <div className="max-w-7xl mx-auto w-full px-6 pt-4">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold">Couldn't load listings</div>
              <div className="text-xs mt-0.5 opacity-80">
                {error.message || "Please try again."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Radius toolbar */}
      <div className="w-full bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
          {!userLocation ? (
            <>
              <button
                onClick={requestLocation}
                disabled={geoLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
              >
                {geoLoading ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
                {geoLoading ? "Locating..." : `Use my location (${RADIUS_KM}km radius)`}
              </button>
              {geoError && (
                <span className="text-xs text-amber-700 inline-flex items-center gap-1">
                  <AlertCircle size={12} />
                  {geoError}
                </span>
              )}
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                <Navigation2 size={14} className="text-[#EC6138]" />
                Your location set
              </div>
              <div className="inline-flex rounded-full bg-gray-100 p-1 gap-1">
                <RadiusChip active={filters.radius === "all"} onClick={() => handleFilterChange("radius", "all")}>
                  All {radiusCounts && `· ${radiusCounts.within + radiusCounts.beyond}`}
                </RadiusChip>
                <RadiusChip active={filters.radius === "within"} onClick={() => handleFilterChange("radius", "within")}>
                  Within {RADIUS_KM}km {radiusCounts && `· ${radiusCounts.within}`}
                </RadiusChip>
                <RadiusChip active={filters.radius === "beyond"} onClick={() => handleFilterChange("radius", "beyond")}>
                  Beyond {RADIUS_KM}km {radiusCounts && `· ${radiusCounts.beyond}`}
                </RadiusChip>
              </div>
              <button
                onClick={clearLocation}
                className="text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 ml-auto"
              >
                <X size={12} /> Clear location
              </button>
            </>
          )}
        </div>
      </div>

      <div className="w-[100%] flex-1 flex">
        <div className={`${showMap ? "w-[40%]" : "w-[100%]"} overflow-y-auto transition-all duration-300`}>
          <div className="w-[100%] max-w-[48rem] mx-auto px-[1.5rem] py-[1.5rem]">
            <div className="flex items-center justify-between mb-[1.5rem] flex-wrap gap-[1rem]">
              <div>
                <h1 className="text-[1.5rem] font-bold text-gray-800">
                  {loading
                    ? "Searching..."
                    : `${filteredListings.length} ${filteredListings.length === 1 ? "property" : "properties"} found`}
                </h1>
                {where && <p className="text-sm text-gray-500 mt-1">Searching for: "{where}"</p>}
                {userLocation && filters.radius !== "all" && (
                  <p className="text-xs text-[#EC6138] font-medium mt-1">
                    Showing {filters.radius === "within" ? `within ${RADIUS_KM}km` : `beyond ${RADIUS_KM}km`} of your location
                  </p>
                )}
              </div>
              <div className="flex items-center gap-[0.5rem]">
                <button
                  onClick={() => setShowMap(!showMap)}
                  className="flex items-center gap-[0.25rem] px-[0.75rem] py-[0.5rem] bg-white border border-gray-200 rounded-lg text-[0.875rem] text-gray-700 hover:shadow-md transition"
                >
                  {showMap ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  <span>{showMap ? "Hide Map" : "Show Map"}</span>
                </button>
                <button
                  onClick={() => setShowFilters(true)}
                  className="flex items-center gap-[0.25rem] px-[0.75rem] py-[0.5rem] bg-white border border-gray-200 rounded-lg text-[0.875rem] text-gray-700 hover:shadow-md transition"
                >
                  <SlidersHorizontal size={16} />
                  <span>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</span>
                </button>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="mb-[1.5rem] flex flex-wrap gap-[0.5rem]">
                <span className="text-xs text-gray-500 mr-2">Active filters:</span>
                {filters.sortBy !== "Any" && <Chip label={`Sort: ${filters.sortBy}`} />}
                {filters.propertyType !== "Any" && <Chip label={filters.propertyType} />}
                {filters.city !== "Any" && <Chip label={filters.city} />}
                {filters.bedrooms !== "Any" && <Chip label={`${filters.bedrooms} ${filters.bedrooms === "1" ? "Bed" : "Beds"}`} />}
                {filters.bathrooms !== "Any" && <Chip label={`${filters.bathrooms} ${filters.bathrooms === "1" ? "Bath" : "Baths"}`} />}
                {(filters.areaMin || filters.areaMax) && (
                  <Chip label={`${filters.areaMin || 0}-${filters.areaMax || "∞"} m²`} />
                )}
                {filters.furnishing !== "Any" && <Chip label={filters.furnishing} />}
                {filters.petPolicy !== "Any" && <Chip label={filters.petPolicy} />}
                {filters.radius !== "all" && (
                  <Chip label={filters.radius === "within" ? `Within ${RADIUS_KM}km` : `Beyond ${RADIUS_KM}km`} />
                )}
                <button
                  onClick={resetFilters}
                  className="text-xs text-[#EC6138] font-semibold ml-2 hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-500">
                <Loader2 className="animate-spin mr-2" size={20} />
                Loading listings...
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-[3rem]">
                <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Search size={28} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No properties found</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  {listings.length === 0
                    ? "There are no listings yet. Check back soon or create one yourself!"
                    : "Try adjusting your search or filters."}
                </p>
                {listings.length > 0 && (
                  <button
                    onClick={() => { setWhere(""); resetFilters(); }}
                    className="mt-4 px-4 py-2 bg-[#EC6138] text-white rounded-lg hover:opacity-90 transition"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className={`w-[100%] grid grid-cols-1 ${showMap ? "md:grid-cols-2" : "md:grid-cols-3 lg:grid-cols-4"} gap-[1.5rem]`}>
                {filteredListings.map(listing => (
                  <div key={listing.id} className="relative">
                    <PropertyCard property={listing} />
                    {listing.distanceKm != null && (
                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-full px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-md flex items-center gap-1">
                        <Navigation2 size={10} className="text-[#EC6138]" />
                        {listing.distanceKm < 10
                          ? `${listing.distanceKm.toFixed(1)} km`
                          : `${Math.round(listing.distanceKm)} km`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showMap && (
          <div className="w-[60%] h-[calc(100vh-180px)] sticky top-[180px]">
            <div className="w-[100%] h-[100%] bg-gray-200 relative">
              <MapView
                center={mapCenter}
                listings={mappableListings}
                userLocation={userLocation}
                activeMarker={activeMarker}
                setActiveMarker={setActiveMarker}
                onSelectProperty={(id) => navigate(`/unit/${id}`)}
              />
              <button
                onClick={() => setShowMap(false)}
                className="absolute top-[1rem] left-[1rem] bg-white p-[0.5rem] rounded-full shadow-md hover:shadow-lg transition z-10"
                aria-label="Close map"
              >
                <X size={18} className="text-gray-600" />
              </button>
              {mappableListings.length === 0 && !loading && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur rounded-full px-4 py-2 shadow text-xs text-gray-600 flex items-center gap-2 z-10">
                  <MapPin size={14} />
                  No properties have map coordinates yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onReset={resetFilters}
          onClose={() => setShowFilters(false)}
          cityOptions={cityOptions}
          propertyTypeOptions={propertyTypeOptions}
          showBedroomsDropdown={showBedroomsDropdown}
          setShowBedroomsDropdown={setShowBedroomsDropdown}
          showBathroomsDropdown={showBathroomsDropdown}
          setShowBathroomsDropdown={setShowBathroomsDropdown}
          userLocation={userLocation}
        />
      )}
    </div>
  );
}

function RadiusChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
        active ? "bg-white text-[#EC6138] shadow" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function Chip({ label }) {
  return <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">{label}</span>;
}

function Header({ where, setWhere, when, setWhen, isAuthenticated, dropdownOpen, setDropdownOpen, navigate }) {
  const { user, profile } = useAuth();
  const initial = (profile?.full_name || user?.email || "?").charAt(0).toUpperCase();

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
        <div
          onClick={() => navigate("/home2")}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
        >
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <span className="font-black text-lg" style={{ color: "#e8756a" }}>V</span>
          </div>
          <span className="font-bold text-white text-lg tracking-wide">ViewxRent</span>
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

          {isAuthenticated ? (
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
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="text-white text-[0.875rem] font-medium hover:opacity-80 transition"
            >
              Sign In
            </button>
          )}

          {dropdownOpen && <ProfileDropdown />}
        </div>
      </div>

      <div className="w-[100%] max-w-[42rem] mx-auto px-[1rem] pb-[1.5rem]">
        <div className="bg-white rounded-2xl shadow-lg p-[0.5rem] flex flex-row gap-0">
          <div className="flex flex-col flex-1 px-[1rem] py-[0.5rem] border-r border-gray-200">
            <span className="text-xs font-semibold text-gray-700">Where</span>
            <input
              value={where}
              onChange={e => setWhere(e.target.value)}
              placeholder="Search by title, location, or type..."
              className="bg-transparent text-xs text-gray-500 placeholder-gray-400 outline-none w-[100%] mt-[0.125rem]"
            />
          </div>
          <div className="flex flex-col flex-1 px-[1rem] py-[0.5rem]">
            <span className="text-xs font-semibold text-gray-700">When</span>
            <input
              value={when}
              onChange={e => setWhen(e.target.value)}
              placeholder="Add dates"
              className="bg-transparent text-xs text-gray-500 placeholder-gray-400 outline-none w-[100%] mt-[0.125rem]"
            />
          </div>
          <div className="flex items-center pr-[0.5rem]">
            <button
              style={{ background: "#EC6138" }}
              className="flex items-center justify-center w-[2.25rem] h-[2.25rem] rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all"
            >
              <Search size={15} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function MapView({ center, listings, userLocation, activeMarker, setActiveMarker, onSelectProperty }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "vxr-google-map",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: MAP_LIBRARIES,
  });

  if (loadError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-sm text-gray-500 p-6 text-center">
        <AlertCircle size={28} className="mb-2 text-gray-400" />
        Map failed to load. Check that your Google Maps API key is valid and has Maps JavaScript API enabled.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-sm text-gray-500">
        <Loader2 className="animate-spin mr-2" size={18} />
        Loading map...
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={center}
      zoom={userLocation ? 13 : listings.length > 0 ? 13 : 11}
      options={{
        disableDefaultUI: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      {/* User location marker + 5km radius circle */}
      {userLocation && (
        <>
          <MarkerF
            position={userLocation}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 3,
            }}
            title="Your location"
          />
          <CircleF
            center={userLocation}
            radius={RADIUS_KM * 1000}
            options={{
              strokeColor: "#EC6138",
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: "#EC6138",
              fillOpacity: 0.08,
              clickable: false,
            }}
          />
        </>
      )}

      {listings.map(l => (
        <MarkerF
          key={l.id}
          position={{ lat: l.latitude, lng: l.longitude }}
          onClick={() => setActiveMarker(l.id)}
          label={{
            text: l.monthlyRent ? `₱${Math.round(l.monthlyRent / 1000)}k` : "•",
            color: "white",
            fontSize: "11px",
            fontWeight: "600",
          }}
        >
          {activeMarker === l.id && (
            <InfoWindowF onCloseClick={() => setActiveMarker(null)}>
              <div className="max-w-[220px]">
                {l.img && (
                  <img src={l.img} alt={l.title} className="w-full h-24 object-cover rounded-md mb-2" />
                )}
                <div className="font-semibold text-sm text-slate-900 leading-tight">{l.title}</div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <MapPin size={11} /> {l.location}
                </div>
                {l.distanceKm != null && (
                  <div className="text-[11px] text-[#EC6138] font-semibold mt-1 flex items-center gap-1">
                    <Navigation2 size={10} />
                    {l.distanceKm < 10 ? `${l.distanceKm.toFixed(1)}` : Math.round(l.distanceKm)} km away
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="text-sm font-bold text-[#EC6138]">
                    {l.price || "—"}
                  </div>
                  {l.rating > 0 && (
                    <div className="flex items-center gap-1 text-xs text-slate-700">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      {l.rating}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onSelectProperty(l.id)}
                  className="mt-2 w-full text-xs font-semibold text-white bg-[#EC6138] rounded-md py-1.5 hover:opacity-90"
                >
                  View details
                </button>
              </div>
            </InfoWindowF>
          )}
        </MarkerF>
      ))}
    </GoogleMap>
  );
}

function FilterPanel({
  filters, onChange, onReset, onClose,
  cityOptions, propertyTypeOptions,
  showBedroomsDropdown, setShowBedroomsDropdown,
  showBathroomsDropdown, setShowBathroomsDropdown,
  userLocation,
}) {
  const bedroomsOptions = ["Any", "1", "2", "3", "4", "5+"];
  const bathroomsOptions = ["Any", "1", "2", "3", "4+"];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 w-[100%] max-w-[28rem] h-[100%] bg-white z-50 shadow-2xl overflow-y-auto">
        <div className="p-[1.5rem]">
          <div className="flex items-center justify-between mb-[1.5rem] pb-[1rem] border-b border-gray-200">
            <div className="flex items-center gap-[0.5rem]">
              <SlidersHorizontal size={20} className="text-gray-700" />
              <h2 className="text-[1.25rem] font-semibold text-gray-800">Filters</h2>
            </div>
            <div className="flex items-center gap-[1rem]">
              <button onClick={onReset} className="text-[0.875rem] text-gray-500 hover:text-[#EC6138] transition">
                Reset All
              </button>
              <button onClick={onClose} className="p-[0.5rem] hover:bg-gray-100 rounded-full transition">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-[1.5rem]">
            {userLocation && (
              <div>
                <label className="block text-[0.875rem] font-medium text-gray-700 mb-[0.5rem]">Distance from you</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: "all", l: "All" },
                    { v: "within", l: `≤ ${RADIUS_KM} km` },
                    { v: "beyond", l: `> ${RADIUS_KM} km` },
                  ].map(o => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => onChange("radius", o.v)}
                      className={`p-2.5 text-sm rounded-lg border-2 transition font-medium ${
                        filters.radius === o.v
                          ? "border-[#EC6138] bg-orange-50 text-[#EC6138]"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <SelectField
              label="Sort By"
              value={filters.sortBy}
              onChange={v => onChange("sortBy", v)}
              options={["Any", "Price: Low to High", "Price: High to Low", "Rating: High to Low", "Newest First"]}
            />
            <SelectField label="Property Type" value={filters.propertyType} onChange={v => onChange("propertyType", v)} options={propertyTypeOptions} />
            <SelectField label="City" value={filters.city} onChange={v => onChange("city", v)} options={cityOptions} />

            <CustomDropdown label="Bedrooms" value={filters.bedrooms} onChange={v => onChange("bedrooms", v)} options={bedroomsOptions} open={showBedroomsDropdown} setOpen={setShowBedroomsDropdown} />
            <CustomDropdown label="Bathrooms" value={filters.bathrooms} onChange={v => onChange("bathrooms", v)} options={bathroomsOptions} open={showBathroomsDropdown} setOpen={setShowBathroomsDropdown} />

            <div>
              <label className="block text-[0.875rem] font-medium text-gray-700 mb-[0.5rem]">Area (m²)</label>
              <div className="flex items-center gap-[1rem]">
                <div className="flex-1">
                  <span className="text-[0.75rem] text-gray-500 block mb-[0.25rem]">Min</span>
                  <input type="number" value={filters.areaMin} placeholder="0"
                    onChange={e => onChange("areaMin", e.target.value)}
                    className="w-full p-[0.75rem] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EC6138]" min="0" />
                </div>
                <span className="text-gray-400 mt-5">to</span>
                <div className="flex-1">
                  <span className="text-[0.75rem] text-gray-500 block mb-[0.25rem]">Max</span>
                  <input type="number" value={filters.areaMax} placeholder="∞"
                    onChange={e => onChange("areaMax", e.target.value)}
                    className="w-full p-[0.75rem] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EC6138]" min="0" />
                </div>
              </div>
            </div>

            <SelectField label="Furnishing" value={filters.furnishing} onChange={v => onChange("furnishing", v)} options={["Any", "Fully Furnished", "Semi-Furnished", "Unfurnished"]} />
            <SelectField label="Pet Policy" value={filters.petPolicy} onChange={v => onChange("petPolicy", v)} options={["Any", "Pets Allowed", "No Pets", "Small Pets Only"]} />
          </div>

          <div className="mt-[2rem] pt-[1rem] border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full py-[0.875rem] text-white font-semibold rounded-lg transition hover:opacity-90"
              style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
            >
              Show results
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[0.875rem] font-medium text-gray-700 mb-[0.5rem]">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full p-[0.75rem] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EC6138] bg-white"
      >
        {options.map(opt => <option key={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function CustomDropdown({ label, value, onChange, options, open, setOpen }) {
  return (
    <div>
      <label className="block text-[0.875rem] font-medium text-gray-700 mb-[0.5rem]">{label}</label>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full p-[0.75rem] border border-gray-200 rounded-lg flex items-center justify-between bg-white hover:bg-gray-50"
          type="button"
        >
          <span className="text-gray-700">{value}</span>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {open && (
          <div className="absolute top-full left-0 w-full mt-[0.25rem] bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            {options.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => { onChange(option); setOpen(false); }}
                className={`w-full text-left px-[1rem] py-[0.5rem] hover:bg-gray-100 transition ${value === option ? "bg-orange-50 text-[#EC6138]" : "text-gray-700"}`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
