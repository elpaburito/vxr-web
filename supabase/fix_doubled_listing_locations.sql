-- One-off backfill: strip the duplicated ", {barangay}, {city}, {province}"
-- suffix that the old listingsService.js write path appended to
-- listing_locations.full_address. Run once in the Supabase SQL editor.
--
-- Before the fix, writeSatelliteTables stored:
--   full_address = [address, barangay, city, province].join(", ")
-- where `address` was Google's formatted_address (already complete), so the
-- structured parts were appended a second time.
--
-- This query only updates rows whose full_address ends with the exact
-- ", barangay, city, province" suffix (case-insensitive, tolerant of
-- extra whitespace around the commas). Rows without that suffix are left
-- untouched.

-- Preview the rows that will be changed:
select
  listing_id,
  full_address                                       as before_value,
  trim(both ', ' from
    regexp_replace(
      full_address,
      ',\s*' || barangay || ',\s*' || city || ',\s*' || province || '\s*$',
      '',
      'i'
    )
  )                                                  as after_value,
  barangay,
  city,
  province
from public.listing_locations
where barangay is not null
  and city     is not null
  and province is not null
  and full_address ~* (',\s*' || barangay || ',\s*' || city || ',\s*' || province || '\s*$');

-- Apply the cleanup (uncomment to run after reviewing the preview above):
-- update public.listing_locations
-- set full_address = trim(both ', ' from
--   regexp_replace(
--     full_address,
--     ',\s*' || barangay || ',\s*' || city || ',\s*' || province || '\s*$',
--     '',
--     'i'
--   )
-- )
-- where barangay is not null
--   and city     is not null
--   and province is not null
--   and full_address ~* (',\s*' || barangay || ',\s*' || city || ',\s*' || province || '\s*$');
