-- =============================================================
-- ViewxRent — Admin user suspension
-- Adds is_suspended/suspended_at/suspension_reason to profiles and
-- layers RESTRICTIVE RLS policies that block suspended users from
-- key write paths (listings, applications, payment methods, chat).
--
-- Layering as RESTRICTIVE means we don't have to touch any existing
-- INSERT/UPDATE policies — Postgres ANDs all restrictive policies
-- with the permissive ones, so a suspended user is uniformly blocked
-- regardless of which permissive policy would otherwise grant access.
--
-- Depends on admin_module.sql (uses public.is_admin()).
-- Paste into Supabase SQL Editor. Idempotent.
-- =============================================================


-- =====================================================
-- 1. Columns
-- =====================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at      timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

CREATE INDEX IF NOT EXISTS profiles_suspended_idx
  ON public.profiles(is_suspended)
  WHERE is_suspended;


-- =====================================================
-- 2. is_suspended() helper — SECURITY DEFINER so policies can call it
--    without recursing into profiles RLS.
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_suspended(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_suspended FROM public.profiles p WHERE p.id = uid),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_suspended(uuid) TO authenticated;


-- =====================================================
-- 3. RESTRICTIVE policies that block suspended users on writes.
--    Admins (public.is_admin()) bypass — they need to be able to
--    correct data even on a suspended account.
--    Each policy is applied to a different table via the same predicate.
-- =====================================================

-- listings: prevent suspended landlords from inserting/updating
DROP POLICY IF EXISTS listings_block_suspended ON public.listings;
CREATE POLICY listings_block_suspended ON public.listings
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING       (NOT public.is_suspended() OR public.is_admin())
  WITH CHECK  (NOT public.is_suspended() OR public.is_admin());

-- application: prevent suspended tenants from submitting/updating
DROP POLICY IF EXISTS application_block_suspended ON public.application;
CREATE POLICY application_block_suspended ON public.application
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING       (NOT public.is_suspended() OR public.is_admin())
  WITH CHECK  (NOT public.is_suspended() OR public.is_admin());

-- payment_methods: prevent suspended users from adding/changing methods
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema='public' AND table_name='payment_methods'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS payment_methods_block_suspended ON public.payment_methods';
    EXECUTE 'CREATE POLICY payment_methods_block_suspended ON public.payment_methods '
         || 'AS RESTRICTIVE FOR ALL TO authenticated '
         || 'USING (NOT public.is_suspended() OR public.is_admin()) '
         || 'WITH CHECK (NOT public.is_suspended() OR public.is_admin())';
  END IF;
END $$;

-- chat_message (if present): prevent suspended users from sending messages
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema='public' AND table_name='chat_message'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS chat_message_block_suspended ON public.chat_message';
    EXECUTE 'CREATE POLICY chat_message_block_suspended ON public.chat_message '
         || 'AS RESTRICTIVE FOR ALL TO authenticated '
         || 'USING (NOT public.is_suspended() OR public.is_admin()) '
         || 'WITH CHECK (NOT public.is_suspended() OR public.is_admin())';
  END IF;
END $$;

-- maintenance_report: prevent suspended tenants from filing new reports
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema='public' AND table_name='maintenance_report'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS maintenance_report_block_suspended ON public.maintenance_report';
    EXECUTE 'CREATE POLICY maintenance_report_block_suspended ON public.maintenance_report '
         || 'AS RESTRICTIVE FOR ALL TO authenticated '
         || 'USING (NOT public.is_suspended() OR public.is_admin()) '
         || 'WITH CHECK (NOT public.is_suspended() OR public.is_admin())';
  END IF;
END $$;

-- Note: the audit trigger from admin_audit_log_module.sql already
-- specializes on profiles.is_suspended changes and emits
-- 'profiles.suspend' / 'profiles.unsuspend' actions automatically.
