-- ---------------------------------------------------------------------------
-- Wave L4: CAD ingestion for the 7 launch counties
--
-- Extends county_parcels with real/personal category, mobile-home serials,
-- detail-level (so Tyler geometry-only rows flag agent manual entry), and a
-- per-county refresh status table for the 72-hour auto-refresh loop.
-- Also expands listings for MH serials + Mobile/Manufactured property type.
-- ---------------------------------------------------------------------------

-- Parcel enrichment ----------------------------------------------------------
alter table public.county_parcels
  add column if not exists property_category text
    check (property_category is null or property_category in ('real', 'personal')),
  add column if not exists mh_serial_number text,
  add column if not exists mh_hud_label text,
  add column if not exists mh_make text,
  add column if not exists mh_model text,
  add column if not exists mh_year int,
  add column if not exists detail_level text not null default 'full'
    check (detail_level in ('full', 'partial', 'geometry_only')),
  add column if not exists needs_agent_detail boolean not null default false;

create index if not exists county_parcels_mh_serial_idx
  on public.county_parcels (mh_serial_number)
  where mh_serial_number is not null;

create index if not exists county_parcels_category_idx
  on public.county_parcels (property_category);

create index if not exists county_parcels_source_ingested_idx
  on public.county_parcels (source, ingested_at desc);

-- Per-county CAD refresh status (72-hour auto-refresh) -----------------------
create table if not exists public.cad_county_status (
  source text primary key,
  county_fips text not null,
  county_name text not null,
  ingest_mode text not null default 'arcgis'
    check (ingest_mode in ('arcgis', 'file', 'manual')),
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  parcel_count int not null default 0,
  real_count int not null default 0,
  personal_count int not null default 0,
  mh_serial_count int not null default 0,
  refresh_interval_hours int not null default 72,
  source_url text,
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.cad_county_status enable row level security;

drop policy if exists cad_county_status_public_read on public.cad_county_status;
create policy cad_county_status_public_read on public.cad_county_status
  for select to anon, authenticated using (true);

grant select on public.cad_county_status to anon, authenticated;
grant all    on public.cad_county_status to service_role;

-- Seed the 7 launch counties (+ optional Montgomery for Cleveland) ----------
insert into public.cad_county_status
  (source, county_fips, county_name, ingest_mode, source_url, notes)
values
  ('polk_cad',        '48373', 'Polk County',        'arcgis',
   'https://utility.arcgis.com/usrsvcs/servers/60f9b6d8a8c546b6b0aa1fb4999bee8e/rest/services/PolkCADWebService/FeatureServer/0',
   'Polk CAD BIS FeatureServer'),
  ('angelina_cad',    '48005', 'Angelina County',    'arcgis',
   'https://services6.arcgis.com/Cj2HGLAAprJTsy8b/ArcGIS/rest/services/AngelinaParcels/FeatureServer/0',
   'Angelina CAD parcels FeatureServer'),
  ('trinity_cad',     '48455', 'Trinity County',     'arcgis',
   'https://services6.arcgis.com/hLftBSoB3mrzkhE4/arcgis/rest/services/TrinityCADWebService/FeatureServer/0',
   'Trinity CAD BIS FeatureServer'),
  ('tyler_cad',       '48457', 'Tyler County',       'file',
   'https://tylercad.net/wp-content/uploads/2025/12/Parcels.zip',
   'Download-only CAD shapefile (geometry + prop_id); agent supplies ownership/legal/serial detail'),
  ('san_jacinto_cad', '48407', 'San Jacinto County', 'arcgis',
   'https://services8.arcgis.com/Cj28SFmpkCtGCeEQ/arcgis/rest/services/SanJacintoCADWebService/FeatureServer/0',
   'San Jacinto CAD BIS FeatureServer'),
  ('liberty_cad',     '48291', 'Liberty County',     'arcgis',
   'https://services3.arcgis.com/LbQai106UcFy2LlR/arcgis/rest/services/LibertyCADWebService/FeatureServer/0',
   'Liberty CAD BIS FeatureServer'),
  ('walker_cad',      '48471', 'Walker County',      'arcgis',
   'https://services6.arcgis.com/hEVWOxh6v1J8BInI/arcgis/rest/services/WalkerCADWebService/FeatureServer/0',
   'Walker CAD BIS FeatureServer'),
  ('montgomery_cad',  '48339', 'Montgomery County',  'arcgis',
   'https://services1.arcgis.com/PRoAPGnMSUqvTrzq/arcgis/rest/services/Tax_Parcel_view/FeatureServer/0',
   'Optional for Cleveland — Montgomery Tax_Parcel_view FeatureServer')
on conflict (source) do update set
  county_fips = excluded.county_fips,
  county_name = excluded.county_name,
  ingest_mode = excluded.ingest_mode,
  source_url  = excluded.source_url,
  notes       = excluded.notes,
  updated_at  = now();

-- Listings: mobile-home serial + Mobile/Manufactured type -------------------
alter table public.listings
  add column if not exists mh_serial_number text,
  add column if not exists mh_hud_label text;

-- Expand property_type check to include Mobile / Manufactured.
alter table public.listings drop constraint if exists listings_property_type_check;
alter table public.listings
  add constraint listings_property_type_check
  check (
    property_type is null
    or property_type in (
      'Single Family',
      'Farm and Ranch',
      'Condo',
      'Town Home',
      'Mobile / Manufactured'
    )
  );

create index if not exists listings_mh_serial_idx
  on public.listings (mh_serial_number)
  where mh_serial_number is not null;

-- Homes mirror (consumer My Home) -------------------------------------------
alter table public.homes
  add column if not exists mh_serial_number text,
  add column if not exists mh_hud_label text;

create index if not exists homes_mh_serial_idx
  on public.homes (mh_serial_number)
  where mh_serial_number is not null;
