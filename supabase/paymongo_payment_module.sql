-- =====================================================
-- MODULE: PAYMONGO PAYMENTS — saved methods + transactions ledger
--
-- Replaces the Stripe-only payment flow with PayMongo (cards, GCash,
-- Maya, GrabPay, bank transfer) in sandbox/test mode and adds:
--   * payment_methods       — saved e-wallet / bank shortcuts per user
--   * payment_transactions  — per-attempt ledger
--
-- Dual-column transition strategy on existing `payment`:
--   * Adds paymongo_payment_intent_id alongside stripe_payment_intent_id
--   * Does NOT drop the Stripe column — mobile still reads it.
--   * Loosens status CHECK so the ledger and payment table share enum.
--
-- Run idempotently; safe to re-apply.
-- =====================================================


-- -----------------------------------------------------
-- payment_methods (saved e-wallet / bank shortcuts only)
-- -----------------------------------------------------
-- Cards are NOT saved. PayMongo does not expose card vaulting in PH,
-- so storing a "saved card" would mislead users into thinking the card
-- is reusable when it actually requires fresh entry every time. Cards
-- are entered fresh at checkout via PayMongo.js iframe inputs.
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text NOT NULL
                 CHECK (type IN ('gcash','paymaya','grab_pay','bank_transfer')),
  label        text,
  account_hint text,
  billing_name text,
  is_default   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

-- School-demo mode: when MOCK_PAYMENTS_ENABLED=true server-side, the
-- Add Method modal exposes a "Mock" checkbox; methods with is_mock=true
-- complete payments instantly at checkout without contacting PayMongo.
-- Server-side env gate prevents accidental production use.
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS is_mock boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS payment_methods_user_idx
  ON public.payment_methods(user_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_one_default
  ON public.payment_methods(user_id) WHERE is_default = true AND deleted_at IS NULL;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pm_select_own ON public.payment_methods;
CREATE POLICY pm_select_own ON public.payment_methods
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS pm_insert_own ON public.payment_methods;
CREATE POLICY pm_insert_own ON public.payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS pm_update_own ON public.payment_methods;
CREATE POLICY pm_update_own ON public.payment_methods
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------
-- payment_transactions (per-attempt ledger)
-- -----------------------------------------------------
-- One row per attempt, regardless of outcome. The existing `payment`
-- table remains as the "successful payment of record" per contract;
-- a succeeded transaction also upserts the matching payment row.
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id                 uuid NOT NULL REFERENCES public.contract(id) ON DELETE CASCADE,
  user_id                     uuid NOT NULL REFERENCES auth.users(id),
  payment_method_id           uuid REFERENCES public.payment_methods(id),
  paymongo_payment_intent_id  text NOT NULL,
  paymongo_payment_id         text,
  amount_cents                integer NOT NULL CHECK (amount_cents > 0),
  currency                    text NOT NULL DEFAULT 'php',
  status                      text NOT NULL
                                CHECK (status IN ('pending','requires_action','succeeded','failed','refunded','cancelled')),
  method_type                 text NOT NULL
                                CHECK (method_type IN ('card','gcash','paymaya','grab_pay','bank_transfer')),
  brand                       text,
  last4                       text,
  billing_name                text,
  failure_reason              text,
  raw_response                jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (paymongo_payment_intent_id)
);

-- Phase A: landlord-recorded offline payments.
--   recorded_by — null for tenant-paid PayMongo rows, set to landlord's
--                 user_id when the landlord logs a cash / bank / direct
--                 GCash payment they received off-platform.
--   note        — free-text landlord note (e.g. "Cash, receipt #042").
-- Phase B: monthly rent tracking.
--   billing_month — first day of the month this payment covers
--                   (e.g. 2026-05-01). Nullable so legacy move-in and
--                   pre-PayMongo rows stay valid; recurring rent rows
--                   populate it so a tenant knows which month was paid.
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS recorded_by   uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS note          text,
  ADD COLUMN IF NOT EXISTS billing_month date;

-- Relax method_type to allow offline methods landlords can record.
ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_method_type_check;
ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_method_type_check
  CHECK (method_type IN ('card','gcash','paymaya','grab_pay','bank_transfer','cash','offline_other'));

