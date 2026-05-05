-- supabase/listings_rented_status.sql
--
-- One-shot backfill + ongoing trigger so a listing is hidden from the
-- public browse the moment one of its contracts becomes paid, and
-- re-surfaces if that contract is cancelled.
--
-- The web client also flips listings.status in the record-payment and
-- stripe-webhook Edge Functions, so this trigger is belt-and-suspenders:
-- it covers mobile-side payments, manual SQL writes, and any future
-- code path that doesn't go through the Edge Functions.
--
-- The existing "anyone can view active listings" RLS policy
-- (using status = 'active') and listingsService.fetchListings's
-- .eq("status", "active") filter both do the actual hiding.

-- 1. Backfill — listings with at least one paid contract
update public.listings l
set    status = 'rented',
       updated_at = now()
where  status = 'active'
  and  exists (
        select 1 from public.contract c
        where  c.listing_id = l.id
          and  c.status     = 'paid'
       );

-- 2. Trigger function: keep listings.status in sync with the contract
create or replace function public.sync_listing_status_from_contract()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Contract just went paid → take the listing off the market
  if (tg_op = 'INSERT' and new.status = 'paid')
     or (tg_op = 'UPDATE' and new.status = 'paid' and (old.status is distinct from 'paid'))
  then
    update public.listings
       set status = 'rented', updated_at = now()
     where id = new.listing_id
       and status <> 'rented';
  end if;

  -- Contract was paid and is now cancelled → put the listing back
  -- (only if no other paid contract exists for this listing)
  if tg_op = 'UPDATE'
     and old.status = 'paid'
     and new.status = 'cancelled'
  then
    update public.listings
       set status = 'active', updated_at = now()
     where id = new.listing_id
       and status = 'rented'
       and not exists (
         select 1 from public.contract c2
         where  c2.listing_id = new.listing_id
           and  c2.status     = 'paid'
           and  c2.id        <> new.id
       );
  end if;

  return new;
end;
$$;

-- 3. Trigger
drop trigger if exists trg_sync_listing_status_from_contract on public.contract;
create trigger trg_sync_listing_status_from_contract
after insert or update of status on public.contract
for each row
execute function public.sync_listing_status_from_contract();
