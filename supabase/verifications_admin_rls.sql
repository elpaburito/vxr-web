-- =============================================================
-- RLS for the verifications table + verifications storage bucket
-- so admins can read/update every submission and generate signed
-- URLs for the ID + selfie files. Idempotent.
--
-- Requires: public.is_admin() (defined in admin_module.sql).
-- Run in Supabase SQL Editor.
-- =============================================================

-- ---------- 1. Table policies ----------
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS verifications_owner_select ON public.verifications;
DROP POLICY IF EXISTS verifications_owner_insert ON public.verifications;
DROP POLICY IF EXISTS verifications_admin_all    ON public.verifications;

-- Owner: read & insert own submissions
CREATE POLICY verifications_owner_select ON public.verifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY verifications_owner_insert ON public.verifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin: full access (read + update decision/processed_at, etc.)
CREATE POLICY verifications_admin_all ON public.verifications
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ---------- 2. Storage bucket: verifications ----------
-- Existing owner_select policy in modules.sql restricts SELECT to
-- (storage.foldername(name))[1] = auth.uid()::text — this blocks
-- admins. Add an admin SELECT policy alongside it.

DROP POLICY IF EXISTS verifications_admin_select ON storage.objects;
CREATE POLICY verifications_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verifications'
    AND public.is_admin()
  );
