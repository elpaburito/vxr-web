-- =============================================================
-- ViewxRent — Admin Audit Log module
-- Records every admin-initiated mutation on key tables so we can
-- answer "who changed what, when, and why".
--
-- Paste into Supabase SQL Editor. Idempotent.
-- Depends on admin_module.sql (uses public.is_admin()).
-- =============================================================


-- =====================================================
-- 1. admin_audit_log table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id           bigserial PRIMARY KEY,
  actor_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email  text,
  action       text NOT NULL,
  entity_type  text NOT NULL,
  entity_id    text,
  before       jsonb,
  after        jsonb,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
  ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx
  ON public.admin_audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_entity_idx
  ON public.admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx
  ON public.admin_audit_log(action);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- 2. RLS — only admins can read; nobody writes directly
--    (all writes happen via SECURITY DEFINER functions below)
-- =====================================================
DROP POLICY IF EXISTS admin_audit_log_admin_read ON public.admin_audit_log;
CREATE POLICY admin_audit_log_admin_read ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- No INSERT/UPDATE/DELETE policy on purpose. The trigger function and
-- the log_admin_action() RPC are SECURITY DEFINER, so they bypass RLS.


-- =====================================================
-- 3. Generic AFTER trigger function
--    Fires on every row change but only logs when the caller is admin.
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id    uuid := auth.uid();
  v_is_admin    boolean;
  v_actor_email text;
  v_action      text;
  v_entity_id   text;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT (p.role = 'admin'), p.email
    INTO v_is_admin, v_actor_email
    FROM public.profiles p
   WHERE p.id = v_actor_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Default action label: "<table>.<op>" (e.g. "listings.update")
  v_action := TG_TABLE_NAME || '.' || lower(TG_OP);

  -- Specialize action labels for high-value field changes
  IF TG_TABLE_NAME = 'profiles' AND TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      v_action := 'profiles.role_change';
    ELSIF OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
      v_action := CASE WHEN NEW.is_verified THEN 'profiles.verify' ELSE 'profiles.unverify' END;
    ELSIF (to_jsonb(OLD) ? 'is_suspended')
       AND (to_jsonb(NEW) ? 'is_suspended')
       AND ((to_jsonb(OLD)->>'is_suspended')::boolean
            IS DISTINCT FROM (to_jsonb(NEW)->>'is_suspended')::boolean) THEN
      v_action := CASE WHEN (to_jsonb(NEW)->>'is_suspended')::boolean
                       THEN 'profiles.suspend' ELSE 'profiles.unsuspend' END;
    END IF;
  ELSIF TG_TABLE_NAME = 'listings' AND TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := 'listings.status_change';
    ELSIF OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
      v_action := CASE WHEN NEW.is_verified THEN 'listings.verify' ELSE 'listings.unverify' END;
    END IF;
  ELSIF TG_TABLE_NAME = 'application' AND TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := 'application.' || NEW.status;  -- e.g. application.approved
    END IF;
  ELSIF TG_TABLE_NAME = 'verifications' AND TG_OP = 'UPDATE' THEN
    IF OLD.decision IS DISTINCT FROM NEW.decision THEN
      v_action := 'verifications.' || NEW.decision;
    END IF;
  ELSIF TG_TABLE_NAME = 'contract' AND TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := 'contract.status_change';
    END IF;
  END IF;

  -- entity_id: cast NEW.id or OLD.id to text (works for uuid and bigint)
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_entity_id := (to_jsonb(OLD)->>'id');
    ELSE
      v_entity_id := (to_jsonb(NEW)->>'id');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_entity_id := NULL;
  END;

  INSERT INTO public.admin_audit_log(
    actor_id, actor_email, action, entity_type, entity_id, before, after
  ) VALUES (
    v_actor_id,
    v_actor_email,
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


-- =====================================================
-- 4. Attach triggers to tables we care about
--    Wrapped in DO blocks so missing tables don't break the script.
-- =====================================================
DO $$
DECLARE
  t  text;
  op text;
  -- table_name, ops (space-separated)
  rows text[][] := ARRAY[
    ARRAY['profiles',          'UPDATE DELETE'],
    ARRAY['listings',          'UPDATE DELETE'],
    ARRAY['application',       'UPDATE'],
    ARRAY['contract',          'UPDATE'],
    ARRAY['verifications',     'UPDATE'],
    ARRAY['cms_page',          'INSERT UPDATE DELETE'],
    ARRAY['cms_announcement',  'INSERT UPDATE DELETE'],
    ARRAY['cms_faq',           'INSERT UPDATE DELETE']
  ];
  pair text[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY rows LOOP
    t := pair[1];
    -- Skip if table doesn't exist yet
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = t
    ) THEN CONTINUE; END IF;

    EXECUTE format('DROP TRIGGER IF EXISTS %I_audit ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_audit AFTER %s ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.admin_audit_trigger()',
      t,
      replace(pair[2], ' ', ' OR '),
      t
    );
  END LOOP;
END $$;


-- =====================================================
-- 5. Manual log RPC — admins call this from the client to record
--    custom events (e.g. "viewed payment X for refund review") or
--    to attach a free-text reason to an action.
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action      text,
  p_entity_type text,
  p_entity_id   text DEFAULT NULL,
  p_reason      text DEFAULT NULL,
  p_metadata    jsonb DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id    uuid := auth.uid();
  v_is_admin    boolean;
  v_actor_email text;
  v_id          bigint;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'log_admin_action: not authenticated';
  END IF;

  SELECT (role = 'admin'), email
    INTO v_is_admin, v_actor_email
    FROM public.profiles WHERE id = v_actor_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'log_admin_action: caller is not admin';
  END IF;

  INSERT INTO public.admin_audit_log(
    actor_id, actor_email, action, entity_type, entity_id, reason, after
  ) VALUES (
    v_actor_id, v_actor_email, p_action, p_entity_type, p_entity_id, p_reason, p_metadata
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action(text, text, text, text, jsonb) TO authenticated;
