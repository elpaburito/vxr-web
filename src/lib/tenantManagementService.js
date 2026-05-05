import { supabase } from "./supabase";

/**
 * Fetch all active tenants (paid contracts) for a landlord.
 * Joins listings + application; tenant profile is fetched
 * separately to avoid PostgREST FK-name ambiguity.
 */
export async function fetchActiveTenants(landlordId) {
  if (!landlordId) return { data: [], error: null };

  const { data: contracts, error } = await supabase
    .from("contract")
    .select(`
      id, tenant_id, listing_id, application_id,
      landlord_signed_at, start_date, end_date,
      monthly_rent, property_address, status, listing_type,
      terminated_by, termination_reason, notice_date, effective_end_date,
      created_at,
      listings ( id, title ),
      application ( id, first_name, last_name, email, phone_number ),
      contract_termination ( id, type, initiated_by, effective_date, reason,
        mutual_proposed_at, mutual_accepted_by_tenant_at, mutual_accepted_by_landlord_at,
        mutual_withdrawn_at, tenant_vacated_confirmed_at, landlord_closed_at )
    `)
    .eq("landlord_id", landlordId)
    .in("status", ["paid","terminating","expiring","terminated","ended","closed"])
    .order("created_at", { ascending: false });

  if (error || !contracts?.length) return { data: contracts ?? [], error };

  // Fetch tenant profiles in a single round-trip
  const tenantIds = [...new Set(contracts.map((c) => c.tenant_id).filter(Boolean))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", tenantIds);

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  return {
    data: contracts.map((c) => ({ ...c, tenant_profile: profileMap[c.tenant_id] ?? null })),
    error: null,
  };
}

/**
 * Fetch all maintenance/repair reports for a landlord's listings.
 * Looks up the landlord's listing IDs first, then queries the report table.
 */
export async function fetchLandlordReports(landlordId) {
  if (!landlordId) return { data: [], error: null };

  const { data: listings, error: lErr } = await supabase
    .from("listings")
    .select("id")
    .eq("landlord_id", landlordId);

  if (lErr) return { data: [], error: lErr };
  if (!listings?.length) return { data: [], error: null };

  const listingIds = listings.map((l) => l.id);

  const { data: reports, error } = await supabase
    .from("report")
    .select("id, contract_id, listing_id, type, status, title, created_at")
    .in("listing_id", listingIds)
    .order("created_at", { ascending: false });

  return { data: reports ?? [], error };
}
