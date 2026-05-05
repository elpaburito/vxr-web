-- =============================================================
-- Profile columns used by the web ProfilePage (mirrors the mobile
-- profile_information_screen.dart fields).
-- Idempotent. Paste into Supabase SQL Editor.
-- =============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url    text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS address       text,
  ADD COLUMN IF NOT EXISTS updated_at    timestamptz DEFAULT now();

-- Allow users to UPDATE their own avatar object so the web client can
-- overwrite a previously uploaded avatar in the listing-images bucket
-- under the {uid}/ prefix (already covered by INSERT/DELETE policies
-- in setup.sql). Without this, re-uploading an avatar with the same
-- key would fail RLS.
DROP POLICY IF EXISTS "Users can update own listing images" ON storage.objects;
CREATE POLICY "Users can update own listing images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
