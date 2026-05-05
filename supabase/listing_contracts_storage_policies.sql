-- ===========================================================================
-- listing-contracts bucket: RLS policies
-- Run this once against the live Supabase project to allow landlords to
-- upload / replace / delete their contract template files. Without these
-- the bucket exists but every storage operation returns 400 Bad Request.
-- ===========================================================================

-- 1. Make sure the bucket exists and is private.
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-contracts', 'listing-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- (RLS on storage.objects is already enabled by Supabase; the SQL Editor's
-- role does not own the table, so we can't / don't need to ALTER it.)

-- 2. Owner-folder policies. Files are uploaded to "${auth.uid()}/..." —
--    only that uid can read / insert / update / delete its own files.

DROP POLICY IF EXISTS listing_contracts_owner_insert ON storage.objects;
CREATE POLICY listing_contracts_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-contracts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS listing_contracts_owner_select ON storage.objects;
CREATE POLICY listing_contracts_owner_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'listing-contracts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS listing_contracts_owner_update ON storage.objects;
CREATE POLICY listing_contracts_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'listing-contracts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'listing-contracts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS listing_contracts_owner_delete ON storage.objects;
CREATE POLICY listing_contracts_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'listing-contracts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Tenants party to a contract on the listing can read the uploaded
--    template (so ContractView can fetch the file for the tenant side).
DROP POLICY IF EXISTS listing_contracts_party_select ON storage.objects;
CREATE POLICY listing_contracts_party_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'listing-contracts'
    AND EXISTS (
      SELECT 1 FROM public.contract c
      JOIN public.listings l ON l.id = c.listing_id
      WHERE l.contract_template_url = storage.objects.name
        AND (auth.uid() = c.tenant_id OR auth.uid() = c.landlord_id)
    )
  );
