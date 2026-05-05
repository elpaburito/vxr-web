-- ===========================================================================
-- Tighten application insert RLS: only allow tenants to apply to listings
-- that are both ACTIVE and VERIFIED. Mirrors the UI / service checks added
-- in UnitDetails.jsx and applicationsService.js, and is the bypass-proof
-- backstop if a client skips both.
--
-- Run this once against the live Supabase project (SQL Editor → Run).
-- Safe to re-run — DROP POLICY IF EXISTS + CREATE POLICY.
-- ===========================================================================

DROP POLICY IF EXISTS application_tenant_insert ON public.application;

CREATE POLICY application_tenant_insert ON public.application
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = application.listing_id
        AND l.is_verified = true
        AND l.status = 'active'
    )
  );
