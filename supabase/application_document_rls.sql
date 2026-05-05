-- =============================================================
-- application_document table: creation (if missing) + RLS policies
-- Paste into Supabase SQL Editor and run once. Idempotent.
-- =============================================================

-- Create the table if it wasn't created by a mobile migration
CREATE TABLE IF NOT EXISTS public.application_document (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES public.application(id) ON DELETE CASCADE,
  document_type   text NOT NULL,   -- 'valid_id_front' | 'valid_id_back' | 'proof_of_income'
  url             text NOT NULL,   -- storage path inside 'application-documents' bucket
  file_name       text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_application_document_application
  ON public.application_document(application_id);

-- Enable RLS
ALTER TABLE public.application_document ENABLE ROW LEVEL SECURITY;

-- Drop old policies so this block is idempotent
DROP POLICY IF EXISTS application_document_tenant_select   ON public.application_document;
DROP POLICY IF EXISTS application_document_landlord_select ON public.application_document;
DROP POLICY IF EXISTS application_document_tenant_insert   ON public.application_document;
DROP POLICY IF EXISTS application_document_tenant_delete   ON public.application_document;

-- Tenants can read their own documents
CREATE POLICY application_document_tenant_select ON public.application_document
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.application a
      WHERE a.id = application_document.application_id
        AND a.tenant_id = auth.uid()
    )
  );

-- Landlords can read documents for applications submitted to their listings
CREATE POLICY application_document_landlord_select ON public.application_document
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.application a
      WHERE a.id = application_document.application_id
        AND a.landlord_id = auth.uid()
    )
  );

-- Tenants can insert documents for their own applications
CREATE POLICY application_document_tenant_insert ON public.application_document
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.application a
      WHERE a.id = application_document.application_id
        AND a.tenant_id = auth.uid()
    )
  );

-- Tenants can delete their own documents (needed for re-application cleanup)
CREATE POLICY application_document_tenant_delete ON public.application_document
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.application a
      WHERE a.id = application_document.application_id
        AND a.tenant_id = auth.uid()
    )
  );
