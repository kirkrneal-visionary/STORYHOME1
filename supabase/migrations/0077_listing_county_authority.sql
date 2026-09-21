-- P2B1B: server-authoritative listing County binding.
-- Canonical field is listings.county_fips (5-digit Texas FIPS).
-- NULL is valid. Display county_name is not identity.
-- Client/PostgREST county_fips is ignored. No local-place binding.

create function public.normalize_tx_county_name(p_name text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      regexp_replace(lower(trim(coalesce(p_name, ''))), '\s+county$', ''),
      '\s+', ' ', 'g'
    ),
    ''
  );
$$;

create function public.tx_county_fips_from_name(p_name text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  n int;
  fips text;
  key text := public.normalize_tx_county_name(p_name);
begin
  if key is null then return null; end if;
  select count(*), min(t.county_fips) into n, fips
  from public.tx_counties t
  where public.normalize_tx_county_name(t.canonical_name) = key;
  if n = 1 then return fips; end if;
  return null;
end;
$$;

create function public.listing_resolve_county_fips(p_listing uuid, p_county_name text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  n int;
  fips text;
begin
  if p_listing is not null then
    select count(*), min(p.county_fips) into n, fips
    from public.listing_parcels lp
    join public.county_parcels p
      on p.source = lp.source
     and p.prop_id = lp.prop_id
    where lp.listing_id = p_listing
      and lp.is_primary;
    if n = 1 and exists (
      select 1 from public.tx_counties t where t.county_fips = fips
    ) then
      return fips;
    end if;
  end if;
  return public.tx_county_fips_from_name(p_county_name);
end;
$$;

create function public.listings_bind_county_fips()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.county_fips := public.listing_resolve_county_fips(new.id, new.county_name);
  return new;
end;
$$;

drop trigger if exists trg_listings_bind_county on public.listings;
create trigger trg_listings_bind_county
before insert or update of county_name, county_fips
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
           lat = coalesce(v_lat, lat),
           lng = coalesce(v_lng, lng),
           acres = case when v_acres > 0 then v_acres else acres end
     where id = v_listing;
  else
    update public.listings
       set cad_prop_id = null,
           county_fips = public.listing_resolve_county_fips(v_listing, v_name)
     where id = v_listing;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_sync_listing_parcel on public.listing_parcels;
create trigger trg_sync_listing_parcel
  after insert or update or delete on public.listing_parcels
  for each row execute function public.sync_listing_primary_parcel();

create unique index if not exists listing_parcels_one_primary
  on public.listing_parcels (listing_id)
  where is_primary;

alter table public.listings
  drop constraint if exists listings_county_fips_tx_counties_fk;
alter table public.listings
  add constraint listings_county_fips_tx_counties_fk
  foreign key (county_fips) references public.tx_counties (county_fips);

revoke all on function public.normalize_tx_county_name(text) from public, anon, authenticated;
revoke all on function public.tx_county_fips_from_name(text) from public, anon, authenticated;
revoke all on function public.listing_resolve_county_fips(uuid, text) from public, anon, authenticated;
revoke all on function public.listings_bind_county_fips() from public, anon, authenticated;

grant execute on function public.normalize_tx_county_name(text) to service_role;
grant execute on function public.tx_county_fips_from_name(text) to service_role;
grant execute on function public.listing_resolve_county_fips(uuid, text) to service_role;

comment on column public.listings.county_fips is
  'Canonical listing County. 5-digit Texas FIPS from tx_counties. Server-computed. NULL if unmatched.';

comment on function public.listing_resolve_county_fips(uuid, text) is
  'Listing County authority: verified primary warehouse parcel FIPS, else unique county_name, else NULL.';
