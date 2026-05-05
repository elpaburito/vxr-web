-- ===========================================================================
-- application table: ensure `created_at` exists.
-- The schema in modules.sql declares this column with DEFAULT now(), but
-- older live databases were created before that line and the column is
-- missing — applicationsService.js queries break with:
--   "column application.created_at does not exist"
--
-- Safe to re-run.
-- ===========================================================================

ALTER TABLE public.application
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Backfill any legacy rows that already had submitted_at but never got
-- a created_at (DEFAULT only fills new rows; this catches the gap).
UPDATE public.application
SET created_at = COALESCE(submitted_at, now())
WHERE created_at IS NULL;

-- Helpful index for the landlord/tenant timelines that ORDER BY created_at.
CREATE INDEX IF NOT EXISTS application_created_at_idx
  ON public.application(created_at DESC);
