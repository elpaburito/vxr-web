import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import {
  fetchRegions,
  fetchProvincesByRegion,
  fetchCitiesByRegion,
  fetchCitiesByProvince,
  fetchBarangays,
  warmStart,
  isNcrRegion,
} from "../lib/psgcService";

function PickerModal({ title, items, onClose, onPick }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((it) => it.name.toLowerCase().includes(q))
    : items;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vxr-text/40 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-vxr-surface rounded-vxr-sheet shadow-vxr-lg w-full max-w-lg flex flex-col"
        style={{ maxHeight: "80vh" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-vxr-border">
          <h3 className="font-display text-base font-extrabold text-vxr-text">{title}</h3>
          <button
            onClick={onClose}
            className="text-vxr-text-sub hover:text-vxr-text"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-vxr-text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full pl-9 pr-3 py-2.5 bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md font-body text-sm text-vxr-text placeholder:text-vxr-text-muted outline-none focus:border-vxr-accent transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {filtered.length === 0 ? (
            <p className="text-center font-body text-sm text-vxr-text-sub py-8">
              {q ? `No matches for "${query}"` : "No options available"}
            </p>
          ) : (
            <ul>
              {filtered.map((it) => (
                <li key={it.code}>
                  <button
                    onClick={() => onPick(it)}
                    className="w-full text-left px-4 py-2.5 font-body text-sm text-vxr-text hover:bg-vxr-surface2 rounded-vxr-sm transition-colors"
                  >
                    {it.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, placeholder, loading, enabled, onClick }) {
  const has = value && value.length > 0;
  return (
    <button
      type="button"
      disabled={!enabled || loading}
      onClick={onClick}
      className={`w-full flex items-center text-left px-3.5 py-2.5 rounded-vxr-md border-[1.5px] transition-colors ${
        enabled
          ? "bg-vxr-surface2 border-vxr-border hover:border-vxr-border-strong"
          : "bg-vxr-surface2/60 border-vxr-border cursor-not-allowed"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-body text-[10px] uppercase font-semibold text-vxr-text-sub tracking-wider">
          {label}
        </p>
        <p
          className={`font-body text-sm mt-0.5 truncate ${
            has ? "text-vxr-text font-medium" : "text-vxr-text-muted"
          }`}
        >
          {has ? value : placeholder}
        </p>
      </div>
      {loading ? (
        <Loader2 size={16} className="animate-spin text-vxr-text-muted flex-shrink-0" />
      ) : (
        <ChevronDown
          size={18}
          className={
            enabled
              ? "text-vxr-text-sub flex-shrink-0"
              : "text-vxr-text-muted flex-shrink-0"
          }
        />
      )}
    </button>
  );
}

// ─── Cascading region → province → city → barangay picker ─────────────
export default function PsgcLocationField({
  initialProvinceName,
  initialCityName,
  initialBarangayName,
  onChange,
}) {
  const [region, setRegion] = useState(null);
  const [province, setProvince] = useState(null);
  const [city, setCity] = useState(null);
  const [barangay, setBarangay] = useState(null);

  const [loading, setLoading] = useState({ regions: true, provinces: false, cities: false, barangays: false });
  const [picker, setPicker] = useState(null); // { kind, items, title }
  const [error, setError] = useState(null);

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const emit = useCallback((next) => {
    onChangeRef.current?.({
      region: next.region ?? null,
      province: next.province ?? null,
      city: next.city ?? null,
      barangay: next.barangay ?? null,
    });
  }, []);

  // Bootstrap: load regions, then warm-start from initial values if any.
  // lastSeed dedup must be set AFTER the fetch succeeds — otherwise React
  // StrictMode's mount→cleanup→remount sequence locks out the remount and
  // leaves loading.regions stuck on true.
  const lastSeed = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const seed = `${initialProvinceName ?? ""}|${initialCityName ?? ""}|${initialBarangayName ?? ""}`;

    (async () => {
      try {
        setLoading((l) => ({ ...l, regions: true }));
        await fetchRegions();
        if (cancelled) return;
        if (lastSeed.current === seed) return;
        lastSeed.current = seed;

        const hasSeed =
          (initialProvinceName ?? "").trim() ||
          (initialCityName ?? "").trim() ||
          (initialBarangayName ?? "").trim();
        if (hasSeed) {
          const ws = await warmStart({
            provinceName: initialProvinceName,
            cityName: initialCityName,
            barangayName: initialBarangayName,
          });
          if (cancelled) return;
          if (ws.region)    setRegion(ws.region);
          if (ws.province)  setProvince(ws.province);
          if (ws.city)      setCity(ws.city);
          if (ws.barangay)  setBarangay(ws.barangay);
          if (ws.region || ws.province || ws.city || ws.barangay) {
            emit({ region: ws.region, province: ws.province, city: ws.city, barangay: ws.barangay });
          }
        }
      } catch {
        if (!cancelled) setError("Could not load locations.");
      } finally {
        setLoading((l) => (l.regions ? { ...l, regions: false } : l));
      }
    })();
    return () => { cancelled = true; };
  }, [initialProvinceName, initialCityName, initialBarangayName, emit]);

  const provinceSkipped = !!region && isNcrRegion(region.code);

  const openRegions = async () => {
    setLoading((l) => ({ ...l, regions: true }));
    try {
      const items = await fetchRegions();
      setPicker({ kind: "region", items, title: "Select Region" });
    } catch { setError("Could not load regions."); }
    finally { setLoading((l) => ({ ...l, regions: false })); }
  };

  const openProvinces = async () => {
    if (!region || provinceSkipped) return;
    setLoading((l) => ({ ...l, provinces: true }));
    try {
      const items = await fetchProvincesByRegion(region.code);
      setPicker({ kind: "province", items, title: "Select Province" });
    } catch { setError("Could not load provinces."); }
    finally { setLoading((l) => ({ ...l, provinces: false })); }
  };

  const openCities = async () => {
    if (!region) return;
    if (!provinceSkipped && !province) return;
    setLoading((l) => ({ ...l, cities: true }));
    try {
      const items = province
        ? await fetchCitiesByProvince(province.code)
        : await fetchCitiesByRegion(region.code);
      setPicker({ kind: "city", items, title: "Select City / Municipality" });
    } catch { setError("Could not load cities."); }
    finally { setLoading((l) => ({ ...l, cities: false })); }
  };

  const openBarangays = async () => {
    if (!city) return;
    setLoading((l) => ({ ...l, barangays: true }));
    try {
      const items = await fetchBarangays(city.code);
      setPicker({ kind: "barangay", items, title: "Select Barangay" });
    } catch { setError("Could not load barangays."); }
    finally { setLoading((l) => ({ ...l, barangays: false })); }
  };

  const handlePick = (item) => {
    if (!picker) return;
    const next = { region, province, city, barangay };
    if (picker.kind === "region") {
      next.region = item; next.province = null; next.city = null; next.barangay = null;
      setRegion(item); setProvince(null); setCity(null); setBarangay(null);
    } else if (picker.kind === "province") {
      next.province = item; next.city = null; next.barangay = null;
      setProvince(item); setCity(null); setBarangay(null);
    } else if (picker.kind === "city") {
      next.city = item; next.barangay = null;
      setCity(item); setBarangay(null);
    } else if (picker.kind === "barangay") {
      next.barangay = item;
      setBarangay(item);
    }
    setPicker(null);
    emit(next);
  };

  const provinceLabel = provinceSkipped ? "Province (Not applicable for NCR)" : "Province";
  const provincePlaceholder = !region
    ? "Select region first"
    : provinceSkipped ? "Skipped — NCR has no provinces" : "Select province";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Row
        label="Region"
        value={region?.name}
        placeholder="Select region"
        loading={loading.regions}
        enabled={!loading.regions}
        onClick={openRegions}
      />
      <Row
        label={provinceLabel}
        value={province?.name}
        placeholder={provincePlaceholder}
        loading={loading.provinces}
        enabled={!!region && !provinceSkipped && !loading.provinces}
        onClick={openProvinces}
      />
      <Row
        label="City / Municipality"
        value={city?.name}
        placeholder={
          !region ? "Select region first"
            : (!provinceSkipped && !province) ? "Select province first"
            : "Select city / municipality"
        }
        loading={loading.cities}
        enabled={!!region && (provinceSkipped || !!province) && !loading.cities}
        onClick={openCities}
      />
      <Row
        label="Barangay"
        value={barangay?.name}
        placeholder={!city ? "Select city first" : "Select barangay"}
        loading={loading.barangays}
        enabled={!!city && !loading.barangays}
        onClick={openBarangays}
      />
      {error && (
        <p className="md:col-span-2 font-body text-xs text-vxr-danger">{error}</p>
      )}
      {picker && (
        <PickerModal
          title={picker.title}
          items={picker.items}
          onClose={() => setPicker(null)}
          onPick={handlePick}
        />
      )}
    </div>
  );
}
