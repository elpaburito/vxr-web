import { supabase } from "./supabase";

// Mobile uses "contract" (singular) and a separate "payment" table.
const TABLE = "contract";

/**
 * Normalize a Supabase contract row to the camelCase shape the UI uses.
 * Mobile stores signatures as separate text+name+timestamp columns.
 * Payment comes from a joined payment row (payment table).
 */
export function normalizeContract(row) {
  if (!row) return null;

  // Build signature objects from mobile's separate columns. The
  // `*_signature` text column either holds a literal "signed" sentinel
  // (the original mobile encoding) or a `data:image/png;base64,...`
  // URL of the drawn signature; we expose `image` only when it's the
  // latter so the UI can render an <img> instead of a typed name.
  const sigImage = (raw) =>
    typeof raw === "string" && raw.startsWith("data:image/") ? raw : null;
  const landlordSignature = row.landlord_signature
    ? {
        name:     row.landlord_signed_name ?? "",
        signedAt: row.landlord_signed_at,
        image:    sigImage(row.landlord_signature),
      }
    : null;
  const tenantSignature = row.tenant_signature
    ? {
        name:     row.tenant_signed_name ?? "",
        signedAt: row.tenant_signed_at,
        image:    sigImage(row.tenant_signature),
      }
    : null;

  // Payment comes from joined `payment` table (array → first row).
  // During the dual-column transition, prefer the PayMongo id; fall
  // back to the legacy Stripe id for historical payments.
  const paymentRow = Array.isArray(row.payment) ? row.payment[0] : row.payment ?? null;
  const payment = paymentRow
    ? {
        transactionId: paymentRow.paymongo_payment_intent_id ?? paymentRow.stripe_payment_intent_id,
        amount:        (paymentRow.amount_cents ?? 0) / 100,
        method:        paymentRow.method ?? paymentRow.payment_method_label ?? "card",
        last4:         paymentRow.last4 ?? "",
        paidAt:        paymentRow.paid_at,
        name:          paymentRow.name ?? paymentRow.payer_name ?? "",
      }
    : null;

  // listing_type 'lease'/'rent' → UI type 'fixed_term'/'month_to_month'
  const type = row.listing_type === "rent" ? "month_to_month" : "fixed_term";

  return {
    id:                       row.id,
    listingId:                row.listing_id,
    applicationId:            row.application_id,
    tenantId:                 row.tenant_id,
    landlordId:               row.landlord_id,
    type,
    status:                   row.status,
    landlordSignature,
    tenantSignature,
    payment,
    landlordName:             row.landlord_name ?? "",
    landlordContact:          row.landlord_contact ?? "",
    tenantName:               row.tenant_name ?? "",
    tenantContact:            row.tenant_contact ?? "",
    propertyAddress:          row.property_address ?? "",
    propertyType:             row.property_type ?? "",
    enteredOn:                row.entered_on ?? null,
    startDate:                row.start_date ?? null,
    endDate:                  row.end_date ?? null,
    duration:                 row.duration ?? "",
    monthlyRent:              row.monthly_rent ?? 0,
    securityDeposit:          row.security_deposit ?? 0,
    advanceRent:              row.advance_rent ?? 0,
    paymentDueDate:           row.payment_due_date ?? 5,
    gracePeriodDays:          row.grace_period_days ?? 5,
    paymentMethod:            row.payment_method ?? "",
    accountInfo:              row.account_info ?? "",
    lateFee:                  row.late_fee ?? 0,
    minorRepairsThreshold:    row.minor_repairs_threshold ?? 500,
    quietHours:               row.quiet_hours ?? "",
    overnightGuestThreshold:  row.overnight_guest_threshold ?? 7,
    governingCity:            row.governing_city ?? "",
    createdAt:                row.created_at,
    updatedAt:                row.updated_at,
    listings:                 row.listings ?? null,
  };
}

/**
 * Convert camelCase contract patch back to snake_case for Supabase updates.
 * 'type' maps to listing_type using mobile's 'lease'/'rent' values.
 */
