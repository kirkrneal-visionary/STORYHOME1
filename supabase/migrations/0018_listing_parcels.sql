-- ---------------------------------------------------------------------------
-- Wave L3 — Multi-parcel listings (a property can span several CAD tracts)
--
-- In Texas a single property often spans multiple parcel IDs (lots bought at
-- different times / parent-child accounts). This links one listing to many
-- county parcels, marks one primary (drives the map pin + address), and
-- aggregates land/values/legal across all tracts for MLS auto-fill.
-- ---------------------------------------------------------------------------

create table if not exists public.listing_parcels (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  source text not null,
  prop_id text not null,
  county_fips text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (listing_id, source, prop_id)
);
create index if not exists listing_parcels_listing_idx
  on public.listing_parcels (listing_id);

alter table public.listing_parcels enable row level security;

drop policy if exists listing_parcels_read on public.listing_parcels;
create policy listing_parcels_read on public.listing_parcels
  for select to anon, authenticated using (true);

drop policy if exists listing_parcels_write on public.listing_parcels;
create policy listing_parcels_write on public.listing_parcels
  for all to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.agent_id = auth.uid() or public.is_broker_of(l.brokerage_id, auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.agent_id = auth.uid() or public.is_broker_of(l.brokerage_id, auth.uid()))
    )
  );

grant select on public.listing_parcels to anon, authenticated;
grant all on public.listing_parcels to authenticated, service_role;

-- Keep the listing's primary link + coordinates + total acreage in sync with
-- its tracts. Primary = the is_primary row, else the earliest-added.
create or replace function public.sync_listing_primary_parcel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_listing uuid := coalesce(new.listing_id, old.listing_id);
  v_prop text;
  v_fips text;
  v_lat double precision;
  v_lng double precision;
  v_acres numeric;
begin
  select lp.prop_id, lp.county_fips
    into v_prop, v_fips
  from public.listing_parcels lp
  where lp.listing_id = v_listing
  order by lp.is_primary desc, lp.created_at asc
  limit 1;

  select coalesce(sum(p.legal_acreage), 0)
    into v_acres
  from public.listing_parcels lp
  join public.county_parcels p
    on p.prop_id = lp.prop_id
   and (lp.county_fips is null or p.county_fips = lp.county_fips)
  where lp.listing_id = v_listing;

  if v_prop is not null then
    select centroid_lat, centroid_lng
      into v_lat, v_lng
    from public.county_parcels
    where prop_id = v_prop
      and (v_fips is null or county_fips = v_fips)
    limit 1;

    update public.listings
       set cad_prop_id = v_prop,
           county_fips = coalesce(v_fips, county_fips),
           lat = coalesce(v_lat, lat),
           lng = coalesce(v_lng, lng),
           acres = case when v_acres > 0 then v_acres else acres end
     where id = v_listing;
  else
    update public.listings set cad_prop_id = null where id = v_listing;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_sync_listing_parcel on public.listing_parcels;
create trigger trg_sync_listing_parcel
  after insert or update or delete on public.listing_parcels
  for each row execute function public.sync_listing_primary_parcel();

-- Aggregated facts across a listing's tracts (for MLS detail + display).
create or replace function public.listing_parcel_facts(p_listing uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'tract_count', count(*),
    'total_acres', coalesce(sum(p.legal_acreage), 0),
    'improved_count', count(*) filter (where coalesce(p.improvement_value, 0) > 0),
    'land_only_count', count(*) filter (where coalesce(p.improvement_value, 0) = 0),
    'land_value', coalesce(sum(p.land_value), 0),
    'improvement_value', coalesce(sum(p.improvement_value), 0),
    'market_value', coalesce(sum(p.market_value), 0),
    'legal_combined', string_agg(nullif(p.legal_description, ''), ' + ' order by lp.is_primary desc),
    'prop_ids', jsonb_agg(lp.prop_id order by lp.is_primary desc)
  )
  from public.listing_parcels lp
  join public.county_parcels p
    on p.prop_id = lp.prop_id
   and (lp.county_fips is null or p.county_fips = lp.county_fips)
  where lp.listing_id = p_listing;
$$;
grant execute on function public.listing_parcel_facts(uuid) to anon, authenticated;
