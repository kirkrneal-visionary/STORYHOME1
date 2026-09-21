-- P2B2C2: persist canonical parcel local-place membership.
-- UUID only. NULL = unmatched or unsafe. No production backfill.
-- Safe after 0078 with or without the 22-place seed. Backfill requires the seed.
-- Do not apply hosted independently of the P2 chain.

alter table public.county_parcels
  add column local_place_id uuid
  references public.local_places (id)
  on delete restrict
  on update restrict;

comment on column public.county_parcels.local_place_id is
  'Canonical municipal membership from authoritative geometry classification. NULL means unmatched or unsafe. Not product activation. Not public identity.';

create index county_parcels_local_place_id_idx
  on public.county_parcels (local_place_id);

create or replace function public.parcel_local_place_point(
  p_geom geometry,
  p_centroid_lat double precision,
  p_centroid_lng double precision
) returns geometry
language sql
immutable
as $$
  select case
    when p_geom is not null then ST_PointOnSurface(p_geom)
    when p_centroid_lat is not null and p_centroid_lng is not null
      then ST_SetSRID(ST_MakePoint(p_centroid_lng, p_centroid_lat), 4326)
    else null
  end
$$;

create or replace function public.classify_parcel_local_place(
  p_county_fips text,
  p_geom geometry,
  p_centroid_lat double precision,
  p_centroid_lng double precision
) returns table (
  local_place_id uuid,
  status text,
  match_count int
)
language plpgsql
stable
as $$
declare
  pt geometry;
  n int;
  hit uuid;
  ok boolean;
begin
  pt := public.parcel_local_place_point(p_geom, p_centroid_lat, p_centroid_lng);
  if pt is null then
    return query select null::uuid, 'UNMATCHED'::text, 0;
    return;
  end if;
  select count(*) into n
  from public.local_place_boundaries b
  where ST_Covers(b.geom, pt);
  if n = 1 then
    select b.local_place_id into hit
    from public.local_place_boundaries b
    where ST_Covers(b.geom, pt);
    select exists (
      select 1 from public.local_place_counties c
      where c.local_place_id = hit and c.county_fips = p_county_fips
    ) into ok;
  end if;
  return query select
    case when n = 1 and ok then hit else null end,
    case
      when n = 0 then 'UNMATCHED'
      when n > 1 then 'AMBIGUOUS'
      when not coalesce(ok, false) then 'ASSOCIATION_MISMATCH'
      else 'MATCHED'
    end,
    n;
end
$$;

create or replace function public.parcels_recompute_local_place(p_county_fips text default null)
returns table (
  county_fips text,
  total int,
  matched int,
  unmatched int,
  ambiguous int,
  association_mismatch int,
  changed int,
  unchanged int
)
language plpgsql
as $$
begin
  return query
  with src as (
    select p.ctid as rid, p.local_place_id as old_id, c.local_place_id as new_id, c.status
    from public.county_parcels p
    cross join lateral public.classify_parcel_local_place(
      p.county_fips, p.geom, p.centroid_lat, p.centroid_lng
    ) c
    where p_county_fips is null or p.county_fips = p_county_fips
  ),
  upd as (
    update public.county_parcels p
    set local_place_id = s.new_id
    from src s
    where p.ctid = s.rid
      and p.local_place_id is distinct from s.new_id
    returning 1
  )
  select
    coalesce(p_county_fips, '*'),
    count(*)::int,
    count(*) filter (where s.status = 'MATCHED')::int,
    count(*) filter (where s.status = 'UNMATCHED')::int,
    count(*) filter (where s.status = 'AMBIGUOUS')::int,
    count(*) filter (where s.status = 'ASSOCIATION_MISMATCH')::int,
    (select count(*) from upd)::int,
    (count(*) - (select count(*) from upd))::int
  from src s;
end
$$;

revoke all on function public.parcel_local_place_point(geometry, double precision, double precision)
  from public, anon, authenticated;
revoke all on function public.classify_parcel_local_place(text, geometry, double precision, double precision)
  from public, anon, authenticated;
revoke all on function public.parcels_recompute_local_place(text)
  from public, anon, authenticated;
grant execute on function public.parcel_local_place_point(geometry, double precision, double precision)
  to service_role;
grant execute on function public.classify_parcel_local_place(text, geometry, double precision, double precision)
  to service_role;
grant execute on function public.parcels_recompute_local_place(text)
  to service_role;
