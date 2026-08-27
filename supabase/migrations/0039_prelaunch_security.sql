-- Pre-launch security: lock privilege columns, close RLS gaps.
-- Does NOT delete users, listings, or county/CAD truth data.

-- 1) account_kind / TREC fields cannot be changed by the client.
create or replace function public.profiles_lock_privilege_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.account_kind is distinct from old.account_kind then
      raise exception 'account_kind cannot be changed by the client';
    end if;
    if new.trec_status is distinct from old.trec_status then
      raise exception 'trec_status cannot be changed by the client';
    end if;
    if new.trec_license is distinct from old.trec_license then
      raise exception 'trec_license cannot be changed by the client';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_privilege_columns on public.profiles;
create trigger profiles_lock_privilege_columns
  before update on public.profiles
  for each row
  execute function public.profiles_lock_privilege_columns();

-- 2) Tables that inherited table grants but never got RLS.
alter table if exists public.boost_county_slot_overrides enable row level security;
alter table if exists public.clerk_deed_transfers enable row level security;
alter table if exists public.clerk_county_coverage enable row level security;

-- No client policies: service_role (ingest / SHI server clients) still bypasses RLS.

-- 3) Analytics events: only the listing's agent (or a broker) may insert.
drop policy if exists listing_analytics_events_insert on public.listing_analytics_events;
create policy listing_analytics_events_insert
  on public.listing_analytics_events
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.agent_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.account_kind = 'broker'
    )
  );

-- 4) Column-only REVOKE is not enough against table-level GRANT SELECT.
-- Follow with 0040_listings_hide_seller_passcode.sql.
