import { supabase } from "./supabase";

const CHAT_BUCKET = "chat-attachments";

/**
 * Fetch all conversations for the current user (tenant or landlord).
 * Enriched via the conversation_with_profiles view with the other
 * participant's name/avatar and the listing title.
 */
export async function fetchConversations(userId) {
  if (!userId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("conversation_with_profiles")
    .select("*")
    .or(`tenant_id.eq.${userId},landlord_id.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  return { data: data ?? [], error };
}

/**
 * Fetch unread message counts grouped by conversation for the current
 * user. Returns a Map<conversationId, count> so the conversation list
 * can render unread badges before messages are loaded.
 */
export async function fetchUnreadCounts(userId) {
  if (!userId) return new Map();
  const { data, error } = await supabase
    .from("message")
    .select("conversation_id")
    .eq("is_read", false)
    .neq("sender_id", userId);
  if (error) return new Map();
  const map = new Map();
  for (const row of data ?? []) {
    map.set(row.conversation_id, (map.get(row.conversation_id) ?? 0) + 1);
  }
  return map;
}

/**
 * Fetch messages for a conversation, oldest first. Includes attachment
 * fields (type/url/file_name) so image and file messages render too.
 */
export async function fetchMessages(conversationId) {
  if (!conversationId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("message")
    .select("id, conversation_id, sender_id, type, content, url, file_name, is_read, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return { data: data ?? [], error };
}

export async function findConversation(tenantId, landlordId, listingId = null) {
  let query = supabase
    .from("conversation")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("landlord_id", landlordId);

  if (listingId) query = query.eq("listing_id", listingId);
  else           query = query.is("listing_id", null);

  const { data, error } = await query.maybeSingle();
  return { data, error };
}

export async function createConversation(tenantId, landlordId, listingId = null) {
  const { data, error } = await supabase
    .from("conversation")
    .insert({ tenant_id: tenantId, landlord_id: landlordId, listing_id: listingId })
    .select("id")
    .single();
  return { data, error };
}

/**
 * Get or create a conversation between tenant and landlord (optionally
 * scoped to a listing). Returns the conversation id row.
 */
export async function getOrCreateConversation(tenantId, landlordId, listingId = null) {
  const { data: existing } = await findConversation(tenantId, landlordId, listingId);
  if (existing) return { data: existing, error: null };
  return createConversation(tenantId, landlordId, listingId);
}

/**
 * Send a text message. The message_touch_conversation trigger will
 * update conversation.last_message + last_message_at.
 */
export async function sendMessage(conversationId, senderId, content) {
  if (!conversationId || !senderId || !content?.trim()) {
    return { error: new Error("Missing required fields") };
  }
  const { data, error } = await supabase
    .from("message")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      type: "text",
      content: content.trim(),
    })
    .select("*")
    .single();
  return { data, error };
}

/**
 * Send an attachment (image or file). Uploads to chat-attachments under
 * the sender's folder, then inserts a message row with the public URL.
 */
export async function sendAttachmentMessage({
  conversationId, senderId, file, type = "image",
}) {
  if (!conversationId || !senderId || !file) {
    return { error: new Error("Missing required fields") };
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${senderId}/${conversationId}/${Date.now()}-${safeName}`;
  const { error: upErr } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) return { error: upErr };

  const { data: pub } = supabase.storage.from(CHAT_BUCKET).getPublicUrl(path);
  const url = pub?.publicUrl ?? null;

  const { data, error } = await supabase
    .from("message")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      type,
      url,
      file_name: file.name,
      content: type === "image" ? null : file.name,
    })
    .select("*")
    .single();
  return { data, error };
}

/**
 * Mark all messages from the OTHER party as read for the current user.
 */
export async function markMessagesRead(conversationId, currentUserId) {
  if (!conversationId || !currentUserId) return;
  await supabase
    .from("message")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", currentUserId)
    .eq("is_read", false);
}

/**
 * Subscribe to new messages in a conversation. onMessage(msg) fires for
 * every INSERT. Returns the channel — call .unsubscribe() to clean up.
 */
export function subscribeToMessages(conversationId, onMessage) {
  return supabase
    .channel(`message:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "message",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(payload.new)
    )
    .subscribe();
}

/**
 * Subscribe to conversation list updates (last_message changes).
 */
export function subscribeToConversations(userId, onUpdate) {
  return supabase
    .channel(`conversation:${userId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "conversation" },
      (payload) => onUpdate(payload.new)
    )
    .subscribe();
}
