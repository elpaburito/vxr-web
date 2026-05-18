// Strip a trailing duplicate of "{barangay}, {city}, {province}" off a
// previously-stored full_address. Legacy rows were written with the
// structured parts appended a second time (see listingsService.js bug fix);
// this helper keeps the UI correct regardless of DB state.
//
// Returns the input unchanged when the pattern doesn't match, and returns
// the original (not an empty string) when stripping would leave nothing —
// that protects the fallback branch where full_address legitimately equals
// "barangay, city, province".
export function cleanFullAddress(full, parts) {
  if (!full || typeof full !== "string") return full ?? null;
  const segments = ["barangay", "city", "province"]
    .map((k) => parts?.[k])
    .filter((s) => typeof s === "string" && s.trim());
  if (segments.length === 0) return full;
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`,\\s*${segments.map(escape).join(",\\s*")}\\s*$`, "i");
  const cleaned = full.replace(re, "").trim().replace(/,\s*$/, "").trim();
  return cleaned || full;
}
