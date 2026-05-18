-- Fix: paymongo-record-payment upsert fails with
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- because the existing index is PARTIAL (WHERE ... IS NOT NULL) and Supabase's
-- .upsert({ onConflict: "..." }) cannot pass the predicate to Postgres.
--
-- Swap the partial unique INDEX for a regular UNIQUE CONSTRAINT.
-- Postgres treats NULLs as distinct in UNIQUE constraints by default,
-- so legacy Stripe rows (paymongo_payment_intent_id IS NULL) are unaffected.

ALTER TABLE public.payment DROP CONSTRAINT IF EXISTS payment_paymongo_pi_unique;
DROP INDEX IF EXISTS public.payment_paymongo_pi_idx;

ALTER TABLE public.payment
  ADD CONSTRAINT payment_paymongo_pi_unique UNIQUE (paymongo_payment_intent_id);
