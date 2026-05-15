import { supabase } from "./supabase";

// Mobile (and current Supabase schema) uses `report`, not `maintenance_report`.
const TABLE = "report";

/**
 * Fetch all reports filed by the current tenant.
 * Mirrors the mobile in_stay_dashboard fetch — joins listings(title) for display.
 */
export async function fetchMyReports(tenantId) {
  if (!tenantId) return { data: [], error: null };
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      id, type, priority, status, title, description,
      landlord_response, landlord_responded_at, resolved_at,
      created_at, listing_id, contract_id,
      listings ( title )
    `)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

/**
 * Submit a new report.
 * `category` (UI) maps to `type` on the mobile/Supabase schema.
 */
export async function submitReport({ tenantId, contractId, listingId, landlordId, title, description, category, priority }) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      tenant_id:   tenantId,
      contract_id: contractId ?? null,
      listing_id:  listingId  ?? null,
      landlord_id: landlordId ?? null,
      title:       title.trim(),
      description: description?.trim() ?? null,
      type:        category ?? "other",
      priority:    priority  ?? "medium",
      status:      "open",
    })
    .select("id")
    .single();
  return { data, error };
}

/**
 * Fetch all reports filed against a landlord's listings (with tenant profiles).
 */
export async function fetchLandlordReportsForPage(landlordId) {
  if (!landlordId) return { data: [], error: null };

  const { data: listings, error: lErr } = await supabase
    .from("listings")
    .select("id")
    .eq("landlord_id", landlordId);

  if (lErr) return { data: [], error: lErr };
  if (!listings?.length) return { data: [], error: null };

  const listingIds = listings.map((l) => l.id);

  const { data: reports, error } = await supabase
    .from(TABLE)
    .select(`
      id, type, priority, status, title, description,
      landlord_response, landlord_responded_at, resolved_at,
      created_at, listing_id, contract_id, tenant_id,
      listings ( id, title, landlord_id )
    `)
    .in("listing_id", listingIds)
    .order("created_at", { ascending: false });

  if (error || !reports?.length) return { data: reports ?? [], error };

  // Batch-fetch tenant profiles
  const tenantIds = [...new Set(reports.map((r) => r.tenant_id).filter(Boolean))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", tenantIds);

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  return {
    data: reports.map((r) => ({ ...r, tenant_profile: profileMap[r.tenant_id] ?? null })),
    error: null,
  };
}

/**
 * Update the status of a report (landlord action).
 */
export async function updateReportStatus(reportId, newStatus) {
  if (!reportId) return { error: new Error("Missing reportId") };
  const { error } = await supabase
    .from(TABLE)
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", reportId);
  return { error };
}

/**
 * Save a landlord response text on a report.
 */
export async function respondToReport(reportId, response) {
  if (!reportId) return { error: new Error("Missing reportId") };
  const trimmed = response?.trim() ?? null;
  const { error } = await supabase
    .from(TABLE)
    .update({
      landlord_response:    trimmed,
      landlord_responded_at: new Date().toISOString(),
      updated_at:           new Date().toISOString(),
    })
    .eq("id", reportId);
  return { error };
}

/**
 * Fetch a single report by id.
 */
export async function fetchReportById(reportId) {
  if (!reportId) return { data: null, error: null };
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", reportId)
    .maybeSingle();
  return { data, error };
}
