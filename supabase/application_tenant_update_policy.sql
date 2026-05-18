-- ===========================================================================
-- Allow tenants to UPDATE their own application row when it is in a
-- tenant-mutable state. Closes a silent-failure gap: without this policy,
-- the re-apply flow (submitApplication on a previously-rejected row) and
-- the edit-pending flow (updateApplication) both fired UPDATEs that RLS
-- silently dropped to zero rows because no tenant UPDATE policy existed.
-- Tenant saw "submitted" but the row never changed status.
--
-- USING  — limits which rows the tenant can target. 'pending' covers
--          edit-while-pending; 'rejected' covers re-applying. 'approved'
--          rows stay immutable from the tenant side.
-- CHECK  — limits the resulting row shape. tenant_id can't be reassigned,
--          and the post-update status must be 'pending' (no self-approve,
--          no self-reject). Both legitimate code paths satisfy this:
--          submitApplication sets status='pending' on re-apply, and
--          updateApplication never touches status.
--
-- Run this once against the live Supabase project (SQL Editor → Run).
-- Safe to re-run — DROP POLICY IF EXISTS + CREATE POLICY.
-- ===========================================================================

DROP POLICY IF EXISTS application_tenant_update ON public.application;

CREATE POLICY application_tenant_update ON public.application
  FOR UPDATE TO authenticated
  USING (
    tenant_id = auth.uid()
    AND status IN ('pending', 'rejected')
  )
  WITH CHECK (
    tenant_id = auth.uid()
    AND status = 'pending'
  );
