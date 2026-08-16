-- IX-1 — approx meters to nearest mapped-road crossing (corridor-intersection-v1).
-- Not survey-grade. Null / empty when no crossing found — never invent.

create or replace function public.corridor_parcel_intersection_distance(
  p_prop_id text,
  p_source text,
  p_join_m double precision default 20,
  p_search_m double precision default 200
)
returns table (
  approx_distance_m double precision,
  route_a text,
  route_b text
)
language sql
stable
parallel safe
security definer
set search_path = public
as $$
  with parcel as (
    select
      ST_Multi(geom) as geom,
      ST_Centroid(geom) as c
    from public.county_parcels
    where prop_id = p_prop_id
      and source = p_source
      and geom is not null
    limit 1
  ),
  nearby as (
    select s.id, s.route_id, s.geom
    from public.corridor_road_segments s
    cross join parcel p
    where ST_DWithin(s.geom::geography, p.geom::geography, p_search_m)
  ),
  pairs as (
    select
      a.route_id as route_a,
      b.route_id as route_b,
      ST_ClosestPoint(a.geom, b.geom) as cross_pt
    from nearby a
    join nearby b
      on a.id < b.id
     and a.route_id is distinct from b.route_id
    where ST_DWithin(a.geom::geography, b.geom::geography, p_join_m)
  )
  select
    round(
      ST_Distance(pairs.cross_pt::geography, parcel.c::geography)::numeric,
      0
    )::double precision as approx_distance_m,
    pairs.route_a,
    pairs.route_b
  from pairs
  cross join parcel
  order by 1 asc
  limit 1;
$$;

comment on function public.corridor_parcel_intersection_distance(text, text, double precision, double precision) is
  'IX-1 corridor-intersection-v1 — approx meters from parcel centroid to nearest mapped-road crossing. Not survey-grade.';

grant execute on function public.corridor_parcel_intersection_distance(text, text, double precision, double precision)
  to authenticated, service_role;
