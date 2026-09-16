-- Harden Wave 2: neighbor / frontage RPCs require Story Pro at the database.
-- Individual Pro and office (managing_broker) qualify. Service role may call.
-- Unauthorized callers get privilege denied — not an empty "no neighbors" result.
-- Does NOT change county_parcels grants or RLS. Wave 4 owns that warehouse lock.
-- Does NOT delete users, listings, or county/CAD.

-- ---------------------------------------------------------------------------
-- Canonical Story Pro helper (same purposes as mayUseStoryPro on the server)
-- ---------------------------------------------------------------------------
create or replace function public.may_use_story_pro(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_uid
      and account_purpose in ('individual_pro', 'managing_broker')
  );
$$;

comment on function public.may_use_story_pro(uuid) is
  'Story Pro tools. Individual realtor and office (managing broker) logins both qualify. UI labels are ignored.';

create or replace function public.assert_story_pro_rpc()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return;
  end if;
  if public.may_use_story_pro(auth.uid()) then
    return;
  end if;
  raise exception 'story_pro_required'
    using errcode = '42501';
end;
$$;

comment on function public.assert_story_pro_rpc() is
  'Neighbor and frontage RPCs. Privilege is the signed-in purpose, not a browser role.';

revoke execute on function public.may_use_story_pro(uuid) from anon, public;
revoke execute on function public.assert_story_pro_rpc() from anon, public;
grant execute on function public.may_use_story_pro(uuid) to authenticated, service_role;
grant execute on function public.assert_story_pro_rpc() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- corridor_parcel_frontage — same geometry as 0048, Pro asserted first
-- ---------------------------------------------------------------------------
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
language plpgsql
stable
parallel safe
security definer
set search_path = public
as $$
begin
  perform public.assert_story_pro_rpc();
  return query
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
end;
$$;

-- ---------------------------------------------------------------------------
-- corridor_parcel_intersection_distance — same geometry as 0048, Pro asserted first
-- ---------------------------------------------------------------------------
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
language plpgsql
stable
parallel safe
security definer
set search_path = public
as $$
begin
  perform public.assert_story_pro_rpc();
  return query
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
end;
$$;

-- ---------------------------------------------------------------------------
-- parcel_neighbors — same geometry as 0048, Pro asserted first
-- ---------------------------------------------------------------------------
create or replace function public.parcel_neighbors(
  p_prop_id text,
  p_source text,
  p_buffer_m double precision default 2,
  p_limit integer default 24
)
returns table (
  prop_id text,
  source text,
  county_fips text,
  owner_name text,
  cad_owner_id text,
  legal_acreage double precision,
  relation text,
  distance_m double precision
)
language plpgsql
stable
parallel safe
security definer
set search_path = public
as $$
begin
  perform public.assert_story_pro_rpc();
  return query
  with subject as (
    select
      geom,
      source,
      prop_id,
      county_fips
    from public.county_parcels
    where prop_id = p_prop_id
      and source = p_source
      and geom is not null
    limit 1
  ),
  box as (
    select
      s.*,
      ST_Expand(
        s.geom,
        greatest(coalesce(p_buffer_m, 2), 2) / 111320.0
      ) as search_geom
    from subject s
  )
  select
    n.prop_id,
    n.source,
    n.county_fips,
    n.owner_name,
    n.cad_owner_id,
    n.legal_acreage,
    case
      when ST_Touches(b.geom, n.geom) then 'touches'
      else 'near'
    end as relation,
    round(
      ST_Distance(b.geom::geography, n.geom::geography)::numeric,
      1
    )::double precision as distance_m
  from box b
  join public.county_parcels n
    on n.source = b.source
   and n.prop_id is distinct from b.prop_id
   and n.geom is not null
   and n.geom && b.search_geom
   and (
     ST_Touches(b.geom, n.geom)
     or ST_DWithin(
       b.geom::geography,
       n.geom::geography,
       greatest(coalesce(p_buffer_m, 2), 0)
     )
   )
  order by
    case when ST_Touches(b.geom, n.geom) then 0 else 1 end,
    ST_Distance(b.geom::geography, n.geom::geography),
    n.prop_id
  limit greatest(coalesce(p_limit, 24), 1);
end;
$$;

revoke execute on function public.corridor_parcel_frontage(text, text, double precision)
  from anon, public;
revoke execute on function public.corridor_parcel_intersection_distance(text, text, double precision, double precision)
  from anon, public;
revoke execute on function public.parcel_neighbors(text, text, double precision, integer)
  from anon, public;

grant execute on function public.corridor_parcel_frontage(text, text, double precision)
  to authenticated, service_role;
grant execute on function public.corridor_parcel_intersection_distance(text, text, double precision, double precision)
  to authenticated, service_role;
grant execute on function public.parcel_neighbors(text, text, double precision, integer)
  to authenticated, service_role;

comment on function public.corridor_parcel_frontage(text, text, double precision) is
  'Approx parcel frontage from mapped roads. Story Pro RPC. Not a survey.';
comment on function public.corridor_parcel_intersection_distance(text, text, double precision, double precision) is
  'Approx meters to a mapped-road crossing. Story Pro RPC. Not a survey.';
comment on function public.parcel_neighbors(text, text, double precision, integer) is
  'ARCHIE-NEIGHBORS N1 — CAD parcels that touch or fall within buffer_m of subject. Story Pro RPC. Not survey-grade.';
