-- P2A2A: canonical local-place identity and County relationships.
-- UUID is identity. No production seed, aliases, slugs, or public routes.

create extension if not exists pgcrypto;

create table public.local_places (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  place_type text not null,
  created_at timestamptz not null default now(),
  constraint local_places_name_check check (length(btrim(display_name)) > 0),
  constraint local_places_type_check check (
    place_type in (
      'city',
      'town',
      'village',
      'cdp',
      'unincorporated_community',
      'other'
    )
  )
);

comment on table public.local_places is
  'Canonical Story Home local-place identity. UUID is stable. Not a public page. Server/service-role only.';

create table public.local_place_counties (
  local_place_id uuid not null
    references public.local_places (id)
    on delete restrict
    on update restrict,
  county_fips text not null
    references public.tx_counties (county_fips)
    on delete restrict
    on update restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (local_place_id, county_fips)
);

comment on table public.local_place_counties is
  'Many-to-many local-place to tx_counties. At most one primary County per place. Geographic link is independent of County product state.';

create unique index local_place_counties_one_primary
  on public.local_place_counties (local_place_id)
  where is_primary;

alter table public.local_places enable row level security;
alter table public.local_places force row level security;
alter table public.local_place_counties enable row level security;
alter table public.local_place_counties force row level security;

revoke all on table public.local_places from public, anon, authenticated;
revoke all on table public.local_place_counties from public, anon, authenticated;
grant all on table public.local_places to service_role;
grant all on table public.local_place_counties to service_role;
