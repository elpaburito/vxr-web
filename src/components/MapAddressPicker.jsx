import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Loader2, MapPin, X, Crosshair } from "lucide-react";

const BRAND = "#F36C6C";
const DARK = "#E85D5D";

const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 }; // Manila

const containerStyle = { width: "100%", height: "100%" };

// Must stay identical (id + libraries + array identity) to the loader
// options used by SearchPage and UnitDetails — @react-google-maps/api's
// global Loader throws "must not be called again with different options"
// if any field, including the libraries array reference, differs.
const MAP_LIBRARIES = ["places"];

// Parse Google's address_components into our four slots, mirroring
// _parseAddressComponents in mobile manage_listing.dart.
function parseComponents(components) {
  let city = "", province = "", barangay = "", postalCode = "";
  for (const comp of components ?? []) {
    const types = comp.types ?? [];
    const longName = comp.long_name ?? "";
    if (types.includes("locality")) city = longName;
    else if (types.includes("administrative_area_level_2") && !city) city = longName;
    else if (types.includes("administrative_area_level_1")) province = longName;
    else if (types.includes("sublocality_level_1") || types.includes("sublocality")) barangay = longName;
    else if (types.includes("neighborhood") && !barangay) barangay = longName;
    else if (types.includes("postal_code")) postalCode = longName;
  }
  return { city, province, barangay, postalCode };
}

export default function MapAddressPicker({ initialPosition, onClose, onPick }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded } = useJsApiLoader({
    id: "vxr-google-map",
    googleMapsApiKey: apiKey,
    libraries: MAP_LIBRARIES,
  });

  const [center, setCenter] = useState(initialPosition ?? DEFAULT_CENTER);
  const [pos, setPos] = useState(initialPosition ?? DEFAULT_CENTER);
  const [address, setAddress] = useState("Move the map to pick a location");
  const [parts, setParts] = useState({ city: "", province: "", barangay: "", postalCode: "" });
  const [loadingAddr, setLoadingAddr] = useState(false);

  const mapRef = useRef(null);
  const debounceRef = useRef(null);

  const reverseGeocode = useCallback(async (latlng) => {
    setLoadingAddr(true);
    try {
      const url =
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latlng.lat},${latlng.lng}&key=${apiKey}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === "OK" && json.results?.[0]) {
        const r = json.results[0];
        setAddress(r.formatted_address ?? "Unknown");
        setParts(parseComponents(r.address_components));
      } else {
        setAddress("No address found for this location");
        setParts({ city: "", province: "", barangay: "", postalCode: "" });
      }
    } catch (err) {
      console.warn("[map-picker] geocode failed:", err?.message ?? err);
      setAddress("Could not determine address");
    } finally {
      setLoadingAddr(false);
    }
  }, [apiKey]);

  // Initial geocode for the starting position
  useEffect(() => {
    reverseGeocode(initialPosition ?? DEFAULT_CENTER);
  }, [initialPosition, reverseGeocode]);

  const onIdle = () => {
    if (!mapRef.current) return;
    const c = mapRef.current.getCenter();
    if (!c) return;
    const next = { lat: c.lat(), lng: c.lng() };
    setPos(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => reverseGeocode(next), 400);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (g) => {
        const c = { lat: g.coords.latitude, lng: g.coords.longitude };
        setCenter(c);
        setPos(c);
        mapRef.current?.panTo(c);
        mapRef.current?.setZoom(16);
        reverseGeocode(c);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const confirm = () => {
    onPick({
      full_address: address,
      city: parts.city,
      province: parts.province,
      barangay: parts.barangay,
      postal_code: parts.postalCode,
      lat: pos.lat,
      lng: pos.lng,
    });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
      >
        <div
          className="flex items-center justify-between px-5 py-3 text-white"
          style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${DARK} 100%)` }}
        >
          <div className="flex items-center gap-2">
            <MapPin size={18} />
            <h3 className="text-base font-bold">Pick Property Location</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="relative" style={{ height: 420 }}>
          {!apiKey ? (
            <div className="h-full w-full flex items-center justify-center text-sm text-gray-600 px-6 text-center">
              Google Maps API key is not configured (VITE_GOOGLE_MAPS_API_KEY).
            </div>
          ) : !isLoaded ? (
            <div className="h-full w-full flex items-center justify-center text-gray-500">
              <Loader2 className="animate-spin mr-2" size={18} /> Loading map…
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={16}
              onLoad={(m) => { mapRef.current = m; }}
              onIdle={onIdle}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
              }}
            >
              <Marker position={pos} />
            </GoogleMap>
          )}

          <button
            type="button"
            onClick={useMyLocation}
            className="absolute top-3 right-3 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-md text-xs font-semibold text-gray-700 hover:bg-gray-50"
            title="Use my location"
          >
            <Crosshair size={13} color={BRAND} />
            My Location
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-start gap-2 mb-3">
            <MapPin size={18} color={BRAND} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {loadingAddr ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 size={14} className="animate-spin" /> Getting address…
                </div>
              ) : (
                <p className="text-sm font-medium text-gray-800">{address}</p>
              )}
            </div>
          </div>

          {!loadingAddr && (parts.city || parts.province || parts.barangay) && (
            <div className="bg-gray-50 rounded-xl p-3 mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {parts.city      && <Pair label="City"      value={parts.city} />}
              {parts.province  && <Pair label="Province"  value={parts.province} />}
              {parts.barangay  && <Pair label="Barangay"  value={parts.barangay} />}
              {parts.postalCode && <Pair label="Postal"    value={parts.postalCode} />}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={loadingAddr}
              className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition hover:opacity-90 disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${DARK} 100%)` }}
            >
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pair({ label, value }) {
  return (
    <div className="flex">
      <span className="text-gray-500 w-16 flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-medium truncate">{value}</span>
    </div>
  );
}