CREATE INDEX IF NOT EXISTS pt_contract_idx     ON public.payment_transactions(contract_id);
CREATE INDEX IF NOT EXISTS pt_user_status_idx  ON public.payment_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS pt_created_idx      ON public.payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS pt_billing_month_idx
  ON public.payment_transactions(contract_id, billing_month)
  WHERE billing_month IS NOT NULL;

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pt_select_party ON public.payment_transactions;
CREATE POLICY pt_select_party ON public.payment_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contract c
      WHERE c.id = payment_transactions.contract_id
        AND (auth.uid() = c.tenant_id OR auth.uid() = c.landlord_id)
    )
  );
-- No client INSERT / UPDATE policy: ledger writes go through
-- service-role Edge Functions (paymongo-record-payment, paymongo-webhook).


-- -----------------------------------------------------
-- payment table — dual-column transition
-- -----------------------------------------------------
ALTER TABLE public.payment
  ADD COLUMN IF NOT EXISTS paymongo_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_transaction_id     uuid REFERENCES public.payment_transactions(id),
  -- Phase B: first day of the month this payment covers. Nullable so
  -- legacy / move-in rows stay valid; recurring rent rows populate it.
  ADD COLUMN IF NOT EXISTS billing_month              date;

-- Use a real UNIQUE CONSTRAINT (not a partial index): Supabase's
-- .upsert({ onConflict: "paymongo_payment_intent_id" }) can only match
-- a column-list against a non-partial unique index or constraint.
-- Postgres treats NULLs as distinct, so legacy Stripe-only rows with
-- paymongo_payment_intent_id IS NULL coexist safely.
ALTER TABLE public.payment DROP CONSTRAINT IF EXISTS payment_paymongo_pi_unique;
DROP INDEX IF EXISTS public.payment_paymongo_pi_idx;
ALTER TABLE public.payment
  ADD CONSTRAINT payment_paymongo_pi_unique UNIQUE (paymongo_payment_intent_id);

ALTER TABLE public.payment DROP CONSTRAINT IF EXISTS payment_status_check;
ALTER TABLE public.payment ADD CONSTRAINT payment_status_check
  CHECK (status IN ('succeeded','pending','requires_action','failed','refunded','cancelled'));

-- Phase B: at most one succeeded payment per (contract, billing_month).
-- Partial so legacy / move-in rows (billing_month IS NULL) don't trip it.
CREATE UNIQUE INDEX IF NOT EXISTS payment_one_per_month
  ON public.payment(contract_id, billing_month)
  WHERE status = 'succeeded' AND billing_month IS NOT NULL;


-- -----------------------------------------------------
-- contract_rent_status (Phase B)
--
-- One row per active contract describing the current rent state:
--   last_paid_month — newest billing_month with a succeeded payment
--   months_unpaid   — count of months from (start_month + 1) through
--                     current month with NO succeeded payment row.
--                     The start month is excluded because the move-in
--                     payment (deposit + advance + first month, recorded
--                     with billing_month = NULL) covers it.
--   next_due_month  — oldest unpaid month past the start month, or NULL
--                     if none has elapsed yet.
--
-- Drives the tenant dashboard's "Pay this month" and the landlord's
-- arrears view without recomputing on the client.
-- -----------------------------------------------------
CREATE OR REPLACE VIEW public.contract_rent_status AS
SELECT
  c.id                                       AS contract_id,
  c.tenant_id,
  c.landlord_id,
  c.listing_id,
  c.start_date,
  c.monthly_rent,
  date_trunc('month', current_date)::date    AS current_month,
  (SELECT max(p.billing_month) FROM public.payment p
    WHERE p.contract_id = c.id
      AND p.status = 'succeeded'
      AND p.billing_month IS NOT NULL)       AS last_paid_month,
  (
    SELECT count(*)::int FROM generate_series(
      date_trunc('month', c.start_date) + interval '1 month',
      date_trunc('month', current_date),
      interval '1 month'
    ) AS m
    WHERE NOT EXISTS (
      SELECT 1 FROM public.payment p
      WHERE p.contract_id = c.id
        AND p.status = 'succeeded'
        AND p.billing_month = m::date
    )
  )                                          AS months_unpaid,
  (
    SELECT min(m::date) FROM generate_series(
      date_trunc('month', c.start_date) + interval '1 month',
      date_trunc('month', current_date),
      interval '1 month'
    ) AS m
    WHERE NOT EXISTS (
      SELECT 1 FROM public.payment p
      WHERE p.contract_id = c.id
        AND p.status = 'succeeded'
        AND p.billing_month = m::date
    )
  )                                          AS next_due_month
FROM public.contract c
WHERE c.start_date IS NOT NULL
  AND c.status IN ('paid','terminating','expiring','terminated','ended');

