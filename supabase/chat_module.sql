-- =============================================================
-- Chat / conversation module: RLS, conversation_with_profiles view,
-- realtime publication, and the chat-attachments storage bucket.
--
-- Assumes the conversation + message tables, the
-- conversation_touch_last_message function, and the
-- message_touch_conversation trigger already exist (idempotent).
-- =============================================================


-- ---------- 1. Row-level security ----------
ALTER TABLE public.conversation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message      ENABLE ROW LEVEL SECURITY;

-- Conversations: tenant or landlord can read/insert/update their own row
DROP POLICY IF EXISTS conversation_select_member ON public.conversation;
CREATE POLICY conversation_select_member ON public.conversation
  FOR SELECT TO authenticated
  USING (auth.uid() = tenant_id OR auth.uid() = landlord_id);

DROP POLICY IF EXISTS conversation_insert_member ON public.conversation;
CREATE POLICY conversation_insert_member ON public.conversation
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = tenant_id OR auth.uid() = landlord_id);

DROP POLICY IF EXISTS conversation_update_member ON public.conversation;
CREATE POLICY conversation_update_member ON public.conversation
  FOR UPDATE TO authenticated
  USING (auth.uid() = tenant_id OR auth.uid() = landlord_id)
  WITH CHECK (auth.uid() = tenant_id OR auth.uid() = landlord_id);

-- Messages: members of the conversation can read; the sender (and only the
-- sender) can insert. UPDATE is allowed for members so the recipient can
-- mark messages as read. The trigger fires regardless and updates the
-- conversation's last_message snapshot.
DROP POLICY IF EXISTS message_select_member ON public.message;
CREATE POLICY message_select_member ON public.message
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation c
      WHERE c.id = message.conversation_id
        AND (c.tenant_id = auth.uid() OR c.landlord_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS message_insert_sender ON public.message;
CREATE POLICY message_insert_sender ON public.message
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation c
      WHERE c.id = conversation_id
        AND (c.tenant_id = auth.uid() OR c.landlord_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS message_update_member ON public.message;
CREATE POLICY message_update_member ON public.message
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation c
      WHERE c.id = message.conversation_id
        AND (c.tenant_id = auth.uid() OR c.landlord_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation c
      WHERE c.id = message.conversation_id
        AND (c.tenant_id = auth.uid() OR c.landlord_id = auth.uid())
    )
  );


-- ---------- 2. conversation_with_profiles view ----------
-- The web messagingService queries this view to render the conversation
-- list with the other party's name/avatar and the listing title in one
-- request. security_invoker so RLS on the underlying tables still applies.
CREATE OR REPLACE VIEW public.conversation_with_profiles AS
SELECT
  c.*,
  tp.full_name  AS tenant_name,
  tp.avatar_url AS tenant_avatar,
  lp.full_name  AS landlord_name,
  lp.avatar_url AS landlord_avatar,
  l.title       AS listing_title
FROM public.conversation c
LEFT JOIN public.profiles tp ON tp.id = c.tenant_id
LEFT JOIN public.profiles lp ON lp.id = c.landlord_id
LEFT JOIN public.listings  l  ON l.id  = c.listing_id;

ALTER VIEW public.conversation_with_profiles SET (security_invoker = true);


-- ---------- 3. Realtime ----------
-- Subscriptions in the web/mobile clients depend on these being members
-- of supabase_realtime. Both ALTERs are wrapped to no-op if already added.
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.message;      EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation; EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ---------- 4. chat-attachments storage bucket ----------
-- Supports image and file message types. Public-read so messages render
-- without signed URLs (matches mobile, which stores public URLs in
-- message.url). RLS scopes inserts to the sender's own folder.
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS chat_attachments_public_read ON storage.objects;
CREATE POLICY chat_attachments_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS chat_attachments_owner_insert ON storage.objects;
CREATE POLICY chat_attachments_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS chat_attachments_owner_delete ON storage.objects;
CREATE POLICY chat_attachments_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
