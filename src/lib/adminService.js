import { supabase, withTimeout } from "./supabase";

const T = (p, label) => withTimeout(p, 12000, label);

// ---------- Stats ----------

export async function fetchAdminStats() {
  const counts = await Promise.all([
    T(supabase.from("profiles").select("*", { count: "exact", head: true }), "users count"),
    T(supabase.from("listings").select("*", { count: "exact", head: true }), "listings count"),
    T(
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "active"),
      "active listings count"
    ),
    T(supabase.from("application").select("*", { count: "exact", head: true }), "applications count"),
    T(
      supabase.from("application").select("*", { count: "exact", head: true }).eq("status", "pending"),
      "pending applications count"
    ),
    T(supabase.from("contract").select("*", { count: "exact", head: true }), "contracts count"),
  ]);

  const get = (i) => counts[i]?.count ?? 0;
  return {
    users: get(0),
    listings: get(1),
    activeListings: get(2),
    applications: get(3),
    pendingApplications: get(4),
    contracts: get(5),
  };
}

// ---------- Users ----------

export async function fetchUsers({ search = "", role = "", suspended = "" } = {}) {
  let q = supabase
    .from("profiles")
    .select(
      "id, email, full_name, phone, role, is_landlord, is_verified, " +
      "is_suspended, suspended_at, suspension_reason, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (search) {
    q = q.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }
  if (role) q = q.eq("role", role);
  if (suspended === "yes") q = q.eq("is_suspended", true);
  else if (suspended === "no") q = q.eq("is_suspended", false);

  const { data, error } = await T(q, "fetch users");
  if (error) throw error;
  return data ?? [];
}

export async function updateUserRole(userId, role) {
  const { error } = await T(
    supabase.from("profiles").update({ role }).eq("id", userId),
    "update user role"
  );
  if (error) throw error;
}

export async function setUserVerified(userId, verified) {
  const { error } = await T(
    supabase.from("profiles").update({ is_verified: verified }).eq("id", userId),
    "update verification"
  );
  if (error) throw error;
}

/**
 * Suspend or unsuspend a user. Suspended users keep their session and can
 * sign in (to see the suspension notice), but the RESTRICTIVE RLS policies
 * in admin_user_suspension.sql block writes to listings, application,
 * payment_methods, chat_message, and maintenance_report.
 *
 * On suspend, the reason is persisted on the profile AND mirrored to the
 * audit log so the reason text shows up next to the auto-emitted
 * profiles.suspend action.
 */
export async function setUserSuspended(userId, suspended, reason = null) {
  const patch = {
    is_suspended: !!suspended,
    suspended_at: suspended ? new Date().toISOString() : null,
    suspension_reason: suspended ? (reason || null) : null,
  };
  const { error } = await T(
    supabase.from("profiles").update(patch).eq("id", userId),
    suspended ? "suspend user" : "unsuspend user"
  );
  if (error) throw error;
  if (suspended && reason && reason.trim()) {
    try {
      await logAdminAction({
        action: "profiles.suspend.reason",
        entityType: "profiles",
        entityId: userId,
        reason: reason.trim(),
      });
    } catch (e) {
      console.warn("[admin] could not record suspension reason:", e?.message);
    }
  }
}

// ---------- Listings ----------

