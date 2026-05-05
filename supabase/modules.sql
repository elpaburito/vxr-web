-- =============================================================
-- ViewxRent Web — Schema alignment with mobile migrations
-- Table names and column shapes match the Flutter mobile app.
-- Paste into Supabase SQL Editor and run once. Idempotent.
--
-- Mobile migration files already applied (or being applied):
--   bookmark_module.sql, application_module.sql, chat_module.sql,
--   conversation_listing_fk_repoint.sql, listing_contract_module.sql,
--   listing_contracts_storage_policies.sql, profiles_landlord_select.sql,
--   profiles_role_backfill.sql, verification_module.sql,
--   report_module_apply.sql
-- =============================================================


-- =====================================================
-- MODULE 1: BOOKMARK  (singular — matches mobile)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bookmark (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmark_user    ON public.bookmark(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_listing ON public.bookmark(listing_id);

ALTER TABLE public.bookmark ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookmark_owner_select ON public.bookmark;
CREATE POLICY bookmark_owner_select ON public.bookmark
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS bookmark_owner_insert ON public.bookmark;
CREATE POLICY bookmark_owner_insert ON public.bookmark
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS bookmark_owner_delete ON public.bookmark;
CREATE POLICY bookmark_owner_delete ON public.bookmark
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- =====================================================
-- MODULE 2: APPLICATION  (singular — matches mobile)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.application (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id              uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  tenant_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  landlord_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status                  text NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Step 1: Personal info (DB column names match mobile migration)
  first_name              text,
  last_name               text,
  email                   text,
  phone_number            text,
  date_of_birth           date,
  nationality             text,
  civil_status            text,
  current_address         text,
  num_of_occupants        integer,

  -- Step 2: Employment & Financial
  employment_status       text,
  company_name            text,
  job_title               text,
  monthly_income          numeric,
  employment_length       text,
  work_address            text,
  employer_contact        text,

  -- Step 3: Rental history
  previous_address        text,
  move_in_date            date,
  move_out_date           date,
  stayed_duration         text,
  previous_landlord       text,
  landlord_contact        text,
  reason_for_leaving      text,

  -- Step 4: ID types (documents stored in application_document table)
  primary_id_type         text,
  secondary_id_type       text,

  -- Step 5: Declaration
  agreed_to_declaration   boolean DEFAULT false,
  declaration_name        text,
  declaration_date        date,

  submitted_at            timestamptz,
  reviewed_at             timestamptz,
  reviewed_by             uuid REFERENCES auth.users(id),
  rejection_reason        text,
  notes                   text,

  created_at              timestamptz DEFAULT now()
);

-- Add landlord_id if missing (web-only column — mobile derives landlord via listing join)
ALTER TABLE public.application
  ADD COLUMN IF NOT EXISTS landlord_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS application_tenant_id_idx   ON public.application(tenant_id);
CREATE INDEX IF NOT EXISTS application_landlord_id_idx ON public.application(landlord_id);
CREATE INDEX IF NOT EXISTS application_listing_id_idx  ON public.application(listing_id);
CREATE INDEX IF NOT EXISTS application_status_idx      ON public.application(status);

ALTER TABLE public.application ENABLE ROW LEVEL SECURITY;

-- Drop old-named policies from mobile migrations (replaced below with consistent names)
DROP POLICY IF EXISTS "Tenants can view own applications"               ON public.application;
DROP POLICY IF EXISTS "Landlords can view applications for own listings" ON public.application;
DROP POLICY IF EXISTS "Tenants can insert own applications"              ON public.application;
DROP POLICY IF EXISTS "Landlords can update applications for own listings" ON public.application;

DROP POLICY IF EXISTS application_tenant_select   ON public.application;
DROP POLICY IF EXISTS application_landlord_select ON public.application;
DROP POLICY IF EXISTS application_tenant_insert   ON public.application;
DROP POLICY IF EXISTS application_landlord_update ON public.application;

CREATE POLICY application_tenant_select ON public.application
  FOR SELECT TO authenticated USING (tenant_id = auth.uid());

CREATE POLICY application_landlord_select ON public.application
  FOR SELECT TO authenticated USING (landlord_id = auth.uid());

-- Tenants can only apply when the target listing is both ACTIVE and
-- VERIFIED — this is the bypass-proof gate behind the UI / service
-- checks. Without this, a crafted POST could insert applications for
-- pending-verification listings.
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

CREATE POLICY application_landlord_update ON public.application
  FOR UPDATE TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Storage bucket for application documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-documents', 'application-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS application_docs_tenant_insert ON storage.objects;
DROP POLICY IF EXISTS application_docs_read          ON storage.objects;

CREATE POLICY application_docs_tenant_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'application-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY application_docs_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'application-documents'
    AND (
      -- tenant can read their own files
      (storage.foldername(name))[1] = auth.uid()::text
      -- landlord can read docs for their applicants
      OR EXISTS (
        SELECT 1
        FROM public.application_document ad
        JOIN public.application a ON a.id = ad.application_id
        WHERE ad.url = name
          AND a.landlord_id = auth.uid()
      )
    )
  );


-- =====================================================
-- MODULE 3: CONVERSATION + MESSAGE  (singular — matches mobile)
-- chat_module.sql adds indexes/trigger/RLS assuming these tables
-- already exist; this CREATE TABLE IF NOT EXISTS is the safe gate.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversation (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  tenant_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  landlord_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message    text,
  last_message_at timestamptz,
  is_archived     boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (listing_id, tenant_id, landlord_id)
);

CREATE INDEX IF NOT EXISTS conversation_landlord_idx
  ON public.conversation(landlord_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS conversation_tenant_idx
  ON public.conversation(tenant_id, last_message_at DESC NULLS LAST);

-- message uses is_read (not "read") and has type/url/file_name like mobile
CREATE TABLE IF NOT EXISTS public.message (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversation(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','file')),
  content         text,
  url             text,
  file_name       text,
  is_read         boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS message_conversation_created_idx
  ON public.message(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS message_unread_recipient_idx
  ON public.message(conversation_id, is_read)
  WHERE is_read = false;

-- Trigger: keep conversation.last_message + last_message_at in sync
CREATE OR REPLACE FUNCTION public.conversation_touch_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversation
  SET last_message = COALESCE(
        NEW.content,
        CASE NEW.type
          WHEN 'image' THEN '[image]'
          WHEN 'file'  THEN '[file]'
          ELSE ''
        END
      ),
      last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS message_touch_conversation ON public.message;
CREATE TRIGGER message_touch_conversation
  AFTER INSERT ON public.message
  FOR EACH ROW EXECUTE FUNCTION public.conversation_touch_last_message();

ALTER TABLE public.conversation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversation_select_member ON public.conversation;
CREATE POLICY conversation_select_member ON public.conversation
  FOR SELECT USING (auth.uid() = landlord_id OR auth.uid() = tenant_id);

DROP POLICY IF EXISTS conversation_insert_member ON public.conversation;
CREATE POLICY conversation_insert_member ON public.conversation
  FOR INSERT WITH CHECK (auth.uid() = landlord_id OR auth.uid() = tenant_id);

DROP POLICY IF EXISTS conversation_update_member ON public.conversation;
CREATE POLICY conversation_update_member ON public.conversation
  FOR UPDATE
  USING (auth.uid() = landlord_id OR auth.uid() = tenant_id)
  WITH CHECK (auth.uid() = landlord_id OR auth.uid() = tenant_id);

DROP POLICY IF EXISTS message_select_member ON public.message;
CREATE POLICY message_select_member ON public.message
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation c
      WHERE c.id = message.conversation_id
        AND (c.landlord_id = auth.uid() OR c.tenant_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS message_insert_sender ON public.message;
CREATE POLICY message_insert_sender ON public.message
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation c
      WHERE c.id = conversation_id
        AND (c.landlord_id = auth.uid() OR c.tenant_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS message_update_recipient ON public.message;
CREATE POLICY message_update_recipient ON public.message
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation c
      WHERE c.id = message.conversation_id
        AND (c.landlord_id = auth.uid() OR c.tenant_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation c
      WHERE c.id = message.conversation_id
        AND (c.landlord_id = auth.uid() OR c.tenant_id = auth.uid())
    )
  );

-- Enable Realtime (safe: no-op if table already in publication)
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.message;      EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation; EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- =====================================================
-- MODULE 4: CONTRACT + PAYMENT  (matches mobile application_module.sql)
-- contract table uses mobile status + separate signature columns.
-- payment is a separate table (not JSONB) with Stripe fields.
-- Extra display columns are added for the web contract editor.
-- =====================================================

-- Core contract table (mobile schema)
CREATE TABLE IF NOT EXISTS public.contract (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id       uuid REFERENCES public.application(id) ON DELETE CASCADE,
  listing_id           uuid REFERENCES public.listings(id)    ON DELETE CASCADE,
  tenant_id            uuid NOT NULL REFERENCES auth.users(id),
  landlord_id          uuid NOT NULL REFERENCES auth.users(id),
  listing_type         text NOT NULL DEFAULT 'lease'
                         CHECK (listing_type IN ('lease', 'rent')),
  status               text NOT NULL DEFAULT 'awaiting_tenant'
                         CHECK (status IN (
                           'awaiting_tenant','awaiting_landlord',
                           'fully_signed','paid','cancelled'
                         )),
  tenant_signature     text,
  tenant_signed_name   text,
  tenant_signed_at     timestamptz,
  landlord_signature   text,
  landlord_signed_name text,
  landlord_signed_at   timestamptz,
  created_at           timestamptz DEFAULT now(),
  UNIQUE (application_id)
);

-- Extra columns for the web contract editor (safe to add if absent)
ALTER TABLE public.contract
  ADD COLUMN IF NOT EXISTS landlord_name             text,
  ADD COLUMN IF NOT EXISTS landlord_contact          text,
  ADD COLUMN IF NOT EXISTS tenant_name               text,
  ADD COLUMN IF NOT EXISTS tenant_contact            text,
  ADD COLUMN IF NOT EXISTS property_address          text,
  ADD COLUMN IF NOT EXISTS property_type             text,
  ADD COLUMN IF NOT EXISTS entered_on                date,
  ADD COLUMN IF NOT EXISTS start_date                date,
  ADD COLUMN IF NOT EXISTS end_date                  date,
  ADD COLUMN IF NOT EXISTS duration                  text,
  ADD COLUMN IF NOT EXISTS monthly_rent              numeric,
  ADD COLUMN IF NOT EXISTS security_deposit          numeric,
  ADD COLUMN IF NOT EXISTS advance_rent              numeric,
  ADD COLUMN IF NOT EXISTS payment_due_date          int,
  ADD COLUMN IF NOT EXISTS grace_period_days         int,
  ADD COLUMN IF NOT EXISTS payment_method            text,
  ADD COLUMN IF NOT EXISTS account_info              text,
  ADD COLUMN IF NOT EXISTS late_fee                  numeric,
  ADD COLUMN IF NOT EXISTS minor_repairs_threshold   numeric,
  ADD COLUMN IF NOT EXISTS quiet_hours               text,
  ADD COLUMN IF NOT EXISTS overnight_guest_threshold int,
  ADD COLUMN IF NOT EXISTS governing_city            text,
  ADD COLUMN IF NOT EXISTS updated_at                timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS contract_tenant_id_idx   ON public.contract(tenant_id);
CREATE INDEX IF NOT EXISTS contract_landlord_id_idx ON public.contract(landlord_id);

ALTER TABLE public.contract ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contract_select_party ON public.contract;
CREATE POLICY contract_select_party ON public.contract
  FOR SELECT USING (auth.uid() = tenant_id OR auth.uid() = landlord_id);

DROP POLICY IF EXISTS contract_write_party ON public.contract;
CREATE POLICY contract_write_party ON public.contract
  FOR ALL
  USING (auth.uid() = tenant_id OR auth.uid() = landlord_id)
  WITH CHECK (auth.uid() = tenant_id OR auth.uid() = landlord_id);

-- Payment table (separate, with Stripe fields — matches mobile)
CREATE TABLE IF NOT EXISTS public.payment (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id              uuid NOT NULL REFERENCES public.contract(id) ON DELETE CASCADE,
  stripe_payment_intent_id text NOT NULL,
  amount_cents             integer NOT NULL CHECK (amount_cents > 0),
  currency                 text NOT NULL DEFAULT 'php',
  status                   text NOT NULL DEFAULT 'succeeded'
                             CHECK (status IN ('succeeded','pending','failed','refunded')),
  paid_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stripe_payment_intent_id)
);

-- Extra columns for web payment display
ALTER TABLE public.payment
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS last4  text,
  ADD COLUMN IF NOT EXISTS name   text;

CREATE INDEX IF NOT EXISTS payment_contract_id_idx ON public.payment(contract_id);

ALTER TABLE public.payment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_select_party ON public.payment;
CREATE POLICY payment_select_party ON public.payment
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contract c
      WHERE c.id = payment.contract_id
        AND (auth.uid() = c.tenant_id OR auth.uid() = c.landlord_id)
    )
  );

DROP POLICY IF EXISTS payment_insert_party ON public.payment;
CREATE POLICY payment_insert_party ON public.payment
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contract c
      WHERE c.id = payment.contract_id
        AND (auth.uid() = c.tenant_id OR auth.uid() = c.landlord_id)
    )
  );

-- Storage bucket for listing contract template files
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-contracts', 'listing-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Owner-folder RLS for listing-contracts (mirrors `verifications` bucket).
-- Files are uploaded to `${auth.uid()}/...`; only that uid can read/write.
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

-- Allow tenants under a contract on this listing to read the landlord's
-- uploaded contract template file (so ContractView can fetch it).
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


-- =====================================================
-- PROFILES: columns from mobile migrations
-- (profiles_role_backfill.sql + verification_module.sql)
-- =====================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_landlord               boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_verified               boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_id_url       text,
  ADD COLUMN IF NOT EXISTS verification_selfie_url   text,
  ADD COLUMN IF NOT EXISTS verification_submitted_at timestamptz;

-- Backfill: anyone who owns a listing is a landlord
UPDATE public.profiles
SET is_landlord = true
WHERE id IN (
  SELECT DISTINCT landlord_id FROM public.listings WHERE landlord_id IS NOT NULL
) AND is_landlord = false;

-- Grandfather existing profiles as verified
UPDATE public.profiles SET is_verified = true WHERE is_verified = false;

-- Profiles RLS — cross-party reads for contract screens and chat
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_landlord_tenants       ON public.profiles;
DROP POLICY IF EXISTS profiles_select_tenant_landlords       ON public.profiles;
DROP POLICY IF EXISTS profiles_select_contract_counterparty  ON public.profiles;

CREATE POLICY profiles_select_landlord_tenants ON public.profiles
  FOR SELECT TO authenticated
  USING (id IN (SELECT tenant_id FROM public.contract WHERE landlord_id = auth.uid()));

CREATE POLICY profiles_select_tenant_landlords ON public.profiles
  FOR SELECT TO authenticated
  USING (id IN (SELECT landlord_id FROM public.contract WHERE tenant_id = auth.uid()));

CREATE POLICY profiles_select_contract_counterparty ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT landlord_id FROM public.contract WHERE tenant_id  = auth.uid())
    OR id IN (SELECT tenant_id  FROM public.contract WHERE landlord_id = auth.uid())
  );


