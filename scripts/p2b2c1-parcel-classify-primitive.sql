-- P2B2C1 isolated classification primitive. Not a hosted migration. Not 0079.
-- Representative point: ST_PointOnSurface(geom), else stored centroid, else null.
-- Cover: ST_Covers. One place max. Fail closed on overlap. County FIPS stays parcel County.

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

create or replace function public.parcel_local_place_status(
  p_match_count int,
  p_county_ok boolean
) returns text
language sql
immutable
as $$
  select case
    when p_match_count is null or p_match_count = 0 then 'UNMATCHED'
    when p_match_count > 1 then 'AMBIGUOUS'
    when not coalesce(p_county_ok, false) then 'ASSOCIATION_MISMATCH'
    else 'MATCHED'
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
  match_count int,
  boundary_vintage text
)
language plpgsql
stable
as $$
declare
  pt geometry;
  n int;
  hit uuid;
  vin text;
  ok boolean;
begin
  pt := public.parcel_local_place_point(p_geom, p_centroid_lat, p_centroid_lng);
  if pt is null then
    return query select null::uuid, 'UNMATCHED'::text, 0, null::text;
    return;
  end if;
  select count(*) into n
  from public.local_place_boundaries b
  where ST_Covers(b.geom, pt);
  if n = 1 then
    select b.local_place_id, b.source_vintage into hit, vin
    from public.local_place_boundaries b
    where ST_Covers(b.geom, pt);
    select exists (
      select 1 from public.local_place_counties c
      where c.local_place_id = hit and c.county_fips = p_county_fips
    ) into ok;
  end if;
  return query select
    case when n = 1 then hit else null end,
    public.parcel_local_place_status(n, ok),
    n,
    case when n = 1 then vin else null end;
end
$$;

revoke all on function public.parcel_local_place_point(geometry, double precision, double precision)
  from public, anon, authenticated;
revoke all on function public.parcel_local_place_status(int, boolean)
  from public, anon, authenticated;
revoke all on function public.classify_parcel_local_place(text, geometry, double precision, double precision)
  from public, anon, authenticated;
grant execute on function public.parcel_local_place_point(geometry, double precision, double precision)
  to service_role;
grant execute on function public.parcel_local_place_status(int, boolean)
  to service_role;
grant execute on function public.classify_parcel_local_place(text, geometry, double precision, double precision)
  to service_role;
