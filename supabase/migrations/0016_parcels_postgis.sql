-- ---------------------------------------------------------------------------
-- Wave L — Statewide parcel foundation (PostGIS)
--
-- Turns the county_parcels store into a real spatial dataset so we can serve
-- parcel-grid vector tiles at zoom (like a CAD viewer) and derive listing
-- coordinates from parcel centroids. Keys on county FIPS, so it scales to all
-- 254 Texas counties. Geometry stays in sync automatically on every ingest,
-- so statewide auto-refresh needs no app changes.
-- ---------------------------------------------------------------------------

create extension if not exists postgis;

-- Real geometry column alongside the existing GeoJSON.
alter table public.county_parcels
  add column if not exists geom geometry(MultiPolygon, 4326);

-- Backfill geometry from any GeoJSON already ingested.
update public.county_parcels
   set geom = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(geojson::text), 4326))
 where geojson is not null and geom is null;

-- Spatial index for fast tile/bbox queries.
create index if not exists county_parcels_geom_gix
  on public.county_parcels using gist (geom);

-- Keep geom in sync whenever geojson is written (auto-sync for statewide loads).
create or replace function public.parcels_sync_geom()
returns trigger language plpgsql as $$
begin
  if new.geojson is not null then
    new.geom := ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(new.geojson::text), 4326));
  else
    new.geom := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_parcels_sync_geom on public.county_parcels;
create trigger trg_parcels_sync_geom
  before insert or update of geojson on public.county_parcels
  for each row execute function public.parcels_sync_geom();

-- ---------------------------------------------------------------------------
-- Parcel-grid vector tiles (Mapbox Vector Tile) — our own tile server.
-- Only serves at parcel-scale zoom (>= 13) so tiles stay small.
-- ---------------------------------------------------------------------------
create or replace function public.parcels_mvt(z int, x int, y int)
returns bytea
language plpgsql stable parallel safe security definer set search_path = public as $$
declare
  result bytea;
  env geometry := ST_TileEnvelope(z, x, y);   -- 3857
begin
  if z < 13 then
    return ''::bytea;
  end if;
  select ST_AsMVT(t, 'parcels', 4096, 'geom') into result
  from (
    select
      p.prop_id,
      p.owner_name,
      p.situs_address,
      p.legal_acreage,
      p.market_value,
      ST_AsMVTGeom(
        ST_Transform(p.geom, 3857),
        env,
        4096, 64, true
      ) as geom
    from public.county_parcels p
    where p.geom is not null
      and p.geom && ST_Transform(env, 4326)
  ) as t
  where t.geom is not null;
  return coalesce(result, ''::bytea);
end;
$$;
grant execute on function public.parcels_mvt(int, int, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Listing geocoding: derive lat/lng from a linked CAD parcel centroid so
-- listings drop a map pin without a paid geocoder. Fires when a listing is
-- linked to a parcel (cad_prop_id) and has no coordinates yet.
-- ---------------------------------------------------------------------------
create or replace function public.geocode_listing_from_parcel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c record;
begin
  if new.cad_prop_id is not null and (new.lat is null or new.lng is null) then
    select centroid_lat, centroid_lng into c
    from public.county_parcels
    where prop_id = new.cad_prop_id
    limit 1;
    if found and c.centroid_lat is not null then
      new.lat := c.centroid_lat;
      new.lng := c.centroid_lng;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_geocode_listing on public.listings;
create trigger trg_geocode_listing
  before insert or update of cad_prop_id, lat, lng on public.listings
  for each row execute function public.geocode_listing_from_parcel();

-- One-time backfill for any already-linked listings.
update public.listings l
   set lat = p.centroid_lat, lng = p.centroid_lng
  from public.county_parcels p
 where l.cad_prop_id = p.prop_id
   and (l.lat is null or l.lng is null)
   and p.centroid_lat is not null;
