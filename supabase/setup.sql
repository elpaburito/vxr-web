-- =============================================================
-- ViewxRent: one-shot schema + policy setup (aligned to listings_full view)
-- Paste this entire file into the Supabase SQL Editor and run once.
-- Idempotent: safe to re-run.
-- =============================================================


-- 1. Fix the listing_image foreign key (currently points at listings_old)
-- -------------------------------------------------------------
alter table public.listing_image
  drop constraint if exists listing_image_listing_id_fkey;

alter table public.listing_image
  add constraint listing_image_listing_id_fkey
    foreign key (listing_id) references public.listings(id) on delete cascade;


-- 2. Make sure listings_full view respects the caller's RLS
-- -------------------------------------------------------------
-- (Postgres 15+). Safe if already set.
alter view public.listings_full set (security_invoker = true);


-- 3. Row-level security on core tables
-- -------------------------------------------------------------
alter table public.listings                   enable row level security;
alter table public.listing_image             enable row level security;
alter table public.listing_locations          enable row level security;
alter table public.listing_details            enable row level security;
alter table public.listing_amenities          enable row level security;
alter table public.listing_utilities          enable row level security;
alter table public.listing_building_features  enable row level security;
alter table public.listing_financials         enable row level security;
alter table public.listing_availability       enable row level security;
alter table public.listing_policies           enable row level security;
alter table public.listing_requirements       enable row level security;
alter table public.listing_host_info          enable row level security;

-- Drop + recreate so this block is idempotent
drop policy if exists "anyone can view active listings"               on public.listings;
drop policy if exists "landlords can view their own listings"         on public.listings;
drop policy if exists "landlords can insert their listings"           on public.listings;
drop policy if exists "landlords can update their listings"           on public.listings;
drop policy if exists "landlords can delete their listings"           on public.listings;

drop policy if exists "anyone can view images of active listings"     on public.listing_image;
drop policy if exists "landlords manage their listing images"         on public.listing_image;

-- listings
create policy "anyone can view active listings"
  on public.listings for select
  using (status = 'active');

create policy "landlords can view their own listings"
  on public.listings for select
  to authenticated
  using (landlord_id = auth.uid());

create policy "landlords can insert their listings"
  on public.listings for insert
  to authenticated
  with check (landlord_id = auth.uid());

create policy "landlords can update their listings"
  on public.listings for update
  to authenticated
  using (landlord_id = auth.uid());

create policy "landlords can delete their listings"
  on public.listings for delete
  to authenticated
  using (landlord_id = auth.uid());

-- listing_image
create policy "anyone can view images of active listings"
  on public.listing_image for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_image.listing_id
        and l.status = 'active'
    )
  );

create policy "landlords manage their listing images"
  on public.listing_image for all
  to authenticated
  using (
    exists (select 1 from public.listings l
            where l.id = listing_image.listing_id and l.landlord_id = auth.uid())
  )
  with check (
    exists (select 1 from public.listings l
            where l.id = listing_image.listing_id and l.landlord_id = auth.uid())
  );


-- 4. RLS for every satellite table (same pattern: anyone reads active, owner writes)
-- -------------------------------------------------------------
-- Helper: wrap the pattern in a DO block so we can loop over table names
do $$
declare
  t text;
  satellite_tables text[] := array[
    'listing_locations',
    'listing_details',
    'listing_amenities',
    'listing_utilities',
    'listing_building_features',
    'listing_financials',
    'listing_availability',
    'listing_policies',
    'listing_requirements',
    'listing_host_info'
  ];
begin
  foreach t in array satellite_tables loop
    execute format('drop policy if exists "public read %1$s" on public.%1$I', t);
    execute format('drop policy if exists "owner manage %1$s" on public.%1$I', t);

    execute format($p$
      create policy "public read %1$s"
        on public.%1$I for select
        using (
          exists (
            select 1 from public.listings l
            where l.id = %1$I.listing_id and (l.status = 'active' or l.landlord_id = auth.uid())
          )
        )
    $p$, t);

    execute format($p$
      create policy "owner manage %1$s"
        on public.%1$I for all
        to authenticated
        using (
          exists (select 1 from public.listings l
                  where l.id = %1$I.listing_id and l.landlord_id = auth.uid())
        )
        with check (
          exists (select 1 from public.listings l
                  where l.id = %1$I.listing_id and l.landlord_id = auth.uid())
        )
    $p$, t);
  end loop;
end $$;


-- 5. Storage bucket + policies for listing-images
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can view listing images"               on storage.objects;
drop policy if exists "Users can upload listing images to own folder" on storage.objects;
drop policy if exists "Users can delete own listing images"          on storage.objects;

create policy "Public can view listing images"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "Users can upload listing images to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own listing images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
