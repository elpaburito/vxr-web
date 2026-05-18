-- =============================================================
-- Auto-create a public.profiles row whenever a new auth.users row
-- is inserted. Without this, users created via the Supabase Auth
-- admin panel (or any path that bypasses the web signUp() upsert)
-- have no profile row, so subsequent UPDATEs from the Profile page
-- match zero rows and silently no-op.
--
-- Idempotent. Paste into Supabase SQL Editor.
-- =============================================================


-- 1. Trigger function. SECURITY DEFINER so the insert bypasses the
--    profiles RLS (there is no self-INSERT policy by design). The
--    function is owned by a privileged role (postgres) at creation,
--    which is what allows the insert to land.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'tenant')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


-- 2. Trigger on auth.users. AFTER INSERT so we have the final row
--    state; FOR EACH ROW so admin bulk-creates still work.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. Backfill: any existing auth.users without a profile row gets
--    one now. Safe to re-run — the LEFT JOIN filter keeps it a no-op
--    once everyone has a row.
INSERT INTO public.profiles (id, email, full_name, phone, role)
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name',
  COALESCE(u.phone, u.raw_user_meta_data->>'phone'),
  COALESCE(u.raw_user_meta_data->>'role', 'tenant')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
