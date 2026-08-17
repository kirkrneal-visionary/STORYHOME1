-- ARCHIE-NEIGHBORS N1 — thin CAD parcel neighbors (touches / near buffer).
-- Calculated from owned county_parcels.geom only. Not survey-grade.
-- Empty when subject geom missing or no neighbors — never invent.

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
language sql
stable
parallel safe
security definer
set search_path = public
as $$
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
  /* ~degree expand for GiST prefilter (buffer meters → rough degrees) */
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
$$;

comment on function public.parcel_neighbors(text, text, double precision, integer) is
  'ARCHIE-NEIGHBORS N1 — CAD parcels that touch or fall within buffer_m of subject. Not survey-grade.';

grant execute on function public.parcel_neighbors(text, text, double precision, integer)
  to authenticated, service_role;
