import { supabase, withTimeout } from "./supabase";

const T = (p, label) => withTimeout(p, 12000, label);
const AVATAR_BUCKET = "listing-images";

export async function fetchMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await T(
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    "fetch profile"
  );
  if (error) throw error;
  return { user, profile: data };
}

export async function updateMyProfile(updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const payload = { ...updates, updated_at: new Date().toISOString() };
  const { data, error } = await T(
    supabase.from("profiles").update(payload).eq("id", user.id).select(),
    "update profile"
  );
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Profile row not found — please contact support.");
  }
}

export async function uploadAvatar(file) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploadErr) throw uploadErr;

  const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const url = `${pub.publicUrl}?t=${Date.now()}`;

  const { error: updErr } = await T(
    supabase.from("profiles").update({
      avatar_url: url,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id),
    "save avatar url"
  );
  if (updErr) throw updErr;

  return url;
}

export async function removeAvatar() {
  await updateMyProfile({ avatar_url: null });
}

export async function updatePassword(newPassword) {
  const { error } = await T(
    supabase.auth.updateUser({ password: newPassword }),
    "update password"
  );
  if (error) throw error;
}

export async function sendEmailVerification() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("No authenticated user with email");
  const { error } = await T(
    supabase.auth.resend({ type: "signup", email: user.email }),
    "resend email verification"
  );
  if (error) throw error;
}

export async function sendPhoneVerification(phone) {
  const { error } = await T(
    supabase.auth.signInWithOtp({ phone }),
    "send phone OTP"
  );
  if (error) throw error;
}

export async function verifyPhoneOtp(phone, token) {
  const { error } = await T(
    supabase.auth.verifyOtp({ phone, token, type: "sms" }),
    "verify phone OTP"
  );
  if (error) throw error;
  // NOTE: profiles.is_verified is reserved for IDENTITY verification (the
  // AI-driven flow). Phone-verified state is reflected by Supabase via
  // auth.users.phone_confirmed_at, which is populated automatically on a
  // successful verifyOtp() — no profile write needed here.
}

export async function hasUserListings(userId) {
  if (!userId) return false;
  const { data, error } = await T(
    supabase.from("listings").select("id").eq("landlord_id", userId).limit(1),
    "check user listings"
  );
  if (error) return false;
  return (data?.length ?? 0) > 0;
}

// Mirrors the mobile gate (see GithubMob/lib/property_data.dart):
// `verified` — profiles.is_verified is true.
// `pending`  — profiles.is_verified is false AND the latest verifications
//              row is still pending or in manual_review.
// `none`     — neither verified nor a pending submission (user must
//              start verification before creating a listing).
export async function getVerificationStatus(userId) {
  if (!userId) return { verified: false, pending: false };
  try {
    const { data: profile } = await T(
      supabase.from("profiles").select("is_verified").eq("id", userId).maybeSingle(),
      "verification: profile"
    );
    if (profile?.is_verified) return { verified: true, pending: false };

    const { data: latest } = await T(
      supabase
        .from("verifications")
        .select("decision")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      "verification: latest"
    );
    const decision = latest?.decision;
    return {
      verified: false,
      pending: decision === "pending" || decision === "manual_review",
    };
  } catch (err) {
    console.warn("[verification] status check failed:", err?.message);
    return { verified: false, pending: false };
  }
}
