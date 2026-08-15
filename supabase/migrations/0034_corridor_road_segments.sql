-- Corridors 2.0-C — road segment cache + approx parcel frontage (PostGIS).
-- Soft dependency: live TxDOT fetch still works when these tables are empty.
-- Rule version: corridor-frontage-v1 (see docs/shi/ARCHIE-CORRIDORS-2.md)

create table if not exists public.corridor_road_segments (
  id text primary key,
  county_fips text not null,
  route_id text not null,
  aadt integer,
  geom geometry(MultiLineString, 4326) not null,
  source text not null default 'txdot',
  updated_at timestamptz not null default now()
);

create index if not exists corridor_road_segments_fips_gix
  on public.corridor_road_segments using gist (geom);

create index if not exists corridor_road_segments_fips_idx
  on public.corridor_road_segments (county_fips);

create table if not exists public.corridor_traffic_observations (
  id bigserial primary key,
  county_fips text not null,
  station_id text not null,
  on_road text,
  year integer not null,
  aadt integer,
  lat double precision,
  lng double precision,
  geom geometry(Point, 4326),
  source text not null default 'txdot',
  updated_at timestamptz not null default now(),
  constraint corridor_traffic_obs_unique
    unique (county_fips, station_id, year)
);

create index if not exists corridor_traffic_obs_fips_idx
  on public.corridor_traffic_observations (county_fips);

create index if not exists corridor_traffic_obs_gix
  on public.corridor_traffic_observations using gist (geom);

comment on table public.corridor_road_segments is
  'Corridors 2.0-C cached TxDOT corridor linework for frontage / exposure. Not live congestion.';

comment on table public.corridor_traffic_observations is
  'Corridors 2.0-C cached TxDOT station-year AADT observations.';

-- Approx frontage: parcel boundary length within buffer of each nearby road segment.
-- Returns feet. Label UI as APPROX — not surveyed.
create or replace function public.corridor_parcel_frontage(
  p_prop_id text,
  p_source text,
  p_buffer_m double precision default 35
)
returns table (
  route_id text,
  approx_frontage_ft double precision,
  aadt integer,
  segment_id text
)
language sql
stable
parallel safe
security definer
set search_path = public
as $$
  with parcel as (
    select ST_Multi(geom) as geom
    from public.county_parcels
    where prop_id = p_prop_id
      and source = p_source
      and geom is not null
    limit 1
  ),
  roads as (
    select s.id, s.route_id, s.aadt, s.geom
    from public.corridor_road_segments s
    cross join parcel p
    where s.geom && ST_Expand(p.geom, 0.002)
  ),
  hits as (
    select
      r.route_id,
      r.aadt,
      r.id as segment_id,
      ST_Length(
        ST_Transform(
          ST_Intersection(
            ST_Boundary(p.geom),
            ST_Buffer(r.geom::geography, p_buffer_m)::geometry
          ),
          3857
        )
      ) * 3.28084 as ft
    from roads r
    cross join parcel p
    where ST_Intersects(
      ST_Boundary(p.geom),
      ST_Buffer(r.geom::geography, p_buffer_m)::geometry
    )
  )
  select
    h.route_id,
    round(sum(h.ft)::numeric, 1)::double precision as approx_frontage_ft,
    max(h.aadt)::integer as aadt,
    (array_agg(h.segment_id order by h.ft desc))[1] as segment_id
  from hits h
  group by h.route_id
  having sum(h.ft) >= 25;
$$;

grant execute on function public.corridor_parcel_frontage(text, text, double precision)
  to authenticated;

alter table public.corridor_road_segments enable row level security;
alter table public.corridor_traffic_observations enable row level security;

-- Pro read via authenticated; writes via service role / security definer upserts later.
drop policy if exists corridor_road_segments_select on public.corridor_road_segments;
create policy corridor_road_segments_select
  on public.corridor_road_segments for select
  to authenticated
  using (true);

drop policy if exists corridor_traffic_obs_select on public.corridor_traffic_observations;
create policy corridor_traffic_obs_select
  on public.corridor_traffic_observations for select
  to authenticated
  using (true);
