-- =====================================================
-- AI VERIFICATION COLUMNS + LANDLORD READ RPC
--
-- Ports the missing pieces of the mobile app's
-- ai_verification_module.sql to the web schema, and adds
-- a SECURITY DEFINER RPC that lets a landlord see the
-- PII-safe verification fields of a tenant who has applied
-- to one of their listings — without broadening RLS on
-- the verifications table.
-- =====================================================

-- ---- 1. Profile columns the Edge Function writes to ----
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_id_type           text,
  ADD COLUMN IF NOT EXISTS verification_decision          text,
  ADD COLUMN IF NOT EXISTS verification_processed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS verification_rejection_reason  text;

-- ---- 2. Verifications table (idempotent for fresh DBs) ----
CREATE TABLE IF NOT EXISTS public.verifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_type             text NOT NULL,
  id_front_path       text NOT NULL,
  id_back_path        text,
  selfie_path         text NOT NULL,
  ocr_data            jsonb,
  extracted_name      text,
  extracted_id_number text,
  extracted_dob       date,
  face_match_score    numeric(4,3),
  ocr_confidence      numeric(4,3),
  name_match_score    numeric(4,3),
  decision            text NOT NULL DEFAULT 'pending',
  decision_reason     text,
  processed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS verifications_user_created_idx
  ON public.verifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS verifications_manual_review_idx
  ON public.verifications (created_at DESC)
  WHERE decision = 'manual_review';

-- Owner-only RLS on the verifications table itself
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS verifications_owner_select ON public.verifications;
CREATE POLICY verifications_owner_select ON public.verifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS verifications_owner_insert ON public.verifications;
CREATE POLICY verifications_owner_insert ON public.verifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS verifications_owner_update ON public.verifications;
CREATE POLICY verifications_owner_update ON public.verifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ---- 3. Landlord-side read RPC ----
--
-- Returns the PII-safe verification fields of a tenant who has
-- applied to one of the caller's listings. SECURITY DEFINER so
-- we can read past `verifications_owner_select` without giving
-- landlords blanket SELECT on the table. Authorization is the
-- existence of an application row owned by the caller.
CREATE OR REPLACE FUNCTION public.get_tenant_verification(p_tenant_id uuid)
RETURNS TABLE (
  id_type             text,
  extracted_name      text,
  extracted_id_number text,
  extracted_dob       date,
  processed_at        timestamptz,
  decision            text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id_type,
    v.extracted_name,
    v.extracted_id_number,
    v.extracted_dob,
    v.processed_at,
    v.decision
  FROM public.verifications v
  WHERE v.user_id = p_tenant_id
    AND v.decision = 'approved'
    AND EXISTS (
      SELECT 1
      FROM public.application a
      WHERE a.tenant_id = p_tenant_id
        AND a.landlord_id = auth.uid()
    )
  ORDER BY v.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_verification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_verification(uuid) TO authenticated;
