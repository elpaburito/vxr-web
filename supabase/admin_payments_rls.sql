-- =============================================================
-- ViewxRent — Admin RLS for payment tables
-- Lets admins read & manage payment_transactions, payment, payment_links.
-- Depends on admin_module.sql (uses public.is_admin()).
--
-- Paste into Supabase SQL Editor. Idempotent.
-- =============================================================

-- payment_transactions: full admin access (read + future refund/cancel writes)
DROP POLICY IF EXISTS payment_transactions_admin_all ON public.payment_transactions;
CREATE POLICY payment_transactions_admin_all ON public.payment_transactions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- payment (legacy table): full admin access
DROP POLICY IF EXISTS payment_admin_all ON public.payment;
CREATE POLICY payment_admin_all ON public.payment
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- payment_links: full admin access
DROP POLICY IF EXISTS payment_links_admin_all ON public.payment_links;
CREATE POLICY payment_links_admin_all ON public.payment_links
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Optional: attach the audit trigger to payment_transactions so admin
-- mutations (manual refund flips, status overrides) land in the audit log.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema='public' AND table_name='payment_transactions'
  ) AND EXISTS (
    SELECT 1 FROM pg_proc WHERE proname='admin_audit_trigger'
  ) THEN
    DROP TRIGGER IF EXISTS payment_transactions_audit ON public.payment_transactions;
    CREATE TRIGGER payment_transactions_audit
      AFTER UPDATE OR DELETE ON public.payment_transactions
      FOR EACH ROW EXECUTE FUNCTION public.admin_audit_trigger();
  END IF;
END $$;
