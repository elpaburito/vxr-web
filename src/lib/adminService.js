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

export async function fetchUsers({ search = "", role = "" } = {}) {
  let q = supabase
    .from("profiles")
    .select("id, email, full_name, phone, role, is_landlord, is_verified, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (search) {
    q = q.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }
  if (role) q = q.eq("role", role);

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
