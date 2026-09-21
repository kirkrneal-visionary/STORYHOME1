-- P2B3A: server-authoritative listing local-place binding.
-- Inherit verified primary parcel.local_place_id only. City text is not authority.
-- Replaces P2B1B bind/sync so County and place stay on one path.
-- Safe after 0079 before parcel backfill. Production listings are 0.
-- Do not apply hosted independently of the P2 chain.

alter table public.listings
  add column local_place_id uuid
  references public.local_places (id)
  on delete restrict
  on update restrict;

comment on column public.listings.local_place_id is
  'Canonical listing local place. Inherited from verified primary county_parcels.local_place_id. Server-computed. NULL if unmatched.';

create index listings_local_place_id_idx
  on public.listings (local_place_id);

create or replace function public.listing_resolve_local_place_id(p_listing uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  n int;
  place uuid;
begin
  if p_listing is null then return null; end if;
  select count(*), min(p.local_place_id) into n, place
  from public.listing_parcels lp
  join public.county_parcels p
    on p.source = lp.source
   and p.prop_id = lp.prop_id
  where lp.listing_id = p_listing
    and lp.is_primary;
  if n = 1 then return place; end if;
  return null;
end
$$;

create or replace function public.listings_bind_county_fips()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.county_fips := public.listing_resolve_county_fips(new.id, new.county_name);
  new.local_place_id := public.listing_resolve_local_place_id(new.id);
  return new;
end
$$;

drop trigger if exists trg_listings_bind_county on public.listings;
create trigger trg_listings_bind_county
before insert or update of county_name, county_fips, local_place_id
on public.listings
for each row execute function public.listings_bind_county_fips();

create or replace function public.sync_listing_primary_parcel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_listing uuid := coalesce(new.listing_id, old.listing_id);
  v_prop text;
  v_lat double precision;
  v_lng double precision;
  v_acres numeric;
  v_name text;
begin
  select lp.prop_id
    into v_prop
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

  select l.county_name into v_name from public.listings l where l.id = v_listing;

  if v_prop is not null then
    select centroid_lat, centroid_lng
      into v_lat, v_lng
    from public.county_parcels
    where prop_id = v_prop
    limit 1;

    update public.listings
       set cad_prop_id = v_prop,
           county_fips = public.listing_resolve_county_fips(v_listing, v_name),
           local_place_id = public.listing_resolve_local_place_id(v_listing),
           lat = coalesce(v_lat, lat),
           lng = coalesce(v_lng, lng),
           acres = case when v_acres > 0 then v_acres else acres end
     where id = v_listing;
  else
    update public.listings
       set cad_prop_id = null,
           county_fips = public.listing_resolve_county_fips(v_listing, v_name),
           local_place_id = public.listing_resolve_local_place_id(v_listing)
     where id = v_listing;
  end if;

  return null;
end
$$;

create or replace function public.listings_recompute_local_place()
returns table (total int, changed int)
language plpgsql
as $$
begin
  return query
  with src as (
    select l.id, public.listing_resolve_local_place_id(l.id) as new_id
    from public.listings l
  ),
  upd as (
    update public.listings l
    set local_place_id = s.new_id
    from src s
    where l.id = s.id
      and l.local_place_id is distinct from s.new_id
    returning 1
  )
  select count(*)::int, (select count(*) from upd)::int
  from src;
end
$$;

revoke all on function public.listing_resolve_local_place_id(uuid) from public, anon, authenticated;
revoke all on function public.listings_recompute_local_place() from public, anon, authenticated;
grant execute on function public.listing_resolve_local_place_id(uuid) to service_role;
grant execute on function public.listings_recompute_local_place() to service_role;

comment on function public.listing_resolve_local_place_id(uuid) is
  'Listing local-place authority: verified primary warehouse parcel membership, else NULL. Not city text.';