ALTER VIEW public.contract_rent_status SET (security_invoker = true);


-- -----------------------------------------------------
-- payment_links (Phase C)
--
-- Landlord-generated PayMongo Link URLs the tenant can pay from any
-- device. Each link is for a single (contract, billing_month). When the
-- tenant pays, the paymongo-webhook flips the link to 'paid' and links
-- it to the resulting payment_transactions row.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_links (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id         uuid NOT NULL REFERENCES public.contract(id) ON DELETE CASCADE,
  landlord_id         uuid NOT NULL REFERENCES auth.users(id),
  billing_month       date NOT NULL,
  amount_cents        integer NOT NULL CHECK (amount_cents > 0),
  paymongo_link_id    text UNIQUE NOT NULL,
  checkout_url        text NOT NULL,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','paid','expired','cancelled')),
  paid_transaction_id uuid REFERENCES public.payment_transactions(id),
  note                text,
  expires_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_links_contract_idx ON public.payment_links(contract_id);
CREATE INDEX IF NOT EXISTS payment_links_status_idx   ON public.payment_links(contract_id, status);

ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

-- Tenant + landlord on the contract can both SEE links (tenant needs
-- the URL; landlord manages them). Writes are service-role only — the
-- Edge Function paymongo-create-payment-link does the insert, the
-- webhook does the status update.
DROP POLICY IF EXISTS pl_select_party ON public.payment_links;
CREATE POLICY pl_select_party ON public.payment_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contract c
      WHERE c.id = payment_links.contract_id
        AND (auth.uid() = c.tenant_id OR auth.uid() = c.landlord_id)
    )
  );


-- -----------------------------------------------------
-- Ledger-with-context view (drives MyPayments transaction history)
-- UNIONs the new ledger with legacy `payment` rows that don't yet have
-- a ledger entry, so users who paid via the old Stripe flow still see
-- their payment history after the PayMongo migration.
-- -----------------------------------------------------
-- DROP + CREATE (not CREATE OR REPLACE) because Phase A adds three
-- new projected columns (recorded_by / note / billing_month) and
-- Postgres rejects column-list changes via REPLACE.
DROP VIEW IF EXISTS public.payment_transactions_with_context;
CREATE VIEW public.payment_transactions_with_context AS
-- New ledger entries (PayMongo + mock + landlord-recorded offline payments)
SELECT
  pt.id, pt.contract_id, pt.user_id, pt.payment_method_id,
  pt.paymongo_payment_intent_id, pt.paymongo_payment_id,
  pt.amount_cents, pt.currency, pt.status,
  pt.method_type, pt.brand, pt.last4, pt.billing_name,
  pt.failure_reason, pt.raw_response,
  pt.recorded_by, pt.note, pt.billing_month,
  pt.created_at, pt.updated_at,
  c.tenant_id, c.landlord_id, c.listing_id,
  l.title AS listing_title,
  pm.type AS pm_type, pm.label AS pm_label
FROM   public.payment_transactions pt
JOIN   public.contract c          ON c.id = pt.contract_id
LEFT JOIN public.listings l       ON l.id = c.listing_id
LEFT JOIN public.payment_methods pm ON pm.id = pt.payment_method_id

UNION ALL

-- Legacy `payment` rows (pre-PayMongo Stripe payments without a ledger entry)
SELECT
  p.id, p.contract_id,
  c.tenant_id AS user_id,
  NULL::uuid AS payment_method_id,
  COALESCE(p.paymongo_payment_intent_id, p.stripe_payment_intent_id) AS paymongo_payment_intent_id,
  COALESCE(p.paymongo_payment_intent_id, p.stripe_payment_intent_id) AS paymongo_payment_id,
  p.amount_cents, p.currency, p.status,
  'card'::text AS method_type,
  p.method AS brand,
  p.last4,
  p.name AS billing_name,
  NULL::text  AS failure_reason,
  NULL::jsonb AS raw_response,
  NULL::uuid  AS recorded_by,
  NULL::text  AS note,
  p.billing_month,
  p.paid_at AS created_at,
  p.paid_at AS updated_at,
  c.tenant_id, c.landlord_id, c.listing_id,
  l.title AS listing_title,
  NULL::text AS pm_type,
  NULL::text AS pm_label
FROM   public.payment p
JOIN   public.contract c     ON c.id = p.contract_id
LEFT JOIN public.listings l  ON l.id = c.listing_id
WHERE  p.payment_transaction_id IS NULL;

ALTER VIEW public.payment_transactions_with_context SET (security_invoker = true);
