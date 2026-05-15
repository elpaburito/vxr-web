import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Loader2, MapPin, X, Crosshair } from "lucide-react";
import { Button } from "./vxr";

const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 };

const containerStyle = { width: "100%", height: "100%" };

const MAP_LIBRARIES = ["places"];

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
  // Tracks whether the last position change came from a direct map click.
  // Click ownership wins for ~600ms so the click handler's geocode isn't
  // immediately overwritten by the onIdle handler (which fires next as
  // the map settles after panTo).
  const clickLockRef = useRef(0);

  const reverseGeocode = useCallback(async (latlng) => {
    setLoadingAddr(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latlng.lat},${latlng.lng}&key=${apiKey}`;
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

  useEffect(() => {
    reverseGeocode(initialPosition ?? DEFAULT_CENTER);
  }, [initialPosition, reverseGeocode]);

  const onMapClick = (e) => {
    if (!e?.latLng) return;
    const next = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    clickLockRef.current = Date.now();
    setPos(next);
    mapRef.current?.panTo(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => reverseGeocode(next), 200);
  };

  const onIdle = () => {
    if (!mapRef.current) return;
    // Honor a recent click — the click handler already set position +
    // queued geocoding for the exact click point. The pan-to-center
    // settles via this idle event but should NOT overwrite the click.
    if (Date.now() - clickLockRef.current < 600) return;
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vxr-text/40 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-vxr-surface rounded-vxr-sheet shadow-vxr-lg w-full max-w-3xl flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-vxr-gradient text-white">
          <div className="flex items-center gap-2">
            <MapPin size={18} />
            <h3 className="font-display text-base font-extrabold">
              Pick Property Location
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-vxr-sm transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative" style={{ height: 420 }}>
          {!apiKey ? (
            <div className="h-full w-full flex items-center justify-center font-body text-sm text-vxr-text-sub px-6 text-center">
              Google Maps API key is not configured (VITE_GOOGLE_MAPS_API_KEY).
            </div>
          ) : !isLoaded ? (
            <div className="h-full w-full flex items-center justify-center font-body text-vxr-text-sub">
              <Loader2 className="animate-spin mr-2" size={18} /> Loading map…
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={16}
              onLoad={(m) => {
                mapRef.current = m;
              }}
              onClick={onMapClick}
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
            className="absolute top-3 right-3 flex items-center gap-1.5 bg-vxr-surface px-3 py-1.5 rounded-full shadow-vxr-md font-body text-xs font-semibold text-vxr-text hover:bg-vxr-surface2 border border-vxr-border"
            title="Use my location"
          >
            <Crosshair size={13} className="text-vxr-accent" />
            My Location
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-start gap-2 mb-3">
            <MapPin size={18} className="text-vxr-accent mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {loadingAddr ? (
                <div className="flex items-center gap-2 font-body text-sm text-vxr-text-sub">
                  <Loader2 size={14} className="animate-spin" /> Getting address…
                </div>
              ) : (
                <p className="font-body text-sm font-medium text-vxr-text">{address}</p>
              )}
            </div>
          </div>

          {!loadingAddr && (parts.city || parts.province || parts.barangay) && (
            <div className="bg-vxr-surface2 rounded-vxr-md p-3 mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 font-body text-xs">
              {parts.city && <Pair label="City" value={parts.city} />}
              {parts.province && <Pair label="Province" value={parts.province} />}
              {parts.barangay && <Pair label="Barangay" value={parts.barangay} />}
              {parts.postalCode && <Pair label="Postal" value={parts.postalCode} />}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" disabled={loadingAddr} onClick={confirm}>
              Confirm Location
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pair({ label, value }) {
  return (
    <div className="flex">
      <span className="text-vxr-text-sub w-16 flex-shrink-0">{label}</span>
      <span className="text-vxr-text font-medium truncate">{value}</span>
    </div>
  );
}
