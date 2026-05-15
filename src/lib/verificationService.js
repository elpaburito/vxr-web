import { supabase, withTimeout } from "./supabase";

export const VERIFICATIONS_BUCKET = "verifications";

// Mirrors GithubMob/lib/property_data.dart:527-588.
// Keys are the contract with the verify-identity Edge Function — do not rename.
export const ID_TYPES = [
  { key: "philsys",         displayName: "PhilSys (National ID)", requiresBack: true  },
  { key: "umid",            displayName: "UMID",                   requiresBack: false },
  { key: "drivers_license", displayName: "Driver's License",       requiresBack: true  },
  { key: "passport",        displayName: "Philippine Passport",    requiresBack: false },
  { key: "postal_id",       displayName: "Postal ID",              requiresBack: false },
  { key: "sss",             displayName: "SSS ID",                 requiresBack: false },
  { key: "prc",             displayName: "PRC ID",                 requiresBack: false },
  { key: "voters_id",       displayName: "Voter's ID",             requiresBack: true  },
  { key: "senior_citizen",  displayName: "Senior Citizen ID",      requiresBack: false },
  { key: "tin",             displayName: "TIN ID",                 requiresBack: false },
];

export function getIdTypeMeta(key) {
  return ID_TYPES.find((t) => t.key === key) || null;
}

export function getIdTypeDisplayName(key) {
  return getIdTypeMeta(key)?.displayName || key || "Government ID";
}

async function currentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

export async function getMyLatestVerification() {
  const user = await currentUser();
  const { data, error } = await withTimeout(
    supabase
      .from("verifications")
      .select(
        "id, decision, decision_reason, id_type, created_at, processed_at, " +
        "face_match_score, ocr_confidence, name_match_score"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    12000,
    "fetch latest verification"
  );
  if (error) throw error;
  return data;
}

export async function getMyVerificationStatus() {
  const user = await currentUser();
  const [{ data: profile, error: pErr }, { data: latest, error: vErr }] =
    await Promise.all([
      withTimeout(
        supabase
          .from("profiles")
          .select("is_verified, verification_decision, verification_rejection_reason, verification_id_type")
          .eq("id", user.id)
          .maybeSingle(),
        12000,
        "fetch profile (verification)"
      ),
      withTimeout(
        supabase
          .from("verifications")
          .select("id, decision, decision_reason, id_type, created_at, processed_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        12000,
        "fetch latest verification"
      ),
    ]);
  if (pErr) throw pErr;
  if (vErr) throw vErr;
  return {
    isVerified: !!profile?.is_verified,
    latestDecision: latest?.decision || profile?.verification_decision || null,
    rejectionReason:
      profile?.verification_rejection_reason || latest?.decision_reason || null,
    latestRow: latest || null,
    profile: profile || null,
  };
}

// Compress an image File to <= maxWidth px and JPEG quality 0.85 via canvas.
// Returns a File named `{label}.jpg`.
async function compressImage(file, label, maxWidth = 1280, quality = 0.85) {
  if (!file) return null;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    return new File([file], `${label}.jpg`, {
      type: file.type || "image/jpeg",
    });
  }
  const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) {
    return new File([file], `${label}.jpg`, {
      type: file.type || "image/jpeg",
    });
  }
  return new File([blob], `${label}.jpg`, { type: "image/jpeg" });
}

async function uploadOne(folder, label, file) {
  const compressed = await compressImage(file, label);
  const path = `${folder}/${label}.jpg`;
  const { error } = await supabase.storage
    .from(VERIFICATIONS_BUCKET)
    .upload(path, compressed, {
      upsert: false,
      contentType: "image/jpeg",
    });
  if (error) throw error;
  return path;
}

/**
 * Submit a new identity verification. Mirrors the mobile flow:
 *   1) upload front (+ back if required) + selfie to the verifications bucket
 *      under `${user_id}/${timestamp}/`
 *   2) insert a verifications row with decision='pending'
 *   3) update profiles with submission metadata
 *   4) invoke the verify-identity Edge Function with the new verification_id
 *   5) return the final decision + scores
 *
 * Caller is responsible for calling refreshProfile() afterwards to pick up
 * the flipped profiles.is_verified flag on approval.
 */
export async function submitVerification({ idType, frontFile, backFile, selfieFile }) {
  if (!idType) throw new Error("Missing ID type");
  if (!frontFile) throw new Error("Missing ID front image");
  if (!selfieFile) throw new Error("Missing selfie image");

  const meta = getIdTypeMeta(idType);
  if (meta?.requiresBack && !backFile) {
    throw new Error("This ID type requires a back photo");
  }

  const user = await currentUser();
  const folder = `${user.id}/${Date.now()}`;

  // Parallel uploads
  const uploads = [
    uploadOne(folder, "front", frontFile),
    uploadOne(folder, "selfie", selfieFile),
  ];
  if (meta?.requiresBack && backFile) {
    uploads.push(uploadOne(folder, "back", backFile));
  }
  const [frontPath, selfiePath, backPath] = await Promise.all(uploads);

  // Insert verifications row — decision starts as 'pending'
  const { data: inserted, error: insErr } = await supabase
    .from("verifications")
    .insert({
      user_id: user.id,
      id_type: idType,
      id_front_path: frontPath,
      id_back_path: backPath || null,
      selfie_path: selfiePath,
      decision: "pending",
    })
    .select("id")
    .single();
  if (insErr) throw insErr;
  const verificationId = inserted.id;

  // Stamp the profile so the status card knows there's a submission in flight,
  // even before the Edge Function returns.
  await supabase
    .from("profiles")
    .update({
      verification_id_type: idType,
      verification_submitted_at: new Date().toISOString(),
      verification_id_url: frontPath,
      verification_selfie_url: selfiePath,
      verification_decision: null,
      verification_rejection_reason: null,
    })
    .eq("id", user.id);

  // Run the AI checks. The Edge Function authenticates with the caller's JWT
  // and writes decision/scores back to the verifications row + profile.
  const { data: fnData, error: fnError } = await supabase.functions.invoke(
    "verify-identity",
    { body: { verification_id: verificationId } }
  );

  if (fnError) {
    return {
      verificationId,
      decision: "pending",
      decisionReason:
        fnError.message ||
        "AI verification didn't complete — an admin will review your submission.",
      faceMatchScore: null,
      ocrConfidence: null,
      nameMatchScore: null,
      error: fnError,
    };
  }

  return {
    verificationId,
    decision: fnData?.decision || "pending",
    decisionReason: fnData?.decision_reason || fnData?.reason || null,
    faceMatchScore: fnData?.face_match_score ?? null,
    ocrConfidence: fnData?.ocr_confidence ?? null,
    nameMatchScore: fnData?.name_match_score ?? null,
    error: null,
  };
}
