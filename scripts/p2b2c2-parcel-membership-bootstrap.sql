-- Isolated CAD-compatible warehouse for 0079. Not production. Not a 345k backfill.
create table public.county_parcels (
  source text not null default 'p2b2c2_fixture',
  prop_id text not null,
  county_fips text not null,
  situs_city text,
  geom geometry(MultiPolygon, 4326),
  centroid_lat double precision,
  centroid_lng double precision,
  unique (source, prop_id)
);
revoke all on table public.county_parcels from public, anon, authenticated;
grant all on table public.county_parcels to service_role;
