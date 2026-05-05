import { supabase } from "./supabase";

/**
 * Fetch all bookmarked listing IDs for a user.
 * Returns an array of listing_id strings.
 */
export async function fetchBookmarkedIds(userId) {
  if (!userId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("bookmark")
    .select("listing_id")
    .eq("user_id", userId);
  return { data: (data ?? []).map((r) => r.listing_id), error };
}

/**
 * Fetch full bookmark rows (with listing join) for a user.
 */
export async function fetchBookmarks(userId) {
  if (!userId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("bookmark")
    .select("id, listing_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

/**
 * Add a bookmark (upsert so duplicates are ignored).
 */
export async function addBookmark(userId, listingId) {
  if (!userId || !listingId) return { error: new Error("Missing userId or listingId") };
  const { error } = await supabase
    .from("bookmark")
    .upsert({ user_id: userId, listing_id: listingId }, { onConflict: "user_id,listing_id", ignoreDuplicates: true });
  return { error };
}

/**
 * Remove a bookmark.
 */
export async function removeBookmark(userId, listingId) {
  if (!userId || !listingId) return { error: new Error("Missing userId or listingId") };
  const { error } = await supabase
    .from("bookmark")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);
  return { error };
}
