-- ---------------------------------------------------------------------------
-- County parcel data (public record) — pilot: Polk Central Appraisal District
--
-- Source: Polk CAD public ArcGIS parcel service (PolkCADWebService/FeatureServer/0),
-- which returns per-parcel attributes AND lot geometry with no license/API fee.
-- This is PUBLIC RECORD data, so these tables are world-readable; only the
-- service role (bulk ingester) may write them. Nothing here is fabricated —
-- rows exist only for parcels actually ingested from the county.
-- ---------------------------------------------------------------------------

create table if not exists public.county_parcels (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'polk_cad',
  county_fips text not null default '48373',      -- Polk County, TX
  prop_id text not null,                          -- CAD property id
  geo_id text,                                    -- CAD geographic id
  owner_name text,
  situs_num text,
  situs_street text,
  situs_city text,
  situs_state text,
  situs_zip text,
  situs_address text,                             -- composed, for display/search
  legal_description text,
  abstract_subdivision_code text,
  tract_or_lot text,
  block text,
  legal_acreage numeric(12,4),
  land_value numeric(14,2),
  improvement_value numeric(14,2),
  market_value numeric(14,2),
  tax_year int,
  school_code text,
  geojson jsonb,                                  -- GeoJSON geometry (Polygon/MultiPolygon)
  centroid_lat double precision,
  centroid_lng double precision,
  source_url text,
  ingested_at timestamptz not null default now(),
  unique (source, prop_id)
);

create index if not exists county_parcels_situs_idx
  on public.county_parcels (situs_zip, situs_num);
create index if not exists county_parcels_street_idx
  on public.county_parcels (lower(situs_street));
create index if not exists county_parcels_geoid_idx
  on public.county_parcels (geo_id);

-- Annual value history so the 3-year appraised-value view accrues over time.
create table if not exists public.county_parcel_values (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'polk_cad',
  prop_id text not null,
  tax_year int not null,
  land_value numeric(14,2),
  improvement_value numeric(14,2),
  market_value numeric(14,2),
  appraised_value numeric(14,2),
  assessed_value numeric(14,2),
  ingested_at timestamptz not null default now(),
  unique (source, prop_id, tax_year)
);

create index if not exists county_parcel_values_prop_idx
  on public.county_parcel_values (source, prop_id, tax_year);

-- Optional explicit links from an app record to a county parcel.
alter table public.homes    add column if not exists cad_prop_id text;
alter table public.listings add column if not exists cad_prop_id text;

-- ---------------------------------------------------------------------------
-- RLS: public read (public record), service-role-only writes
-- ---------------------------------------------------------------------------
alter table public.county_parcels        enable row level security;
alter table public.county_parcel_values  enable row level security;

drop policy if exists county_parcels_public_read on public.county_parcels;
create policy county_parcels_public_read on public.county_parcels
  for select to anon, authenticated using (true);

drop policy if exists county_parcel_values_public_read on public.county_parcel_values;
create policy county_parcel_values_public_read on public.county_parcel_values
  for select to anon, authenticated using (true);

-- No insert/update/delete policies: only the service role (bypassrls) writes.

grant select on public.county_parcels       to anon, authenticated;
grant select on public.county_parcel_values to anon, authenticated;
grant all    on public.county_parcels       to service_role;
grant all    on public.county_parcel_values to service_role;
