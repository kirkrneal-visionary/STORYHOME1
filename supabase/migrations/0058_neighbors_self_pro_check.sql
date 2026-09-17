-- Correction: parcel_neighbors plpgsql name clash + may_use_story_pro self-check.
-- Does NOT weaken 0056 Story Pro assertion or 0057 warehouse locks.
-- Does NOT change county_parcels grants or RLS.
-- Does NOT delete users, listings, or county/CAD.

-- ---------------------------------------------------------------------------
-- may_use_story_pro — authenticated callers may only check themselves.
-- service_role may still pass an explicit uid (trusted server).
-- ---------------------------------------------------------------------------
create or replace function public.may_use_story_pro(p_uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  check_uid uuid;
begin
  if auth.role() = 'service_role' then
    check_uid := p_uid;
  else
    check_uid := auth.uid();
  end if;
  if check_uid is null then
    return false;
  end if;
  return exists (
    select 1
    from public.profiles
    where id = check_uid
      and account_purpose in ('individual_pro', 'managing_broker')
  );
end;
$$;

comment on function public.may_use_story_pro(uuid) is
  'Story Pro tools. Authenticated callers are checked as auth.uid() only — not an arbitrary-user lookup. Service role may pass a uid. UI labels are ignored.';

revoke execute on function public.may_use_story_pro(uuid) from anon, public;
grant execute on function public.may_use_story_pro(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- parcel_neighbors — same geometry and Pro assert as 0056.
-- Qualify county_parcels columns so plpgsql RETURNS TABLE (source, prop_id)
-- does not collide (42702 column reference "source" is ambiguous).
-- Cast legal_acreage numeric(12,4) → double precision (plpgsql is stricter
-- than the original LANGUAGE sql function).
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
#variable_conflict use_column
begin
  perform public.assert_story_pro_rpc();
  return query
  with subject as (
    select
      cp.geom,
      cp.source as parcel_source,
      cp.prop_id as parcel_prop_id,
      cp.county_fips
    from public.county_parcels as cp
    where cp.prop_id = p_prop_id
      and cp.source = p_source
      and cp.geom is not null
    limit 1
  ),
  box as (
    select
      s.geom,
      s.parcel_source,
      s.parcel_prop_id,
      s.county_fips,
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
    n.legal_acreage::double precision,
    case
      when ST_Touches(b.geom, n.geom) then 'touches'
      else 'near'
    end as relation,
    round(
      ST_Distance(b.geom::geography, n.geom::geography)::numeric,
      1
    )::double precision as distance_m
  from box b
  join public.county_parcels as n
    on n.source = b.parcel_source
   and n.prop_id is distinct from b.parcel_prop_id
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

revoke execute on function public.parcel_neighbors(text, text, double precision, integer)
  from anon, public;
grant execute on function public.parcel_neighbors(text, text, double precision, integer)
  to authenticated, service_role;

comment on function public.parcel_neighbors(text, text, double precision, integer) is
  'ARCHIE-NEIGHBORS N1 — CAD parcels that touch or fall within buffer_m of subject. Story Pro RPC. Not survey-grade.';
