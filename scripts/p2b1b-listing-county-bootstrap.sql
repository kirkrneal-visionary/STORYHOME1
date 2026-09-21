-- Isolated P2B1B tables. Not production. Not a listing seed.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;
grant usage on schema public to anon, authenticated, service_role;

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  county_name text not null default '',
  county_fips text,
  city text not null default '',
  zip text,
  cad_prop_id text,
  lat double precision,
  lng double precision,
  acres numeric not null default 0
);

create table public.county_parcels (
  source text not null,
  prop_id text not null,
  county_fips text not null,
  legal_acreage numeric,
  centroid_lat double precision,
  centroid_lng double precision,
  unique (source, prop_id)
);

create table public.listing_parcels (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  source text not null,
  prop_id text not null,
  county_fips text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (listing_id, source, prop_id)
);

grant select, insert, update, delete on public.listings, public.listing_parcels
  to anon, authenticated;
grant select on public.county_parcels to service_role;
grant all on public.listings, public.listing_parcels, public.county_parcels
  to service_role;