export function denormalizeContractPatch(patch) {
  const out = {};
  if (patch.type !== undefined) {
    out.listing_type = patch.type === "month_to_month" ? "rent" : "lease";
  }
  const map = {
    landlordName:             "landlord_name",
    landlordContact:          "landlord_contact",
    tenantName:               "tenant_name",
    tenantContact:            "tenant_contact",
    propertyAddress:          "property_address",
    propertyType:             "property_type",
    enteredOn:                "entered_on",
    startDate:                "start_date",
    endDate:                  "end_date",
    duration:                 "duration",
    monthlyRent:              "monthly_rent",
    securityDeposit:          "security_deposit",
    advanceRent:              "advance_rent",
    paymentDueDate:           "payment_due_date",
    gracePeriodDays:          "grace_period_days",
    paymentMethod:            "payment_method",
    accountInfo:              "account_info",
    lateFee:                  "late_fee",
    minorRepairsThreshold:    "minor_repairs_threshold",
    quietHours:               "quiet_hours",
    overnightGuestThreshold:  "overnight_guest_threshold",
    governingCity:            "governing_city",
  };
  for (const [camel, snake] of Object.entries(map)) {
    if (patch[camel] !== undefined) out[snake] = patch[camel];
  }
  return out;
}

// ---------- helpers ----------
function safeNum(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/**
 * Derive a UI status string from a normalized contract object.
 * Checks mobile `status` field first, then falls back to signature presence.
 */
export function getContractStatus(contract) {
  if (!contract) return "draft";
  const s = contract.status;
  // `payment` may be a normalized object, a Supabase join array, or null.
  // An empty array is truthy but means "no payments" — treat it as absent.
  const hasPayment = Array.isArray(contract.payment)
    ? contract.payment.length > 0
    : !!contract.payment;
  if (s === "paid"         || hasPayment)                                            return "paid";
  if (s === "fully_signed" || (contract.landlordSignature && contract.tenantSignature)) return "both_signed";
  if (s === "awaiting_tenant"   || contract.landlordSignature)                      return "pending_tenant";
  if (s === "awaiting_landlord" || contract.tenantSignature)                        return "pending_landlord";
  if (s === "cancelled")                                                             return "cancelled";
  return "draft";
}

export const CONTRACT_TYPES = {
  fixed_term:     { label: "Fixed-Term Lease",     short: "Fixed-Term",    contractType: "Fixed-Term Lease Agreement",    description: "Lease for a specific period with a defined end date.",    accent: "#1E40AF" },
  month_to_month: { label: "Month-to-Month Lease", short: "Month-to-Month", contractType: "Month-to-Month Rental Agreement", description: "Flexible lease that renews monthly until terminated.", accent: "#7C3AED" },
};

// ---------- read ----------

export async function fetchContractById(contractId) {
  if (!contractId) return { data: null, error: null };
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      payment(*),
      listings ( id, title, listing_type, landlord_id,
        contract_template_url, contract_template_name, terms_override,
        listing_financials ( monthly_rent, security_deposit, advance_payment ),
        listing_locations  ( full_address, city, province ) )
    `)
    .eq("id", contractId)
    .maybeSingle();
  return { data, error };
}

/**
 * Public URL for a landlord-uploaded contract file stored in
 * the `listing-contracts` storage bucket. Returns null when the
 * listing uses the in-app default template.
 */
export function uploadedContractInfo(listing) {
  const path = listing?.contract_template_url;
  if (!path) return null;
  const name = listing.contract_template_name || String(path).split("/").pop();
  const { data } = supabase.storage.from("listing-contracts").getPublicUrl(path);
  return { url: data?.publicUrl ?? null, name };
}

export async function fetchMyContracts(userId) {
  if (!userId) return { data: [], error: null };
  const { data, error } = await supabase
    .from(TABLE)
    .select("*, payment(*)")
    .or(`tenant_id.eq.${userId},landlord_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

/**
 * Fetch the active (paid) contract for a tenant.
 * Mirrors the mobile pattern: pulls listing details from the
 * normalized side-tables (listing_financials / listing_availability /
 * listing_locations) instead of the base listings table.
 */
export async function fetchMyActiveContract(tenantId) {
  if (!tenantId) return { data: null, error: null };

  // Active includes the original 'paid' status plus the post-rent lifecycle
  // statuses, so the tenant still sees their dashboard during termination.
  const { data: contractRow, error: cErr } = await supabase
    .from(TABLE)
    .select(`
      *,
      listings ( id, title, landlord_id )
    `)
    .eq("tenant_id", tenantId)
    .in("status", ["paid", "terminating", "expiring", "terminated", "ended"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cErr || !contractRow) return { data: contractRow ?? null, error: cErr };

  const listingId = contractRow.listing_id;

  // .limit(1) instead of .maybeSingle() so a listing with duplicate side-table
  // rows (legacy / accidental duplication) doesn't fail the whole query and
  // leave the dashboard showing 0s.
  const [
    { data: finRows },
    { data: availRows },
    { data: locRows },
    { data: payRows },
  ] = await Promise.all([
    supabase
      .from("listing_financials")
      .select("monthly_rent, security_deposit, advance_payment")
      .eq("listing_id", listingId)
      .limit(1),
    supabase
      .from("listing_availability")
      .select("available_from, lease_term")
      .eq("listing_id", listingId)
      .limit(1),
    supabase
      .from("listing_locations")
      .select("full_address, city, province")
      .eq("listing_id", listingId)
      .limit(1),
    supabase
      .from("payment")
      .select("paid_at, amount_cents, method, last4, name, stripe_payment_intent_id, paymongo_payment_intent_id")
      .eq("contract_id", contractRow.id)
      .order("paid_at", { ascending: false })
      .limit(1),
  ]);
  let financials    = finRows?.[0]   ?? null;
  let availability  = availRows?.[0] ?? null;
  let location      = locRows?.[0]   ?? null;
  const latestPayment = payRows?.[0] ?? null;

  // Fallback: if any of the per-table side-tables came back empty, try the
  // listings_full view. It joins everything and is sometimes the only
  // readable source for tenants whose landlord populated data via a
  // different path (or where the per-table RLS hides the rows).
  if (!financials || !availability || !location) {
    const { data: full } = await supabase
      .from("listings_full")
      .select("monthly_rent, security_deposit, advance_payment, available_from, lease_term, full_address, city, province")
      .eq("id", listingId)
      .limit(1);
    const f = full?.[0];
    if (f) {
      if (!financials && (f.monthly_rent != null || f.security_deposit != null || f.advance_payment != null)) {
        financials = { monthly_rent: f.monthly_rent, security_deposit: f.security_deposit, advance_payment: f.advance_payment };
      }
      if (!availability && (f.available_from || f.lease_term)) {
        availability = { available_from: f.available_from, lease_term: f.lease_term };
      }
      if (!location && (f.full_address || f.city || f.province)) {
        location = { full_address: f.full_address, city: f.city, province: f.province };
      }
    }
  }

  if (!financials || !location) {
    console.warn(
      "[fetchMyActiveContract] incomplete listing data — UI will show 'Not set' for missing fields.",
      { listingId, hasFinancials: !!financials, hasLocation: !!location, hasAvailability: !!availability }
    );
  }

  const fallbackAddress =
    location?.full_address ||
    [location?.city, location?.province].filter(Boolean).join(", ") ||
    null;

  // Use `||` (not `??`) so a 0 / "" in the side table falls through to the
  // contract row — the contract is the source of truth for what was paid.
  const merged = {
    ...contractRow,
    monthly_rent:     Number(financials?.monthly_rent     || contractRow.monthly_rent     || 0),
    security_deposit: Number(financials?.security_deposit || contractRow.security_deposit || 0),
    advance_rent:     Number(financials?.advance_payment  || contractRow.advance_rent     || 0),
    start_date:       contractRow.start_date    || availability?.available_from || null,
    duration:         contractRow.duration      || availability?.lease_term     || null,
    property_address: contractRow.property_address || fallbackAddress,
    listings: {
      ...(contractRow.listings ?? {}),
      available_from: availability?.available_from ?? null,
      lease_term:     availability?.lease_term     ?? null,
      full_address:   location?.full_address       ?? null,
      city:           location?.city               ?? null,
      province:       location?.province           ?? null,
    },
    payment: latestPayment ?? null,
  };

  return { data: merged, error: null };
}

export async function hasActiveContract(tenantId) {
  if (!tenantId) return false;
  const { data, error } = await supabase
    .from(TABLE)
    .select("id")
    .eq("tenant_id", tenantId)
    .in("status", ["paid", "terminating", "expiring", "terminated", "ended"])
    .limit(1);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}

export async function fetchContractByApplication(applicationId) {
  if (!applicationId) return { data: null, error: null };
  const { data, error } = await supabase
    .from(TABLE)
    .select("*, payment(*)")
    .eq("application_id", applicationId)
    .maybeSingle();
  return { data, error };
}

// ---------- write ----------

export async function createContract(payload) {
  const row = {
    listing_id:                payload.listingId ?? null,
    application_id:            payload.applicationId ?? null,
    tenant_id:                 payload.tenantId,
    landlord_id:               payload.landlordId,
    listing_type:              payload.type === "month_to_month" ? "rent" : "lease",
    status:                    "awaiting_tenant",
    landlord_name:             payload.landlordName ?? null,
    landlord_contact:          payload.landlordContact ?? null,
    tenant_name:               payload.tenantName ?? null,
    tenant_contact:            payload.tenantContact ?? null,
    property_address:          payload.propertyAddress ?? null,
    property_type:             payload.propertyType ?? null,
    entered_on:                payload.enteredOn ?? null,
    start_date:                payload.startDate ?? null,
    end_date:                  payload.endDate ?? null,
    duration:                  payload.duration ?? null,
    monthly_rent:              safeNum(payload.monthlyRent),
    security_deposit:          safeNum(payload.securityDeposit),
    advance_rent:              safeNum(payload.advanceRent),
    payment_due_date:          payload.paymentDueDate ?? 5,
    grace_period_days:         payload.gracePeriodDays ?? 5,
    payment_method:            payload.paymentMethod ?? null,
    account_info:              payload.accountInfo ?? null,
    late_fee:                  safeNum(payload.lateFee),
    minor_repairs_threshold:   safeNum(payload.minorRepairsThreshold),
    quiet_hours:               payload.quietHours ?? null,
    overnight_guest_threshold: payload.overnightGuestThreshold ?? null,
    governing_city:            payload.governingCity ?? null,
  };

  const { data, error } = await supabase.from(TABLE).insert(row).select("id").single();
  return { data, error };
}

export async function updateContract(contractId, patch) {
  const allowed = [
    "listing_type", "landlord_name", "landlord_contact", "tenant_name", "tenant_contact",
    "property_address", "property_type", "entered_on", "start_date", "end_date",
    "duration", "monthly_rent", "security_deposit", "advance_rent",
    "payment_due_date", "grace_period_days", "payment_method", "account_info",
    "late_fee", "minor_repairs_threshold", "quiet_hours",
    "overnight_guest_threshold", "governing_city",
  ];

  const update = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (patch[key] !== undefined) update[key] = patch[key];
  }

  const { error } = await supabase.from(TABLE).update(update).eq("id", contractId);
  return { error };
}

/**
 * Sign the contract as landlord or tenant.
 *
 * `signatureDataUrl` is the canvas-drawn signature serialized as a
 * `data:image/png;base64,...` URL. We store it in the *_signature text
 * column so it round-trips on the next fetch; the in-app rendering and
 * the print/export view both display it as an image. Falls back to the
 * legacy "signed" sentinel if no drawing was provided (kept for mobile
 * parity).
 *
 * Auto-advances status: awaiting_tenant → awaiting_landlord → fully_signed.
 */
export async function signContract(contractId, role, signerName, signatureDataUrl) {
  const now = new Date().toISOString();
  const sigValue =
    typeof signatureDataUrl === "string" && signatureDataUrl.startsWith("data:image/")
      ? signatureDataUrl
      : "signed";

  // First fetch current state to decide next status
  const { data: current } = await supabase
    .from(TABLE)
    .select("tenant_signature, landlord_signature, tenant_id, landlord_id")
    .eq("id", contractId)
    .maybeSingle();

  let patch;
  let nextStatus;
  if (role === "landlord") {
    patch = { landlord_signature: sigValue, landlord_signed_name: signerName, landlord_signed_at: now };
    nextStatus = current?.tenant_signature ? "fully_signed" : "awaiting_tenant";
  } else {
    patch = { tenant_signature: sigValue, tenant_signed_name: signerName, tenant_signed_at: now };
    nextStatus = current?.landlord_signature ? "fully_signed" : "awaiting_landlord";
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...patch, status: nextStatus, updated_at: now })
    .eq("id", contractId)
    .select("*")
    .single();

  return { data, error };
}

/**
 * Record a completed payment. Inserts into the `payment` table and
 * updates contract.status to 'paid'.
 */
export async function recordContractPayment(contractId, paymentData) {
  const amountCents = Math.round((paymentData.amount ?? 0) * 100);
  const { error: payErr } = await supabase.from("payment").insert({
    contract_id:                contractId,
    stripe_payment_intent_id:   paymentData.transactionId,
    paymongo_payment_intent_id: paymentData.transactionId,
    amount_cents:               amountCents > 0 ? amountCents : 1,
    currency:                   "php",
    status:                     "succeeded",
    paid_at:                    paymentData.paidAt ?? new Date().toISOString(),
    method:                     paymentData.method ?? "card",
    last4:                      paymentData.last4 ?? null,
    name:                       paymentData.name ?? null,
  });
  if (payErr) return { error: payErr };

  const { error } = await supabase
    .from(TABLE)
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("id", contractId);
  if (error) return { error };

  // Take the listing out of the public browse + block fresh applies.
  // The Edge Function `record-payment` does the same thing using the
  // service-role client; this branch is the legacy mock-payment path
  // and the listings RLS only lets the landlord update their own
  // listings, so this update is a no-op for tenants — the webhook /
  // record-payment Edge Function will pick up the work instead.
  const { data: contractRow } = await supabase
    .from(TABLE)
    .select("listing_id")
    .eq("id", contractId)
    .maybeSingle();
  if (contractRow?.listing_id) {
    await supabase
      .from("listings")
      .update({ status: "rented", updated_at: new Date().toISOString() })
      .eq("id", contractRow.listing_id);
  }
  return { error: null };
}

/**
 * Reset both signatures and revert status to awaiting_tenant.
 */
export async function resetContractSignatures(contractId) {
  const { error } = await supabase
    .from(TABLE)
    .update({
      landlord_signature:   null,
      landlord_signed_name: null,
      landlord_signed_at:   null,
      tenant_signature:     null,
      tenant_signed_name:   null,
      tenant_signed_at:     null,
      status:               "awaiting_tenant",
      updated_at:           new Date().toISOString(),
    })
    .eq("id", contractId);
  return { error };
}

// ---------- local helpers ----------

export function buildContractFromApplication(applicationRow, currentUser) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(1);
  start.setMonth(start.getMonth() + 1);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);

  const listing = applicationRow.listings;
  // Mirror the listing's listing_type ('lease' / 'rent') onto the contract
  // so a month-to-month listing doesn't generate a fixed-term contract.
  const contractType = listing?.listing_type === "rent" ? "month_to_month" : "fixed_term";

  // Pricing lives in the listing_financials side-table — Supabase embeds
  // it as an array. The address is on listing_locations the same way.
  // Without these the contract gets created with monthly_rent = 0 and
  // the tenant ends up on /contract/:id/pay with a ₱0 total.
  const fin =
    Array.isArray(listing?.listing_financials)
      ? listing.listing_financials[0]
      : listing?.listing_financials;
  const loc =
    Array.isArray(listing?.listing_locations)
      ? listing.listing_locations[0]
      : listing?.listing_locations;
  const monthlyRent     = Number(fin?.monthly_rent     ?? 0);
  const securityDeposit = Number(fin?.security_deposit ?? monthlyRent);
  const advancePayment  = Number(fin?.advance_payment  ?? monthlyRent);
  const propertyAddress =
    loc?.full_address ||
    [loc?.city, loc?.province].filter(Boolean).join(", ") ||
    listing?.title ||
    "";

  return {
    listingId:      applicationRow.listing_id,
    applicationId:  applicationRow.id,
    tenantId:       applicationRow.tenant_id,
    landlordId:     currentUser?.id,

    type: contractType,

    landlordName:    currentUser?.profile?.full_name ?? "Landlord",
    landlordContact: currentUser?.profile?.email ?? "",
    tenantName:      applicationRow.full_name ?? "Tenant",
    tenantContact:   `${applicationRow.email ?? ""} / ${applicationRow.contact_number ?? ""}`,

    propertyAddress,
    propertyType:    listing?.property_type ?? "Apartment",

    enteredOn:  today.toISOString().slice(0, 10),
    startDate:  start.toISOString().slice(0, 10),
    endDate:    end.toISOString().slice(0, 10),
    duration:   "12 months",

    monthlyRent,
    securityDeposit,
    advanceRent:      advancePayment,
    paymentDueDate:   5,
    gracePeriodDays:  5,
    paymentMethod:    "Bank Transfer / GCash",
    accountInfo:      "",
    lateFee:          200,

    minorRepairsThreshold:   500,
    quietHours:              "10:00 PM – 7:00 AM",
    overnightGuestThreshold: 7,
    governingCity:           listing?.city ?? "Makati City",
  };
}

