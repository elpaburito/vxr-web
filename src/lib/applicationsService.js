import { supabase } from "./supabase";

const APP_DOCS_BUCKET = "application-documents";

/**
 * Upload a document file for an application.
 * Returns the public URL (or signed URL path for private buckets).
 */
export async function uploadApplicationDocument(userId, file, label) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${Date.now()}-${label}-${safeName}`;
  const { error } = await supabase.storage
    .from(APP_DOCS_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  // Return storage path — landlord access handled via RLS
  return path;
}

/**
 * Submit a rental application to Supabase.
 * formData mirrors the ApplicationModal state shape.
 * documentFiles: { validIdFront: File|null, validIdBack: File|null, proofOfIncome: File|null }
 *
 * Column mapping (ApplicationModal field → DB column):
 *   fullName            → first_name + last_name (split on first space)
 *   contactNumber       → phone_number
 *   lengthOfEmployment  → employment_length
 *   rentalDuration      → stayed_duration
 *   landlordName        → previous_landlord
 *   landlordPhone       → landlord_contact
 *   consentIdentity     → agreed_to_declaration
 *   documents           → application_document table (inserted after application row)
 */
export async function submitApplication({ listingId, tenantId, landlordId, formData, documentFiles }) {
  // Re-check verification server-side before doing any work — the UI may
  // have been bypassed and we don't want to upload documents to storage
  // for an application that the database will reject anyway.
  if (listingId) {
    const { data: gate, error: gateErr } = await supabase
      .from("listings")
      .select("is_verified, status")
      .eq("id", listingId)
      .maybeSingle();
    if (gateErr) return { data: null, error: gateErr };
    if (!gate) return { data: null, error: new Error("Listing not found.") };
    if (gate.status !== "active") {
      return { data: null, error: new Error("This listing is not currently accepting applications.") };
    }
    if (!gate.is_verified) {
      return { data: null, error: new Error("This listing is pending verification and cannot accept applications yet.") };
    }
  }

  // Identity-verification gate. Mirrors the mobile ensureVerifiedToApply()
  // check (verification_screen.dart:959-981). Keeps unverified tenants out
  // even if the UI is bypassed.
  if (tenantId) {
    const { data: tenantProfile, error: profErr } = await supabase
      .from("profiles")
      .select("is_verified")
      .eq("id", tenantId)
      .maybeSingle();
    if (profErr) return { data: null, error: profErr };
    if (!tenantProfile?.is_verified) {
      return {
        data: null,
        error: new Error("Please verify your identity before applying."),
      };
    }
  }

  // Guard: check for an existing application (avoids hitting the unique constraint)
  const { data: existing, error: existErr } = await supabase
    .from("application")
    .select("id, status")
    .eq("listing_id", listingId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (existErr) return { data: null, error: existErr };

  if (existing && existing.status !== "rejected") {
    const statusLabel = existing.status === "pending"
      ? "a pending application"
      : existing.status === "approved"
      ? "an approved application"
      : `an existing application (${existing.status})`;
    return {
      data: null,
      error: new Error(`You already have ${statusLabel} for this listing.`),
    };
  }

  // If a rejected application exists, we will UPDATE it instead of INSERT
  // (the unique constraint allows only one row per listing+tenant pair).
  const isReapplication = !!existing && existing.status === "rejected";

  // Upload documents first (returns storage path, not a public URL)
  let validIdFrontPath = null;
  let validIdBackPath  = null;
  let proofPath        = null;

  if (documentFiles?.validIdFront) {
    validIdFrontPath = await uploadApplicationDocument(tenantId, documentFiles.validIdFront, "id_front");
  }
  if (documentFiles?.validIdBack) {
    validIdBackPath = await uploadApplicationDocument(tenantId, documentFiles.validIdBack, "id_back");
  }
  if (documentFiles?.proofOfIncome) {
    proofPath = await uploadApplicationDocument(tenantId, documentFiles.proofOfIncome, "income_proof");
  }

  // Split "First Last" → first_name / last_name
  const nameParts = (formData.fullName?.trim() || "").split(/\s+/);
  const firstName = nameParts[0] || null;
  const lastName  = nameParts.slice(1).join(" ") || null;

  const row = {
    listing_id:           listingId,
    tenant_id:            tenantId,
    landlord_id:          landlordId ?? null,
    status:               "pending",

    // Step 1 — Personal info (DB column names)
    first_name:           firstName,
    last_name:            lastName,
    phone_number:         formData.contactNumber?.trim() || null,
    email:                formData.email?.trim() || null,
    date_of_birth:        formData.dateOfBirth || null,
    current_address:      formData.currentAddress?.trim() || null,

    // Step 2 — Employment
    employment_status:    formData.employmentStatus || null,
    job_title:            formData.jobTitle?.trim() || null,
    company_name:         formData.companyName?.trim() || null,
    monthly_income:       formData.monthlyIncome
                            ? Number(String(formData.monthlyIncome).replace(/[^0-9.]/g, ""))
                            : null,
    employment_length:    formData.lengthOfEmployment || null,
    work_address:         formData.workAddress?.trim() || null,

    // Step 3 — Rental history
    previous_address:     formData.previousAddress?.trim() || null,
    stayed_duration:      formData.rentalDuration || null,
    reason_for_leaving:   formData.reasonForLeaving?.trim() || null,
    previous_landlord:    formData.landlordName?.trim() || null,
    landlord_contact:     formData.landlordPhone?.trim() || null,

    // Step 5 — Declaration
    agreed_to_declaration: !!formData.consentIdentity,
    declaration_name:      formData.fullName?.trim() || null,
    declaration_date:      formData.consentIdentity
                             ? new Date().toISOString().split("T")[0]
                             : null,
    submitted_at:          new Date().toISOString(),
  };

  let appId;

  if (isReapplication) {
    // Mirror mobile submitRentalApplicationV2 (property_data.dart:1268-1275):
    // drop stale docs first, then fire-and-forget UPDATE. No .select().single()
    // — a 0-row response on UPDATE would otherwise surface as a 406
    // "Cannot coerce the result to a single JSON object" to the tenant.
    appId = existing.id;
    await supabase
      .from("application_document")
      .delete()
      .eq("application_id", appId);
    const { error: updateErr } = await supabase
      .from("application")
      .update({ ...row, status: "pending" })
      .eq("id", appId);
    if (updateErr) return { data: null, error: updateErr };
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("application")
      .insert(row)
      .select("id")
      .single();
    if (insertErr) return { data: null, error: insertErr };
    appId = inserted?.id;
    if (!appId) {
      return { data: null, error: new Error("Application created but ID not returned.") };
    }
  }

  const docs = [];
  if (validIdFrontPath)
    docs.push({ application_id: appId, document_type: "valid_id_front",  url: validIdFrontPath, file_name: documentFiles.validIdFront?.name ?? null });
  if (validIdBackPath)
    docs.push({ application_id: appId, document_type: "valid_id_back",   url: validIdBackPath,  file_name: documentFiles.validIdBack?.name  ?? null });
  if (proofPath)
    docs.push({ application_id: appId, document_type: "proof_of_income", url: proofPath,         file_name: documentFiles.proofOfIncome?.name ?? null });
  if (docs.length > 0) {
    const { error: docError } = await supabase.from("application_document").insert(docs);
    if (docError) console.warn("Document insert failed:", docError.message);
  }

  return { data: { id: appId }, error: null };
}

function maskIdNumber(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s.length <= 4) return s;
  const last4 = s.slice(-4);
  return `•••• ${last4}`;
}

/**
 * Fetch the latest approved verification for a single tenant, but only if
 * the calling landlord has an application from that tenant. Uses the
 * SECURITY DEFINER RPC `get_tenant_verification` so we can read past the
 * owner-only RLS on the verifications table without exposing PII broadly.
 * Returns null on missing RPC (older DBs) or RPC failure — degrades the
 * landlord view gracefully rather than breaking it.
 */
async function fetchVerificationForTenant(tenantId) {
  if (!tenantId) return null;
  const { data, error } = await supabase.rpc("get_tenant_verification", {
    p_tenant_id: tenantId,
  });
  if (error) {
    console.warn("[applications] verification rpc failed:", error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    id_type: row.id_type,
    extracted_name: row.extracted_name,
    extracted_id_number_masked: maskIdNumber(row.extracted_id_number),
    extracted_dob: row.extracted_dob,
    processed_at: row.processed_at,
    decision: row.decision,
  };
}

/**
 * Fetch all applications for a landlord's listings.
 * Joins listing title for the group-by-unit view.
 * Also attaches each tenant's latest approved identity-verification record
 * (PII-safe shape — see fetchVerificationForTenant) as `application.verification`.
 */
export async function fetchLandlordApplications(landlordId) {
  if (!landlordId) return { data: [], error: null };
  // Order by submitted_at — every row has it (set explicitly on insert),
  // whereas created_at didn't exist on the original schema and may still
  // be missing on databases that pre-date application_add_created_at.sql.
  const { data, error } = await supabase
    .from("application")
    .select(`
      id, listing_id, tenant_id, landlord_id, status, submitted_at,
      first_name, last_name, phone_number, email, date_of_birth, current_address,
      employment_status, job_title, company_name, monthly_income,
      employment_length, work_address,
      previous_address, stayed_duration, reason_for_leaving,
      previous_landlord, landlord_contact,
      agreed_to_declaration,
      listings ( id, title, property_type, listing_type,
                 contract_template_url, contract_template_name,
                 listing_financials ( monthly_rent, security_deposit, advance_payment ),
                 listing_locations  ( full_address, city, province ) ),
      application_document ( id, document_type, url, file_name )
    `)
    .eq("landlord_id", landlordId)
    .order("submitted_at", { ascending: false, nullsFirst: false });

  if (error) return { data: null, error };

  // Hydrate one verification per unique tenant (parallel RPC calls).
  const tenantIds = [...new Set((data ?? []).map((r) => r.tenant_id).filter(Boolean))];
  const verifications = new Map();
  if (tenantIds.length > 0) {
    const results = await Promise.all(
      tenantIds.map((id) => fetchVerificationForTenant(id).then((v) => [id, v]))
    );
    for (const [id, v] of results) {
      if (v) verifications.set(id, v);
    }
  }

  // Mirror submitted_at into created_at so the rest of the UI (which
  // expects created_at) keeps working.
  const normalized = (data ?? []).map((row) => ({
    ...row,
    created_at: row.created_at ?? row.submitted_at ?? null,
    verification: verifications.get(row.tenant_id) ?? null,
  }));
  return { data: normalized, error: null };
}

/**
 * Fetch a single application with full details.
 */
export async function fetchApplicationById(applicationId) {
  if (!applicationId) return { data: null, error: null };
  const { data, error } = await supabase
    .from("application")
    .select(`
      *,
      listings ( id, title, property_type, monthly_rent:listing_financials(monthly_rent) )
    `)
    .eq("id", applicationId)
    .maybeSingle();
  return { data, error };
}

/**
 * Fetch all applications submitted by a tenant, plus any contract
 * that already exists for each application — the tenant view uses
 * the contract's status to decide which CTA to render ("Sign", "Pay",
 * "View active rental"). Done as two queries because there's no
 * declared FK between `application` and `contract` for PostgREST.
 */
export async function fetchTenantApplications(tenantId) {
  if (!tenantId) return { data: [], error: null };

  // Order by submitted_at; created_at didn't exist on the original schema
  // and is only present on databases that ran application_add_created_at.sql.
  const { data: apps, error } = await supabase
    .from("application")
    .select(`
      id, listing_id, status, submitted_at, landlord_id,
      listings ( id, title, property_type, cover_photo_url )
    `)
    .eq("tenant_id", tenantId)
    .order("submitted_at", { ascending: false, nullsFirst: false });

  if (error || !apps?.length) return { data: apps ?? [], error };

  const appIds = apps.map((a) => a.id).filter(Boolean);
  const { data: contracts } = await supabase
    .from("contract")
    .select("id, status, application_id")
    .in("application_id", appIds);

  const byApp = new Map();
  for (const c of contracts ?? []) byApp.set(c.application_id, c);

  return {
    data: apps.map((a) => ({
      ...a,
      created_at: a.created_at ?? a.submitted_at ?? null,
      contract: byApp.get(a.id) ?? null,
    })),
    error: null,
  };
}

/**
 * Update the status of an application (landlord action).
 * `tenantId` is optional — when provided, the tenant is notified of the change.
 */
export async function updateApplicationStatus(applicationId, status) {
  const { error } = await supabase
    .from("application")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);
  return { error };
}

/**
 * Fetch a single application belonging to the tenant, returned in the
 * camelCase shape the edit modal expects (mirrors ApplicationModal's
 * formData keys). Only pending applications can be edited; approved /
 * rejected rows still load read-only.
 */
export async function fetchApplicationForTenant(applicationId, tenantId) {
  if (!applicationId || !tenantId) return { data: null, error: null };
  const { data, error } = await supabase
    .from("application")
    .select(`
      id, listing_id, status, submitted_at,
      first_name, last_name, phone_number, email, date_of_birth, current_address,
      employment_status, job_title, company_name, monthly_income,
      employment_length, work_address,
      previous_address, stayed_duration, reason_for_leaving,
      previous_landlord, landlord_contact,
      agreed_to_declaration, declaration_name
    `)
    .eq("id", applicationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error || !data) return { data: null, error };

  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ");
  return {
    data: {
      id:                 data.id,
      listingId:          data.listing_id,
      status:             data.status,
      submittedAt:        data.submitted_at,
      fullName,
      dateOfBirth:        data.date_of_birth ?? "",
      contactNumber:      data.phone_number ?? "",
      email:              data.email ?? "",
      currentAddress:     data.current_address ?? "",
      employmentStatus:   data.employment_status ?? "",
      jobTitle:           data.job_title ?? "",
      companyName:        data.company_name ?? "",
      monthlyIncome:      data.monthly_income != null ? String(data.monthly_income) : "",
      lengthOfEmployment: data.employment_length ?? "",
      workAddress:        data.work_address ?? "",
      previousAddress:    data.previous_address ?? "",
      rentalDuration:     data.stayed_duration ?? "",
      reasonForLeaving:   data.reason_for_leaving ?? "",
      landlordName:       data.previous_landlord ?? "",
      landlordPhone:      data.landlord_contact ?? "",
      consentIdentity:    !!data.agreed_to_declaration,
    },
    error: null,
  };
}

/**
 * Update editable fields on a tenant's PENDING application. Re-checks the
 * status server-side so a tenant can't sneak edits in after a landlord
 * has approved/rejected — even if the UI is bypassed.
 */
export async function updateApplication(applicationId, tenantId, patch) {
  if (!applicationId || !tenantId) return { error: new Error("Missing id") };

  // Server-side gate: status must still be pending.
  const { data: gate, error: gateErr } = await supabase
    .from("application")
    .select("status, tenant_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (gateErr) return { error: gateErr };
  if (!gate) return { error: new Error("Application not found.") };
  if (gate.tenant_id !== tenantId) return { error: new Error("Not your application.") };
  if (gate.status !== "pending") {
    return { error: new Error("This application can no longer be edited.") };
  }

  const nameParts = (patch.fullName?.trim() || "").split(/\s+/);
  const update = {
    first_name:          nameParts[0] || null,
    last_name:           nameParts.slice(1).join(" ") || null,
    phone_number:        patch.contactNumber?.trim() || null,
    email:               patch.email?.trim() || null,
    date_of_birth:       patch.dateOfBirth || null,
    current_address:     patch.currentAddress?.trim() || null,
    employment_status:   patch.employmentStatus || null,
    job_title:           patch.jobTitle?.trim() || null,
    company_name:        patch.companyName?.trim() || null,
    monthly_income:      patch.monthlyIncome
                            ? Number(String(patch.monthlyIncome).replace(/[^0-9.]/g, ""))
                            : null,
    employment_length:   patch.lengthOfEmployment || null,
    work_address:        patch.workAddress?.trim() || null,
    previous_address:    patch.previousAddress?.trim() || null,
    stayed_duration:     patch.rentalDuration || null,
    reason_for_leaving:  patch.reasonForLeaving?.trim() || null,
    previous_landlord:   patch.landlordName?.trim() || null,
    landlord_contact:    patch.landlordPhone?.trim() || null,
    agreed_to_declaration: !!patch.consentIdentity,
    declaration_name:    patch.fullName?.trim() || null,
  };

  const { error } = await supabase
    .from("application")
    .update(update)
    .eq("id", applicationId)
    .eq("tenant_id", tenantId);
  return { error };
}