-- =====================================================
-- LISTINGS: columns from mobile migrations
-- (application_module.sql + listing_contract_module.sql +
--  verification_module.sql)
-- =====================================================
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS listing_type              text NOT NULL DEFAULT 'lease'
                             CHECK (listing_type IN ('lease','rent')),
  ADD COLUMN IF NOT EXISTS contract_template_url     text,
  ADD COLUMN IF NOT EXISTS contract_template_name    text,
  ADD COLUMN IF NOT EXISTS terms_override            jsonb,
  ADD COLUMN IF NOT EXISTS is_verified               boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_doc_url      text,
  ADD COLUMN IF NOT EXISTS verification_submitted_at timestamptz;

-- Grandfather existing listings as verified
UPDATE public.listings SET is_verified = true WHERE is_verified = false;

-- Verifications storage bucket (from verification_module.sql)
INSERT INTO storage.buckets (id, name, public)
VALUES ('verifications', 'verifications', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS verifications_owner_insert ON storage.objects;
CREATE POLICY verifications_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verifications'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS verifications_owner_select ON storage.objects;
CREATE POLICY verifications_owner_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verifications'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- Conversations enriched with profile names (singular: conversation_with_profiles)
CREATE OR REPLACE VIEW public.conversation_with_profiles AS
SELECT
  c.*,
  tp.full_name  AS tenant_name,
  tp.avatar_url AS tenant_avatar,
  lp.full_name  AS landlord_name,
  lp.avatar_url AS landlord_avatar,
  l.title       AS listing_title
FROM public.conversation c
LEFT JOIN public.profiles tp ON tp.id = c.tenant_id
LEFT JOIN public.profiles lp ON lp.id = c.landlord_id
LEFT JOIN public.listings  l  ON l.id  = c.listing_id;

ALTER VIEW public.conversation_with_profiles SET (security_invoker = true);

-- Contracts with payment details joined
CREATE OR REPLACE VIEW public.contract_with_details AS
SELECT
  ct.*,
  a.status       AS application_status,
  l.title        AS listing_title,
  p.paid_at,
  p.amount_cents,
  p.method       AS payment_method_label,
  p.status       AS payment_status,
  p.stripe_payment_intent_id,
  p.last4,
  p.name         AS payer_name
FROM public.contract ct
LEFT JOIN public.application a ON a.id  = ct.application_id
LEFT JOIN public.listings     l ON l.id  = ct.listing_id
LEFT JOIN public.payment      p ON p.contract_id = ct.id;

ALTER VIEW public.contract_with_details SET (security_invoker = true);


-- =====================================================
-- LISTING_POLICIES: subletting + modifications  (mobile parity)
-- The mobile manage_listing.dart writes these two boolean flags;
-- add idempotently so the web HouseEnlistment Subletting/Modifications
-- radios persist into the same columns.
-- =====================================================
ALTER TABLE IF EXISTS public.listing_policies
  ADD COLUMN IF NOT EXISTS subletting_allowed   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modification_allowed boolean NOT NULL DEFAULT false;
