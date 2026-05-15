import { supabase } from "./supabase";

const TABLE = "notification";

export async function fetchNotifications(userId, { limit = 30 } = {}) {
  if (!userId) return { data: [], error: null };
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: data ?? [], error };
}

export async function fetchUnreadCount(userId) {
  if (!userId) return { count: 0, error: null };
  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return { count: count ?? 0, error };
}

export async function markAsRead(notificationId) {
  if (!notificationId) return { error: new Error("Missing notificationId") };
  const { error } = await supabase
    .from(TABLE)
    .update({ is_read: true })
    .eq("id", notificationId);
  return { error };
}

export async function markAllAsRead(userId) {
  if (!userId) return { error: new Error("Missing userId") };
  const { error } = await supabase
    .from(TABLE)
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return { error };
}

export async function createNotification({
  userId,
  type,
  title,
  body = null,
  referenceId = null,
  referenceType = null,
}) {
  if (!userId || !type || !title) {
    return { error: new Error("Missing required fields") };
  }
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      type,
      title,
      body,
      reference_id: referenceId,
      reference_type: referenceType,
    })
    .select("id")
    .single();
  return { data, error };
}

/**
 * Subscribe to INSERTs on the notification table filtered to a user.
 * Returns the channel — call .unsubscribe() to clean up.
 */
export function subscribeToNotifications(userId, onInsert) {
  return supabase
    .channel(`notification:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: TABLE,
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
}
