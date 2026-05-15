import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Search, ChevronDown, ChevronUp,
  Maximize2, Minimize2, X,
  SlidersHorizontal, MapPin, Loader2, AlertCircle, Star,
  Crosshair, Navigation2,
} from "lucide-react";
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, CircleF } from "@react-google-maps/api";
import PropertyCard from "./components/PropertyCard.jsx";
import AppHeader from "./components/AppHeader.jsx";
import { useListings } from "./hooks/useListings";
import {
  PageHero, SearchBar, Button, Chip as VxrChip, EmptyState,
} from "./components/vxr";
import Footer from "./Footer.jsx";

const DEFAULT_CENTER = { lat: 14.3294, lng: 120.9367 };
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
  radius: "all",
};

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
  const { listings, loading, error } = useListings();

  const [where, setWhere] = useState("");
  const [showMap, setShowMap] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [activeMarker, setActiveMarker] = useState(null);
  const [showBedroomsDropdown, setShowBedroomsDropdown] = useState(false);
  const [showBathroomsDropdown, setShowBathroomsDropdown] = useState(false);

  const [userLocation, setUserLocation] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);

  useEffect(() => {
    if (location.state?.searchQuery) setWhere(location.state.searchQuery);

    const sortParam = searchParams.get("sort");
    if (sortParam === "rating") setFilters((f) => ({ ...f, sortBy: "Rating: High to Low" }));
    else if (sortParam === "price-asc") setFilters((f) => ({ ...f, sortBy: "Price: Low to High" }));
    else if (sortParam === "price-desc") setFilters((f) => ({ ...f, sortBy: "Price: High to Low" }));
    else if (sortParam === "newest") setFilters((f) => ({ ...f, sortBy: "Newest First" }));
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
    setFilters((f) => ({ ...f, radius: "all" }));
  }, []);

  const cityOptions = useMemo(() => {
    const cities = new Set();
    listings.forEach((l) => l.city && cities.add(l.city));
    return ["Any", ...Array.from(cities).sort()];
  }, [listings]);

  const propertyTypeOptions = useMemo(() => {
    const types = new Set();
    listings.forEach((l) => l.propertyType && types.add(l.propertyType));
    return [
      "Any",
      ...Array.from(types)
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
        .sort(),
    ];
  }, [listings]);

  const withDistance = useMemo(() => {
    if (!userLocation) return listings.map((l) => ({ ...l, distanceKm: null }));
    return listings.map((l) => {
      if (l.latitude == null || l.longitude == null) return { ...l, distanceKm: null };
      const d = distanceKm(userLocation, { lat: l.latitude, lng: l.longitude });
      return { ...l, distanceKm: d };
    });
  }, [listings, userLocation]);

  const filteredListings = useMemo(() => {
    let result = [...withDistance];

    if (where.trim()) {
      const q = where.toLowerCase();
      result = result.filter((l) =>
        [l.title, l.location, l.city, l.barangay, l.type, l.propertyType]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q))
      );
    }

    if (filters.propertyType !== "Any") {
      result = result.filter(
        (l) => (l.propertyType || "").toLowerCase() === filters.propertyType.toLowerCase()
      );
    }
    if (filters.city !== "Any") {
      result = result.filter((l) => (l.city || "").toLowerCase() === filters.city.toLowerCase());
    }
    if (filters.bedrooms !== "Any") {
      if (filters.bedrooms === "5+") result = result.filter((l) => (l.bedrooms ?? 0) >= 5);
      else result = result.filter((l) => (l.bedrooms ?? 0) === parseInt(filters.bedrooms, 10));
    }
    if (filters.bathrooms !== "Any") {
      if (filters.bathrooms === "4+") result = result.filter((l) => (l.bathrooms ?? 0) >= 4);
      else result = result.filter((l) => (l.bathrooms ?? 0) === parseInt(filters.bathrooms, 10));
    }
    const min = parseInt(filters.areaMin, 10);
    const max = parseInt(filters.areaMax, 10);
    if (!isNaN(min)) result = result.filter((l) => (l.area ?? 0) >= min);
    if (!isNaN(max)) result = result.filter((l) => (l.area ?? 0) <= max);

    if (filters.furnishing !== "Any") {
      const v = filters.furnishing.toLowerCase();
      result = result.filter((l) => (l.furnishing || "").toLowerCase().includes(v.split(" ")[0]));
    }
    if (filters.petPolicy !== "Any") {
      const v = filters.petPolicy.toLowerCase();
      result = result.filter((l) => (l.petPolicy || "").toLowerCase().includes(v.split(" ")[0]));
    }

    if (userLocation && filters.radius !== "all") {
      result = result.filter((l) => {
        if (l.distanceKm == null) return false;
        return filters.radius === "within"
          ? l.distanceKm <= RADIUS_KM
          : l.distanceKm > RADIUS_KM;
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
          result.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
        }
        break;
    }

    return result;
  }, [withDistance, where, filters, userLocation]);

  const radiusCounts = useMemo(() => {
    if (!userLocation) return null;
    let within = 0,
      beyond = 0,
      missing = 0;
    withDistance.forEach((l) => {
      if (l.distanceKm == null) missing++;
      else if (l.distanceKm <= RADIUS_KM) within++;
      else beyond++;
    });
    return { within, beyond, missing };
  }, [withDistance, userLocation]);

  const mappableListings = useMemo(
    () => filteredListings.filter((l) => l.latitude != null && l.longitude != null),
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
    setFilters((prev) => ({ ...prev, [key]: value }));
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
    <div className="w-full min-h-screen bg-vxr-bg flex flex-col relative">
      <AppHeader />

      <PageHero
        eyebrow={loading ? "Searching..." : `${filteredListings.length} results`}
        title="Search rentals"
        subtitle="Filter by city, type, price — find homes that match the way you live."
      >
        <SearchBar
          placeholder="Search by title, location, or type..."
          value={where}
          onChange={(e) => setWhere(e.target.value)}
          onFilter={() => setShowFilters(true)}
          className="max-w-2xl"
        />
      </PageHero>

      {error && (
        <div className="max-w-7xl mx-auto w-full px-6 pt-4">
          <div className="flex items-start gap-3 bg-vxr-warning-soft border border-vxr-warning/30 rounded-vxr-md px-4 py-3 text-vxr-warning font-body text-sm">
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
      <div className="w-full bg-vxr-surface border-b border-vxr-border">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
          {!userLocation ? (
            <>
              <Button
                size="sm"
                icon={geoLoading ? Loader2 : Crosshair}
                disabled={geoLoading}
                onClick={requestLocation}
              >
                {geoLoading ? "Locating..." : `Use my location (${RADIUS_KM}km radius)`}
              </Button>
              {geoError && (
                <span className="font-body text-xs text-vxr-warning inline-flex items-center gap-1">
                  <AlertCircle size={12} />
                  {geoError}
                </span>
              )}
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 font-body text-xs text-vxr-text font-medium">
                <Navigation2 size={14} className="text-vxr-accent" />
                Your location set
              </div>
              <div className="inline-flex rounded-vxr-md bg-vxr-surface2 p-1 gap-1">
                <RadiusChip
                  active={filters.radius === "all"}
                  onClick={() => handleFilterChange("radius", "all")}
                >
                  All {radiusCounts && `· ${radiusCounts.within + radiusCounts.beyond}`}
                </RadiusChip>
                <RadiusChip
                  active={filters.radius === "within"}
                  onClick={() => handleFilterChange("radius", "within")}
                >
                  Within {RADIUS_KM}km {radiusCounts && `· ${radiusCounts.within}`}
                </RadiusChip>
                <RadiusChip
                  active={filters.radius === "beyond"}
                  onClick={() => handleFilterChange("radius", "beyond")}
                >
                  Beyond {RADIUS_KM}km {radiusCounts && `· ${radiusCounts.beyond}`}
                </RadiusChip>
              </div>
              <button
                onClick={clearLocation}
                className="font-body text-xs text-vxr-text-sub hover:text-vxr-text inline-flex items-center gap-1 ml-auto"
              >
                <X size={12} /> Clear location
              </button>
            </>
          )}
        </div>
      </div>

      <div className="w-full flex-1 flex">
        <div
          className={`${
            showMap ? "w-[40%]" : "w-full"
          } overflow-y-auto transition-all duration-300`}
        >
          <div className="w-full max-w-5xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div>
                <h2 className="font-display text-xl font-extrabold text-vxr-text">
                  {loading
                    ? "Searching..."
                    : `${filteredListings.length} ${
                        filteredListings.length === 1 ? "property" : "properties"
                      } found`}
                </h2>
                {where && (
                  <p className="font-body text-sm text-vxr-text-sub mt-1">
                    Searching for: "{where}"
                  </p>
                )}
                {userLocation && filters.radius !== "all" && (
                  <p className="font-body text-xs text-vxr-accent font-medium mt-1">
                    Showing{" "}
                    {filters.radius === "within"
                      ? `within ${RADIUS_KM}km`
                      : `beyond ${RADIUS_KM}km`}{" "}
                    of your location
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-vxr-surface2 rounded-vxr-md p-1 flex">
                  <button
                    onClick={() => setShowMap(false)}
                    className={`px-3 py-1.5 rounded-vxr-sm font-body text-xs font-semibold transition-colors ${
                      !showMap
                        ? "bg-vxr-surface shadow-vxr-sm text-vxr-text"
                        : "text-vxr-text-muted"
                    }`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setShowMap(true)}
                    className={`px-3 py-1.5 rounded-vxr-sm font-body text-xs font-semibold transition-colors ${
                      showMap
                        ? "bg-vxr-surface shadow-vxr-sm text-vxr-text"
                        : "text-vxr-text-muted"
                    }`}
                  >
                    Map
                  </button>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={SlidersHorizontal}
                  onClick={() => setShowFilters(true)}
                >
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </Button>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="mb-6 flex flex-wrap gap-2 items-center">
                <span className="font-body text-xs text-vxr-text-sub mr-2">
                  Active filters:
                </span>
                {filters.sortBy !== "Any" && (
                  <VxrChip size="sm" label={`Sort: ${filters.sortBy}`} />
                )}
                {filters.propertyType !== "Any" && (
                  <VxrChip size="sm" label={filters.propertyType} />
                )}
                {filters.city !== "Any" && <VxrChip size="sm" label={filters.city} />}
                {filters.bedrooms !== "Any" && (
                  <VxrChip
                    size="sm"
                    label={`${filters.bedrooms} ${
                      filters.bedrooms === "1" ? "Bed" : "Beds"
                    }`}
                  />
                )}
                {filters.bathrooms !== "Any" && (
                  <VxrChip
                    size="sm"
                    label={`${filters.bathrooms} ${
                      filters.bathrooms === "1" ? "Bath" : "Baths"
                    }`}
                  />
                )}
                {(filters.areaMin || filters.areaMax) && (
                  <VxrChip
                    size="sm"
                    label={`${filters.areaMin || 0}-${filters.areaMax || "∞"} m²`}
                  />
                )}
                {filters.furnishing !== "Any" && (
                  <VxrChip size="sm" label={filters.furnishing} />
                )}
                {filters.petPolicy !== "Any" && (
                  <VxrChip size="sm" label={filters.petPolicy} />
                )}
                {filters.radius !== "all" && (
                  <VxrChip
                    size="sm"
                    label={
                      filters.radius === "within"
                        ? `Within ${RADIUS_KM}km`
                        : `Beyond ${RADIUS_KM}km`
                    }
                  />
                )}
                <button
                  onClick={resetFilters}
                  className="font-body text-xs text-vxr-accent font-semibold ml-2 hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16 font-body text-vxr-text-sub">
                <Loader2 className="animate-spin mr-2" size={20} />
                Loading listings...
              </div>
            ) : filteredListings.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No properties found"
                message={
                  listings.length === 0
                    ? "There are no listings yet. Check back soon or create one yourself!"
                    : "Try adjusting your search or filters."
                }
                action={
                  listings.length > 0 ? (
                    <Button
                      onClick={() => {
                        setWhere("");
                        resetFilters();
                      }}
                    >
                      Clear all filters
                    </Button>
                  ) : null
                }
              />
            ) : (
              <div
                className={`w-full grid grid-cols-1 ${
                  showMap ? "md:grid-cols-2" : "md:grid-cols-3 lg:grid-cols-4"
                } gap-5`}
              >
                {filteredListings.map((listing) => (
                  <div key={listing.id} className="relative">
                    <PropertyCard property={listing} />
                    {listing.distanceKm != null && (
                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-full px-2.5 py-1 font-body text-[10px] font-semibold text-vxr-text shadow-vxr-sm flex items-center gap-1 z-10">
                        <Navigation2 size={10} className="text-vxr-accent" />
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
          <div className="w-[60%] h-[calc(100vh-72px)] sticky top-[72px]">
            <div className="w-full h-full bg-vxr-surface2 relative">
              <MapView
                center={mapCenter}
                listings={mappableListings}
                userLocation={userLocation}
                activeMarker={activeMarker}
                setActiveMarker={setActiveMarker}
                onSelectProperty={(id) => navigate(`/unit/${id}`)}
              />
              {mappableListings.length === 0 && !loading && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur rounded-full px-4 py-2 shadow-vxr-md font-body text-xs text-vxr-text-sub flex items-center gap-2 z-10">
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
      <Footer />
    </div>
  );
}

function RadiusChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-vxr-sm font-body text-xs font-semibold transition ${
        active
          ? "bg-vxr-surface shadow-vxr-sm text-vxr-accent"
          : "text-vxr-text-sub hover:text-vxr-text"
      }`}
    >
      {children}
    </button>
  );
}

function MapView({
  center,
  listings,
  userLocation,
  activeMarker,
  setActiveMarker,
  onSelectProperty,
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "vxr-google-map",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: MAP_LIBRARIES,
  });

  if (loadError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-vxr-surface2 font-body text-sm text-vxr-text-sub p-6 text-center">
        <AlertCircle size={28} className="mb-2 text-vxr-text-muted" />
        Map failed to load. Check that your Google Maps API key is valid and has Maps JavaScript API enabled.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-vxr-surface2 font-body text-sm text-vxr-text-sub">
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
              strokeColor: "#FF7043",
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: "#FF7043",
              fillOpacity: 0.08,
              clickable: false,
            }}
          />
        </>
      )}

      {listings.map((l) => (
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
                  <img
                    src={l.img}
                    alt={l.title}
                    className="w-full h-24 object-cover rounded-md mb-2"
                  />
                )}
                <div className="font-display font-bold text-sm text-vxr-text leading-tight">
                  {l.title}
                </div>
                <div className="font-body text-xs text-vxr-text-sub mt-0.5 flex items-center gap-1">
                  <MapPin size={11} /> {l.location}
                </div>
                {l.distanceKm != null && (
                  <div className="font-body text-[11px] text-vxr-accent font-semibold mt-1 flex items-center gap-1">
                    <Navigation2 size={10} />
                    {l.distanceKm < 10
                      ? `${l.distanceKm.toFixed(1)}`
                      : Math.round(l.distanceKm)}{" "}
                    km away
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="font-display text-sm font-extrabold text-vxr-accent">
                    {l.price || "—"}
                  </div>
                  {l.rating > 0 && (
                    <div className="flex items-center gap-1 font-mono text-xs text-vxr-text">
                      <Star size={11} className="text-vxr-accent" fill="#FF7043" />
                      {l.rating}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onSelectProperty(l.id)}
                  className="mt-2 w-full font-body text-xs font-semibold text-white bg-vxr-gradient rounded-vxr-sm py-1.5 hover:brightness-105"
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
  filters,
  onChange,
  onReset,
  onClose,
  cityOptions,
  propertyTypeOptions,
  showBedroomsDropdown,
  setShowBedroomsDropdown,
  showBathroomsDropdown,
  setShowBathroomsDropdown,
  userLocation,
}) {
  const bedroomsOptions = ["Any", "1", "2", "3", "4", "5+"];
  const bathroomsOptions = ["Any", "1", "2", "3", "4+"];

  return (
    <>
      <div className="fixed inset-0 bg-vxr-text/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 w-full max-w-md h-full bg-vxr-surface z-50 shadow-vxr-lg overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-vxr-border">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={20} className="text-vxr-text" />
              <h2 className="font-display text-xl font-extrabold text-vxr-text">Filters</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onReset}
                className="font-body text-sm text-vxr-text-sub hover:text-vxr-accent transition"
              >
                Reset All
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-vxr-surface2 rounded-full transition text-vxr-text-sub"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {userLocation && (
              <div>
                <label className="block font-body text-sm font-medium text-vxr-text mb-2">
                  Distance from you
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: "all", l: "All" },
                    { v: "within", l: `≤ ${RADIUS_KM} km` },
                    { v: "beyond", l: `> ${RADIUS_KM} km` },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => onChange("radius", o.v)}
                      className={`p-2.5 font-body text-sm rounded-vxr-md border-2 transition font-medium ${
                        filters.radius === o.v
                          ? "border-vxr-accent bg-vxr-accent-soft text-vxr-accent"
                          : "border-vxr-border text-vxr-text hover:border-vxr-border-strong"
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
              onChange={(v) => onChange("sortBy", v)}
              options={[
                "Any",
                "Price: Low to High",
                "Price: High to Low",
                "Rating: High to Low",
                "Newest First",
              ]}
            />
            <SelectField
              label="Property Type"
              value={filters.propertyType}
              onChange={(v) => onChange("propertyType", v)}
              options={propertyTypeOptions}
            />
            <SelectField
              label="City"
              value={filters.city}
              onChange={(v) => onChange("city", v)}
              options={cityOptions}
            />

            <CustomDropdown
              label="Bedrooms"
              value={filters.bedrooms}
              onChange={(v) => onChange("bedrooms", v)}
              options={bedroomsOptions}
              open={showBedroomsDropdown}
              setOpen={setShowBedroomsDropdown}
            />
            <CustomDropdown
              label="Bathrooms"
              value={filters.bathrooms}
              onChange={(v) => onChange("bathrooms", v)}
              options={bathroomsOptions}
              open={showBathroomsDropdown}
              setOpen={setShowBathroomsDropdown}
            />

            <div>
              <label className="block font-body text-sm font-medium text-vxr-text mb-2">
                Area (m²)
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <span className="font-body text-xs text-vxr-text-sub block mb-1">Min</span>
                  <input
                    type="number"
                    value={filters.areaMin}
                    placeholder="0"
                    onChange={(e) => onChange("areaMin", e.target.value)}
                    className="w-full p-3 bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md font-body text-sm outline-none focus:border-vxr-accent"
                    min="0"
                  />
                </div>
                <span className="text-vxr-text-muted mt-5">to</span>
                <div className="flex-1">
                  <span className="font-body text-xs text-vxr-text-sub block mb-1">Max</span>
                  <input
                    type="number"
                    value={filters.areaMax}
                    placeholder="∞"
                    onChange={(e) => onChange("areaMax", e.target.value)}
                    className="w-full p-3 bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md font-body text-sm outline-none focus:border-vxr-accent"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <SelectField
              label="Furnishing"
              value={filters.furnishing}
              onChange={(v) => onChange("furnishing", v)}
              options={["Any", "Fully Furnished", "Semi-Furnished", "Unfurnished"]}
            />
            <SelectField
              label="Pet Policy"
              value={filters.petPolicy}
              onChange={(v) => onChange("petPolicy", v)}
              options={["Any", "Pets Allowed", "No Pets", "Small Pets Only"]}
            />
          </div>

          <div className="mt-8 pt-4 border-t border-vxr-border">
            <Button fullWidth onClick={onClose}>
              Show results
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block font-body text-sm font-medium text-vxr-text mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md font-body text-sm text-vxr-text outline-none focus:border-vxr-accent"
      >
        {options.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function CustomDropdown({ label, value, onChange, options, open, setOpen }) {
  return (
    <div>
      <label className="block font-body text-sm font-medium text-vxr-text mb-2">
        {label}
      </label>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full p-3 bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md flex items-center justify-between hover:border-vxr-border-strong"
          type="button"
        >
          <span className="font-body text-sm text-vxr-text">{value}</span>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {open && (
          <div className="absolute top-full left-0 w-full mt-1 bg-vxr-surface border border-vxr-border rounded-vxr-md shadow-vxr-md z-10 overflow-hidden">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 font-body text-sm hover:bg-vxr-surface2 transition ${
                  value === option
                    ? "bg-vxr-accent-soft text-vxr-accent"
                    : "text-vxr-text"
                }`}
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
