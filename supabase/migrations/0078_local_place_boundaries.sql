-- P2B2B: authoritative local-place municipal boundaries.
-- UUID remains identity. Census GEOID/GNIS are references only.
-- Schema only. Geometry seed is the reviewed 22-place fixture, not this file.
-- Do not apply over the network. Do not classify parcels or listings.

create extension if not exists postgis;

create table public.local_place_boundaries (
  local_place_id uuid primary key
    references public.local_places (id)
    on delete restrict
    on update restrict,
  geom geometry(MultiPolygon, 4326) not null,
  source text not null,
  source_vintage text not null,
  source_geoid text not null,
  retrieved_at timestamptz not null,
  constraint local_place_boundaries_source_check
    check (source = 'census_tiger_place'),
  constraint local_place_boundaries_vintage_check
    check (length(btrim(source_vintage)) > 0),
  constraint local_place_boundaries_geoid_check
    check (source_geoid ~ '^48[0-9]{5}$'),
  constraint local_place_boundaries_srid_check
    check (ST_SRID(geom) = 4326),
  constraint local_place_boundaries_type_check
    check (GeometryType(geom) = 'MULTIPOLYGON'),
  constraint local_place_boundaries_valid_check
    check (ST_IsValid(geom))
);

comment on table public.local_place_boundaries is
  'Current Census TIGER/Line incorporated Place polygon per canonical local place. Not product activation. Server/service-role only.';

create unique index local_place_boundaries_source_geoid_uidx
  on public.local_place_boundaries (source_geoid);

create index local_place_boundaries_geom_gix
  on public.local_place_boundaries using gist (geom);

create table public.local_place_external_ids (
  local_place_id uuid not null
    references public.local_places (id)
    on delete restrict
    on update restrict,
  authority text not null,
  external_id text not null,
  created_at timestamptz not null default now(),
  primary key (local_place_id, authority),
  constraint local_place_external_ids_authority_check
    check (authority in ('census_geoid', 'gnis')),
  constraint local_place_external_ids_value_check
    check (length(btrim(external_id)) > 0)
);

comment on table public.local_place_external_ids is
  'Government reference IDs for canonical local places. Not Story Home identity. Server/service-role only.';

create unique index local_place_external_ids_authority_id_uidx
  on public.local_place_external_ids (authority, external_id);

alter table public.local_place_boundaries enable row level security;
alter table public.local_place_boundaries force row level security;
alter table public.local_place_external_ids enable row level security;
alter table public.local_place_external_ids force row level security;

revoke all on table public.local_place_boundaries from public, anon, authenticated;
revoke all on table public.local_place_external_ids from public, anon, authenticated;
grant all on table public.local_place_boundaries to service_role;
grant all on table public.local_place_external_ids to service_role;
