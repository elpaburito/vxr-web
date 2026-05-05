// Cascading PSGC location lookup. Mirrors the mobile psgc_service.dart:
// regions.json (~2 KB), provinces.json (~10 KB), cities.json (~390 KB),
// and barangays.json (~11 MB) ship as static assets in /public/psgc.
// Each tier is fetched lazily on first use, cached in-memory, and any
// concurrent callers de-duped to a single in-flight request.

const BASE = "/psgc";

let _regions = null;
let _provinces = null;
let _cities = null;
let _barangays = null;

let _regionsP = null;
let _provincesP = null;
let _citiesP = null;
let _barangaysP = null;

const byName = (a, b) => a.name.localeCompare(b.name);

async function loadJson(file) {
  const res = await fetch(`${BASE}/${file}`);
  if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status}`);
  return res.json();
}

function ensureRegions() {
  if (_regions) return Promise.resolve(_regions);
  if (_regionsP) return _regionsP;
  _regionsP = loadJson("regions.json").then((rows) => {
    _regions = rows
      .map((r) => ({ code: String(r.code), name: String(r.name) }))
      .sort(byName);
    return _regions;
  }).finally(() => { _regionsP = null; });
  return _regionsP;
}

function ensureProvinces() {
  if (_provinces) return Promise.resolve(_provinces);
  if (_provincesP) return _provincesP;
  _provincesP = loadJson("provinces.json").then((rows) => {
    _provinces = rows
      .map((r) => ({
        code: String(r.code),
        name: String(r.name),
        regionCode: String(r.regionCode ?? ""),
      }))
      .sort(byName);
    return _provinces;
  }).finally(() => { _provincesP = null; });
  return _provincesP;
}

function ensureCities() {
  if (_cities) return Promise.resolve(_cities);
  if (_citiesP) return _citiesP;
  _citiesP = loadJson("cities.json").then((rows) => {
    _cities = rows
      .map((r) => {
        const pc = r.provinceCode;
        return {
          code: String(r.code),
          name: String(r.name),
          regionCode: String(r.regionCode ?? ""),
          provinceCode: pc == null || pc === false ? null : String(pc),
        };
      })
      .sort(byName);
    return _cities;
  }).finally(() => { _citiesP = null; });
  return _citiesP;
}

function ensureBarangays() {
  if (_barangays) return Promise.resolve(_barangays);
  if (_barangaysP) return _barangaysP;
  _barangaysP = loadJson("barangays.json").then((rows) => {
    _barangays = rows
      .map((r) => {
        const cc = r.cityCode;
        const mc = r.municipalityCode;
        const parent =
          cc != null && cc !== false ? String(cc)
            : mc != null && mc !== false ? String(mc)
            : "";
        return { code: String(r.code), name: String(r.name), parentCode: parent };
      })
      .sort(byName);
    return _barangays;
  }).finally(() => { _barangaysP = null; });
  return _barangaysP;
}

export const fetchRegions = () => ensureRegions();

export async function fetchProvincesByRegion(regionCode) {
  const all = await ensureProvinces();
  return all.filter((p) => p.regionCode === regionCode);
}

export async function fetchCitiesByRegion(regionCode) {
  const all = await ensureCities();
  return all.filter((c) => c.regionCode === regionCode);
}

export async function fetchCitiesByProvince(provinceCode) {
  const all = await ensureCities();
  return all.filter((c) => c.provinceCode === provinceCode);
}

export async function fetchBarangays(cityCode) {
  const all = await ensureBarangays();
  return all.filter((b) => b.parentCode === cityCode);
}

// ─── String matching helpers ──────────────────────────────────────────

const NCR_ALIASES = new Set([
  "metro manila",
  "national capital region",
  "ncr",
  "national capital region (ncr)",
]);

function normalize(s) {
  if (!s) return "";
  let v = String(s).toLowerCase().trim().replace(/\s+/g, " ");
  v = v
    .replace(/^city of /, "")
    .replace(/ city$/, "")
    .replace(/^barangay /, "")
    .replace(/^brgy\.? /, "");
  return v.trim();
}

function findLoose(list, name) {
  const n = normalize(name);
  if (!n) return null;
  for (const item of list) {
    if (normalize(item.name) === n) return item;
  }
  for (const item of list) {
    const nn = normalize(item.name);
    if (nn.includes(n) || n.includes(nn)) return item;
  }
  return null;
}

/**
 * Best-effort: turn saved free-text province / city / barangay strings
 * back into structured PSGC entries so the cascade can pre-select on
 * edit. Always resolves; never throws.
 */
export async function warmStart({ provinceName, cityName, barangayName } = {}) {
  let region = null, province = null, city = null, barangay = null;

  try {
    const regions = await ensureRegions();
    const pn = (provinceName ?? "").trim();
    const cn = (cityName ?? "").trim();
    const bn = (barangayName ?? "").trim();

    let provRec = null;
    if (pn) {
      const provs = await ensureProvinces();
      provRec = findLoose(provs, pn);
      if (provRec) {
        province = { code: provRec.code, name: provRec.name };
        region = regions.find((r) => r.code === provRec.regionCode) ?? null;
      }
    }

    if (!region && NCR_ALIASES.has(normalize(pn))) {
      region = regions.find((r) => r.code.startsWith("13")) ?? null;
    }

    if (!region && cn) {
      const cities = await ensureCities();
      const ncrCities = cities.filter((c) => c.regionCode.startsWith("13"));
      const found = findLoose(ncrCities, cn);
      if (found) {
        city = { code: found.code, name: found.name };
        region = regions.find((r) => r.code === found.regionCode) ?? null;
      }
    }

    if (region && !city && cn) {
      const cities = await ensureCities();
      const candidates = provRec
        ? cities.filter((c) => c.provinceCode === provRec.code)
        : cities.filter((c) => c.regionCode === region.code);
      const match = findLoose(candidates, cn);
      if (match) city = { code: match.code, name: match.name };
    }

    if (city && bn) {
      const all = await ensureBarangays();
      const candidates = all.filter((b) => b.parentCode === city.code);
      const match = findLoose(candidates, bn);
      if (match) barangay = { code: match.code, name: match.name };
    }
  } catch (err) {
    console.warn("[psgc] warmStart failed:", err?.message ?? err);
  }

  return { region, province, city, barangay };
}

export const isNcrRegion = (code) => !!code && code.startsWith("13");