export async function fetchAllListings({ search = "", status = "" } = {}) {
  let q = supabase
    .from("listings")
    .select("id, title, status, listing_type, is_verified, landlord_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (search) q = q.ilike("title", `%${search}%`);
  if (status) q = q.eq("status", status);

  const { data, error } = await T(q, "fetch listings");
  if (error) throw error;
  return data ?? [];
}

export async function setListingStatus(id, status) {
  const { error } = await T(
    supabase.from("listings").update({ status }).eq("id", id),
    "update listing status"
  );
  if (error) throw error;
}

export async function setListingVerified(id, verified) {
  const { error } = await T(
    supabase.from("listings").update({ is_verified: verified }).eq("id", id),
    "update listing verification"
  );
  if (error) throw error;
}

export async function deleteListing(id) {
  const { error } = await T(
    supabase.from("listings").delete().eq("id", id),
    "delete listing"
  );
  if (error) throw error;
}

// ---------- Verifications ----------

const VERIFICATIONS_BUCKET = "verifications";

/**
 * Resolve a verifications-bucket path (or full URL) to a signed URL admins can open.
 * Returns null on failure so the UI can fall back to "no document".
 */
export async function getVerificationUrl(pathOrUrl, expiresInSec = 600) {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  try {
    const { data, error } = await supabase.storage
      .from(VERIFICATIONS_BUCKET)
      .createSignedUrl(pathOrUrl, expiresInSec);
    if (error) {
      console.warn("[admin] signed url failed:", error.message);
      return null;
    }
    return data?.signedUrl ?? null;
  } catch (e) {
    console.warn("[admin] signed url exception:", e);
    return null;
  }
}

/**
 * User verifications come from the `verifications` table (one row per
 * submission) joined with `profiles` for display info. Filter:
 *   pending  → decision in ('pending','manual_review')
 *   verified → decision = 'approved'
 *   all      → every submission
 *
 * Returns rows shaped for the AdminVerifications UI:
 *   { id (verification id), user_id, full_name, email, role,
 *     decision, decision_reason, created_at,
 *     id_type, id_front_path, id_back_path, selfie_path,
 *     extracted_name, extracted_id_number, extracted_dob,
 *     face_match_score, ocr_confidence, name_match_score, ocr_data }
 */
export async function fetchUserVerifications({ filter = "pending" } = {}) {
  let q = supabase
    .from("verifications")
    .select(`
      id, user_id, decision, decision_reason, created_at, processed_at,
      id_type, id_front_path, id_back_path, selfie_path,
      extracted_name, extracted_id_number, extracted_dob,
      face_match_score, ocr_confidence, name_match_score, ocr_data
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (filter === "pending")  q = q.in("decision", ["pending", "manual_review"]);
  if (filter === "verified") q = q.eq("decision", "approved");

  const { data, error } = await T(q, "fetch user verifications");
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  // Hydrate user info via a separate query — verifications.user_id FKs
  // to auth.users, so PostgREST can't auto-embed profiles.
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  const { data: profs, error: pErr } = await T(
    supabase
      .from("profiles")
      .select("id, email, full_name, role, is_verified")
      .in("id", userIds),
    "fetch verification profiles"
  );
  if (pErr) throw pErr;
  const byId = new Map((profs ?? []).map((p) => [p.id, p]));

  return rows.map((r) => {
    const p = byId.get(r.user_id);
    return {
      ...r,
      full_name: p?.full_name ?? null,
      email: p?.email ?? null,
      role: p?.role ?? null,
      is_verified: p?.is_verified ?? false,
    };
  });
}

/**
 * Listing verifications: any listing that has submitted a verification doc.
 */
export async function fetchListingVerifications({ filter = "pending" } = {}) {
  let q = supabase
    .from("listings")
    .select(
      "id, title, status, listing_type, is_verified, landlord_id, verification_doc_url, verification_submitted_at"
    )
    .not("verification_submitted_at", "is", null)
    .order("verification_submitted_at", { ascending: false })
    .limit(200);

  if (filter === "pending")  q = q.eq("is_verified", false);
  if (filter === "verified") q = q.eq("is_verified", true);

  const { data, error } = await T(q, "fetch listing verifications");
  if (error) throw error;
  return data ?? [];
}

/**
 * Approve a verification submission: mark the row as approved and flip
 * the user's profiles.is_verified to true.
 */
export async function approveUserVerification(verificationId, userId) {
  const now = new Date().toISOString();
  const { error: vErr } = await T(
    supabase
      .from("verifications")
      .update({ decision: "approved", decision_reason: null, processed_at: now })
      .eq("id", verificationId),
    "approve verification"
  );
  if (vErr) throw vErr;

  if (userId) {
    const { error: pErr } = await T(
      supabase.from("profiles").update({ is_verified: true }).eq("id", userId),
      "set profile verified"
    );
    if (pErr) throw pErr;
  }
}

/**
 * Reject a verification submission. Marks the row as rejected so the user
 * can resubmit; does NOT delete the storage objects (admins may want to
 * audit them later).
 */
export async function rejectUserVerification(verificationId, reason = null) {
  const { error } = await T(
    supabase
      .from("verifications")
      .update({
        decision: "rejected",
        decision_reason: reason,
        processed_at: new Date().toISOString(),
      })
      .eq("id", verificationId),
    "reject verification"
  );
  if (error) throw error;
}

export async function approveListingVerification(listingId) {
  const { error } = await T(
    supabase.from("listings").update({ is_verified: true }).eq("id", listingId),
    "approve listing verification"
  );
  if (error) throw error;
}

export async function rejectListingVerification(listingId) {
  const { error } = await T(
    supabase
      .from("listings")
      .update({
        is_verified: false,
        verification_submitted_at: null,
        verification_doc_url: null,
      })
      .eq("id", listingId),
    "reject listing verification"
  );
  if (error) throw error;
}

// ---------- Applications ----------

export async function fetchAllApplications({ status = "" } = {}) {
  let q = supabase
    .from("application")
    .select("id, status, first_name, last_name, email, listing_id, tenant_id, landlord_id, submitted_at")
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (status) q = q.eq("status", status);

  const { data, error } = await T(q, "fetch applications");
  if (error) throw error;
  return data ?? [];
}

/**
 * Admin-side approve/reject for applications. The application-table
 * trigger automatically records an `application.approved` / `application.rejected`
 * row in admin_audit_log; we additionally call log_admin_action with the
 * reason text so it ends up on the same audit row's reason field.
 */
export async function approveApplication(applicationId) {
  const { error } = await T(
    supabase
      .from("application")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", applicationId),
    "approve application"
  );
  if (error) throw error;
}

export async function rejectApplication(applicationId, reason = null) {
  const { error } = await T(
    supabase
      .from("application")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", applicationId),
    "reject application"
  );
  if (error) throw error;
  if (reason && reason.trim()) {
    try {
      await logAdminAction({
        action: "application.rejected.reason",
        entityType: "application",
        entityId: applicationId,
        reason: reason.trim(),
      });
    } catch (e) {
      console.warn("[admin] could not record rejection reason:", e?.message);
    }
  }
}

// ---------- CMS: Pages ----------

export async function fetchPages() {
  const { data, error } = await T(
    supabase.from("cms_page").select("*").order("updated_at", { ascending: false }),
    "fetch pages"
  );
  if (error) throw error;
  return data ?? [];
}

export async function savePage(page) {
  const payload = {
    slug: page.slug,
    title: page.title,
    body: page.body ?? "",
    status: page.status ?? "draft",
  };
  if (page.id) {
    const { error } = await T(
      supabase.from("cms_page").update(payload).eq("id", page.id),
      "update page"
    );
    if (error) throw error;
    return page.id;
  }
  const { data, error } = await T(
    supabase.from("cms_page").insert(payload).select("id").single(),
    "insert page"
  );
  if (error) throw error;
  return data?.id;
}

export async function deletePage(id) {
  const { error } = await T(supabase.from("cms_page").delete().eq("id", id), "delete page");
  if (error) throw error;
}

// ---------- CMS: Announcements ----------

export async function fetchAnnouncements() {
  const { data, error } = await T(
    supabase.from("cms_announcement").select("*").order("created_at", { ascending: false }),
    "fetch announcements"
  );
  if (error) throw error;
  return data ?? [];
}

export async function saveAnnouncement(item) {
  const payload = {
    title: item.title,
    body: item.body ?? "",
    audience: item.audience ?? "all",
    level: item.level ?? "info",
    is_active: !!item.is_active,
    starts_at: item.starts_at || null,
    ends_at: item.ends_at || null,
  };
  if (item.id) {
    const { error } = await T(
      supabase.from("cms_announcement").update(payload).eq("id", item.id),
      "update announcement"
    );
    if (error) throw error;
    return item.id;
  }
  const { data, error } = await T(
    supabase.from("cms_announcement").insert(payload).select("id").single(),
    "insert announcement"
  );
  if (error) throw error;
  return data?.id;
}

export async function deleteAnnouncement(id) {
  const { error } = await T(
    supabase.from("cms_announcement").delete().eq("id", id),
    "delete announcement"
  );
  if (error) throw error;
}

// ---------- CMS: FAQs ----------

export async function fetchFaqs() {
  const { data, error } = await T(
    supabase.from("cms_faq").select("*").order("category").order("sort_order"),
    "fetch faqs"
  );
  if (error) throw error;
  return data ?? [];
}

export async function saveFaq(item) {
  const payload = {
    category: item.category || "general",
    question: item.question,
    answer: item.answer ?? "",
    sort_order: Number(item.sort_order) || 0,
    is_published: !!item.is_published,
  };
  if (item.id) {
    const { error } = await T(
      supabase.from("cms_faq").update(payload).eq("id", item.id),
      "update faq"
    );
    if (error) throw error;
    return item.id;
  }
  const { data, error } = await T(
    supabase.from("cms_faq").insert(payload).select("id").single(),
    "insert faq"
  );
  if (error) throw error;
  return data?.id;
}

export async function deleteFaq(id) {
  const { error } = await T(supabase.from("cms_faq").delete().eq("id", id), "delete faq");
  if (error) throw error;
}

// ---------- Payments oversight ----------

/**
 * Admin-side ledger view of every PayMongo / offline payment attempt.
 * Returns the most recent rows; cursor-paginated by created_at.
 */
export async function fetchAdminPayments({
  search = "",
  status = "",
  methodType = "",
  beforeIso = "",
  limit = 50,
} = {}) {
  let q = supabase
    .from("payment_transactions")
    .select(
      "id, contract_id, user_id, payment_method_id, paymongo_payment_intent_id, paymongo_payment_id, " +
      "amount_cents, currency, status, method_type, brand, last4, billing_name, " +
      "failure_reason, billing_month, recorded_by, note, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) q = q.eq("status", status);
  if (methodType) q = q.eq("method_type", methodType);
  if (beforeIso) q = q.lt("created_at", beforeIso);
  if (search) {
    const s = search.replace(/,/g, " ");
    q = q.or(
      `paymongo_payment_intent_id.ilike.%${s}%,paymongo_payment_id.ilike.%${s}%,billing_name.ilike.%${s}%,failure_reason.ilike.%${s}%`
    );
  }

  const { data, error } = await T(q, "fetch admin payments");
  if (error) throw error;
  return data ?? [];
}

/**
 * Aggregate totals for the dashboard header.
 *   - succeeded count (last 30 days)
 *   - failed count (last 30 days)
 *   - pending/requires_action count (current)
 *   - gross PHP succeeded (last 30 days)
 */
export async function fetchPaymentSummary() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [succeeded, failed, pending, grossRows] = await Promise.all([
    T(
      supabase.from("payment_transactions")
        .select("*", { count: "exact", head: true })
        .eq("status", "succeeded")
        .gte("created_at", since),
      "succeeded count"
    ),
    T(
      supabase.from("payment_transactions")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", since),
      "failed count"
    ),
    T(
      supabase.from("payment_transactions")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "requires_action"]),
      "pending count"
    ),
    T(
      supabase.from("payment_transactions")
        .select("amount_cents")
        .eq("status", "succeeded")
        .gte("created_at", since)
        .limit(5000),
      "gross sum rows"
    ),
  ]);

  const grossCents = (grossRows?.data ?? [])
    .reduce((sum, r) => sum + (Number(r.amount_cents) || 0), 0);

  return {
    succeeded: succeeded?.count ?? 0,
    failed: failed?.count ?? 0,
    pending: pending?.count ?? 0,
    grossPhp: grossCents / 100,
  };
}

/**
 * Mark a transaction as refunded in the local ledger.
 * NOTE: this does NOT call PayMongo's refund API — it only flips the
 * status on our side so the admin ledger reflects reality once a refund
 * has been issued through PayMongo's dashboard. The DB trigger logs the
 * status change; we additionally call log_admin_action with the reason
 * so the audit row carries why.
 */
export async function markTransactionRefunded(transactionId, reason = null) {
  const { error } = await T(
    supabase
      .from("payment_transactions")
      .update({ status: "refunded", updated_at: new Date().toISOString() })
      .eq("id", transactionId),
    "mark transaction refunded"
  );
  if (error) throw error;
  if (reason && reason.trim()) {
    try {
      await logAdminAction({
        action: "payment_transactions.refund.reason",
        entityType: "payment_transactions",
        entityId: transactionId,
        reason: reason.trim(),
      });
    } catch (e) {
      console.warn("[admin] could not record refund reason:", e?.message);
    }
  }
}

// ---------- Reports / disputes ----------

/**
 * Admin queue of every tenant-filed maintenance report.
 * Joined with a small slice of profiles/listing context for display.
 */
export async function fetchAdminReports({
  search = "",
  status = "",
  category = "",
  limit = 100,
} = {}) {
  let q = supabase
    .from("maintenance_report")
    .select(
      "id, tenant_id, contract_id, listing_id, title, description, category, status, " +
      "landlord_notes, admin_notes, escalated_at, resolved_at, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) q = q.eq("status", status);
  if (category) q = q.eq("category", category);
  if (search) {
    const s = search.replace(/,/g, " ");
    q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
  }

  const { data, error } = await T(q, "fetch admin reports");
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  // Hydrate tenant + listing for display
  const tenantIds = [...new Set(rows.map((r) => r.tenant_id).filter(Boolean))];
  const listingIds = [...new Set(rows.map((r) => r.listing_id).filter(Boolean))];

  const [tenants, listings] = await Promise.all([
    tenantIds.length
      ? T(supabase.from("profiles").select("id, full_name, email").in("id", tenantIds), "fetch report tenants")
      : Promise.resolve({ data: [] }),
    listingIds.length
      ? T(supabase.from("listings").select("id, title").in("id", listingIds), "fetch report listings")
      : Promise.resolve({ data: [] }),
  ]);

  const tenantById = new Map((tenants.data ?? []).map((p) => [p.id, p]));
  const listingById = new Map((listings.data ?? []).map((l) => [l.id, l]));

  return rows.map((r) => ({
    ...r,
    tenant: tenantById.get(r.tenant_id) || null,
    listing: listingById.get(r.listing_id) || null,
  }));
}

export async function updateReportStatus(reportId, status, reason = null) {
  const patch = { status, updated_at: new Date().toISOString() };
  if (status === "resolved") patch.resolved_at = new Date().toISOString();
  const { error } = await T(
    supabase.from("maintenance_report").update(patch).eq("id", reportId),
    "update report status"
  );
  if (error) throw error;
  if (reason && reason.trim()) {
    try {
      await logAdminAction({
        action: `maintenance_report.${status}.reason`,
        entityType: "maintenance_report",
        entityId: reportId,
        reason: reason.trim(),
      });
    } catch (e) {
      console.warn("[admin] could not record report reason:", e?.message);
    }
  }
}

export async function escalateReport(reportId, notes = null) {
  const patch = {
    escalated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (notes != null) patch.admin_notes = notes;
  const { error } = await T(
    supabase.from("maintenance_report").update(patch).eq("id", reportId),
    "escalate report"
  );
  if (error) throw error;
}

export async function saveReportAdminNotes(reportId, notes) {
  const { error } = await T(
    supabase
      .from("maintenance_report")
      .update({ admin_notes: notes ?? "", updated_at: new Date().toISOString() })
      .eq("id", reportId),
    "save admin notes"
  );
  if (error) throw error;
}

// ---------- Audit log ----------

/**
 * Cursor-paginated fetch of the admin audit log.
 * @param {object} opts
 * @param {string} [opts.search]      free-text search against action, entity_type, actor_email
 * @param {string} [opts.action]      exact action match (e.g. "profiles.role_change")
 * @param {string} [opts.entityType]  exact entity_type match
 * @param {string} [opts.beforeIso]   ISO timestamp; return rows with created_at < beforeIso (cursor)
 * @param {number} [opts.limit]       page size (default 50)
 */
export async function fetchAuditLog({
  search = "",
  action = "",
  entityType = "",
  beforeIso = "",
  limit = 50,
} = {}) {
  let q = supabase
    .from("admin_audit_log")
    .select("id, actor_id, actor_email, action, entity_type, entity_id, before, after, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (action) q = q.eq("action", action);
  if (entityType) q = q.eq("entity_type", entityType);
  if (beforeIso) q = q.lt("created_at", beforeIso);
  if (search) {
    const s = search.replace(/,/g, " ");
    q = q.or(
      `action.ilike.%${s}%,entity_type.ilike.%${s}%,actor_email.ilike.%${s}%,entity_id.ilike.%${s}%`
    );
  }

  const { data, error } = await T(q, "fetch audit log");
  if (error) throw error;
  return data ?? [];
}

/**
 * Distinct action labels for the filter dropdown.
 * Cheap because the action_idx is small.
 */
export async function fetchAuditActions() {
  const { data, error } = await T(
    supabase
      .from("admin_audit_log")
      .select("action")
      .order("action")
      .limit(500),
    "fetch audit actions"
  );
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.action))];
}

/**
 * Manually record an admin action (with optional reason / metadata).
 * Use for events that don't naturally fire a row-update trigger
 * (e.g. "viewed payment X for refund decision", "exported user CSV").
 */
export async function logAdminAction({
  action,
  entityType,
  entityId = null,
  reason = null,
  metadata = null,
}) {
  if (!action || !entityType) throw new Error("action and entityType are required");
  const { data, error } = await T(
    supabase.rpc("log_admin_action", {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId == null ? null : String(entityId),
      p_reason: reason,
      p_metadata: metadata,
    }),
    "log admin action"
  );
  if (error) throw error;
  return data;
}
