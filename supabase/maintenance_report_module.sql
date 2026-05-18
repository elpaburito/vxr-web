-- =====================================================
-- MODULE: MAINTENANCE_REPORT
-- Matches mobile report_management_screen.dart table shape.
-- Run once in Supabase SQL Editor. Idempotent.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.maintenance_report (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_id     uuid REFERENCES public.contract(id) ON DELETE SET NULL,
  listing_id      uuid REFERENCES public.listings(id)  ON DELETE SET NULL,
  title           text NOT NULL,
  description     text,
  category        text NOT NULL DEFAULT 'other'
                    CHECK (category IN (
                      'plumbing','electrical','structural',
                      'appliance','pest','cleanliness','other'
                    )),
  status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','resolved')),
  landlord_notes  text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maintenance_report_tenant_idx   ON public.maintenance_report(tenant_id);
CREATE INDEX IF NOT EXISTS maintenance_report_contract_idx ON public.maintenance_report(contract_id);
CREATE INDEX IF NOT EXISTS maintenance_report_status_idx   ON public.maintenance_report(status);

ALTER TABLE public.maintenance_report ENABLE ROW LEVEL SECURITY;

-- Tenant: full access to their own reports
DROP POLICY IF EXISTS report_tenant_select ON public.maintenance_report;
CREATE POLICY report_tenant_select ON public.maintenance_report
  FOR SELECT TO authenticated USING (tenant_id = auth.uid());

DROP POLICY IF EXISTS report_tenant_insert ON public.maintenance_report;
CREATE POLICY report_tenant_insert ON public.maintenance_report
  FOR INSERT TO authenticated WITH CHECK (tenant_id = auth.uid());

DROP POLICY IF EXISTS report_tenant_update ON public.maintenance_report;
CREATE POLICY report_tenant_update ON public.maintenance_report
  FOR UPDATE TO authenticated
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- Landlord: can view and update reports for their listings
DROP POLICY IF EXISTS report_landlord_select ON public.maintenance_report;
CREATE POLICY report_landlord_select ON public.maintenance_report
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = maintenance_report.listing_id
        AND l.landlord_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS report_landlord_update ON public.maintenance_report;
CREATE POLICY report_landlord_update ON public.maintenance_report
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = maintenance_report.listing_id
        AND l.landlord_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = maintenance_report.listing_id
        AND l.landlord_id = auth.uid()
    )
  );
