-- =============================================================
-- Backfill: synthesize listing_image rows from storage objects.
--
-- Why: Mobile-app-created listings sometimes set listings.cover_photo_url
-- but never insert rows into public.listing_image. As a result the web
-- detail page shows the cover but no gallery / thumbnails / lightbox
-- (gating is `images.length > 1`). This script scans the
-- 'listing-images' storage bucket for every file in the same folder
-- as a listing's cover_photo_url and inserts the missing rows.
--
-- Idempotent: only touches listings whose listing_image table is empty.
-- Safe to re-run.
--
-- Run from Supabase SQL Editor (service-role context).
-- =============================================================

-- 1) Preview — what will be inserted? Run this first, eyeball results.
WITH listings_to_backfill AS (
  SELECT
    l.id          AS listing_id,
    l.landlord_id,
    l.cover_photo_url,
    regexp_replace(
      substring(l.cover_photo_url FROM '/listing-images/(.+)$'),
      '/[^/]+$', ''
    ) AS folder,
    substring(l.cover_photo_url FROM '^(.+/listing-images)/') AS url_prefix
  FROM public.listings l
  WHERE l.cover_photo_url IS NOT NULL
    AND l.cover_photo_url LIKE '%/listing-images/%'
    AND NOT EXISTS (
      SELECT 1 FROM public.listing_image li WHERE li.listing_id = l.id
    )
)
SELECT
  b.listing_id,
  b.folder,
  o.name AS object_path,
  (b.url_prefix || '/' || o.name) = b.cover_photo_url AS will_be_cover,
  o.created_at
FROM listings_to_backfill b
JOIN storage.objects o
  ON o.bucket_id = 'listing-images'
 AND o.name LIKE b.folder || '/%'
ORDER BY b.listing_id, o.created_at;


-- 2) Apply — uncomment the block below once the preview looks right.
/*
WITH listings_to_backfill AS (
  SELECT
    l.id          AS listing_id,
    l.landlord_id,
    l.cover_photo_url,
    regexp_replace(
      substring(l.cover_photo_url FROM '/listing-images/(.+)$'),
      '/[^/]+$', ''
    ) AS folder,
    substring(l.cover_photo_url FROM '^(.+/listing-images)/') AS url_prefix
  FROM public.listings l
  WHERE l.cover_photo_url IS NOT NULL
    AND l.cover_photo_url LIKE '%/listing-images/%'
    AND NOT EXISTS (
      SELECT 1 FROM public.listing_image li WHERE li.listing_id = l.id
    )
),
storage_files AS (
  SELECT
    b.listing_id,
    b.landlord_id,
    b.cover_photo_url,
    b.url_prefix,
    o.name        AS object_path,
    o.created_at  AS object_created_at,
    row_number() OVER (
      PARTITION BY b.listing_id
      ORDER BY (b.url_prefix || '/' || o.name) = b.cover_photo_url DESC,
               o.created_at
    ) - 1 AS sort_order
  FROM listings_to_backfill b
  JOIN storage.objects o
    ON o.bucket_id = 'listing-images'
   AND o.name LIKE b.folder || '/%'
)
INSERT INTO public.listing_image (
  listing_id, url, type, upload_source, sort_order, is_cover, uploaded_by
)
SELECT
  s.listing_id,
  s.url_prefix || '/' || s.object_path                       AS url,
  'normal'                                                    AS type,
  'mobile_backfill'                                           AS upload_source,
  s.sort_order,
  (s.url_prefix || '/' || s.object_path) = s.cover_photo_url  AS is_cover,
  s.landlord_id                                               AS uploaded_by
FROM storage_files s;
*/


-- 3) Verify — image counts per listing after the backfill.
SELECT
  l.id,
  l.title,
  count(li.id) AS image_count,
  l.cover_photo_url IS NOT NULL AS has_cover_url
FROM public.listings l
LEFT JOIN public.listing_image li ON li.listing_id = l.id
GROUP BY l.id, l.title, l.cover_photo_url
ORDER BY image_count, l.created_at DESC;
