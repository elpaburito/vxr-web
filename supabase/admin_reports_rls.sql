-- =============================================================
-- ViewxRent — Admin RLS for maintenance_report
-- Adds admin read/write and an admin-only escalation field.
-- Depends on admin_module.sql.
--
-- Paste into Supabase SQL Editor. Idempotent and defensive — if the
-- maintenance_report table doesn't exist yet, this file is a no-op.
-- Run maintenance_report_module.sql FIRST to create the table, then
-- re-run this file to apply admin policies + escalation columns.
-- =============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema='public' AND table_name='maintenance_report'
  ) THEN
    RAISE NOTICE 'admin_reports_rls.sql: public.maintenance_report does not exist yet — skipping. Apply maintenance_report_module.sql first.';
    RETURN;
  END IF;

  -- Admin-only escalation tracking on top of the existing tenant/landlord workflow.
  ALTER TABLE public.maintenance_report
    ADD COLUMN IF NOT EXISTS admin_notes  text,
    ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
    ADD COLUMN IF NOT EXISTS resolved_at  timestamptz;

  EXECUTE 'DROP POLICY IF EXISTS report_admin_all ON public.maintenance_report';
  EXECUTE 'CREATE POLICY report_admin_all ON public.maintenance_report '
       || 'FOR ALL TO authenticated '
       || 'USING (public.is_admin()) WITH CHECK (public.is_admin())';

  -- Attach audit trigger so admin status flips & note edits land in the log
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname='admin_audit_trigger') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS maintenance_report_audit ON public.maintenance_report';
    EXECUTE 'CREATE TRIGGER maintenance_report_audit '
         || 'AFTER UPDATE OR DELETE ON public.maintenance_report '
         || 'FOR EACH ROW EXECUTE FUNCTION public.admin_audit_trigger()';
  END IF;
END $$;
