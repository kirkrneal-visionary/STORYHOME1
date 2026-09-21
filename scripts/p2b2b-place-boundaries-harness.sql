-- Isolated P2B2B proofs. Schema 0078 + reviewed fixture. Not hosted apply.
do $$
declare
  n int;
  livingston uuid := '57b6c1da-0815-5ea9-9202-ec53a86f6c87';
  cleveland uuid := 'd34e1210-95ec-5371-92cf-69271971259e';
  onalaska uuid := 'df5284bd-dc05-5397-b4e9-14fbd75ba1ca';
begin
  select count(*) into n from public.local_places;
  if n <> 22 then raise exception 'place_count %', n; end if;
  select count(*) into n from public.local_place_boundaries;
  if n <> 22 then raise exception 'boundary_count %', n; end if;
  select count(*) into n from public.local_place_external_ids where authority = 'census_geoid';
  if n <> 22 then raise exception 'geoid_count %', n; end if;
  select count(*) into n from public.local_place_external_ids where authority = 'gnis';
  if n <> 22 then raise exception 'gnis_count %', n; end if;
  raise notice 'counts_22';

  if exists (
    select 1 from public.local_place_boundaries
    where ST_SRID(geom) <> 4326
       or GeometryType(geom) <> 'MULTIPOLYGON'
       or not ST_IsValid(geom)
  ) then raise exception 'geom_invalid'; end if;
  raise notice 'geom_ok';

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'local_place_boundaries_geom_gix'
  ) then raise exception 'missing_gist'; end if;
  raise notice 'gist_ok';

  if (select place_type from public.local_places where id = livingston) <> 'town' then
    raise exception 'livingston_type';
  end if;
  if not exists (
    select 1 from public.local_place_boundaries b
    join public.local_place_external_ids e
      on e.local_place_id = b.local_place_id and e.authority = 'census_geoid'
    where b.local_place_id = livingston
      and e.external_id = '4843132'
  ) then raise exception 'livingston_boundary'; end if;
  raise notice 'livingston_ok';

  if (select count(*) from public.local_places where id = cleveland) <> 1 then
    raise exception 'cleveland_uuid';
  end if;
  if not exists (select 1 from public.local_place_boundaries where local_place_id = cleveland) then
    raise exception 'cleveland_boundary';
  end if;
  if exists (
    select 1 from public.local_place_external_ids
    where external_id in ('4851984', '02411272')
  ) then raise exception 'north_cleveland_ingested'; end if;
  if exists (
    select 1 from public.local_place_counties
    where local_place_id = cleveland and county_fips not in ('48291', '48339')
  ) then raise exception 'cleveland_counties_mutated'; end if;
  if not exists (
    select 1 from public.local_place_counties
    where local_place_id = cleveland and county_fips = '48291' and is_primary
  ) then raise exception 'cleveland_primary'; end if;
  raise notice 'cleveland_ok';
  raise notice 'north_cleveland_absent';
  raise notice 'counties_unchanged';
  raise notice 'cleveland_san_jacinto_reported_not_corrected';

  if exists (
    select 1 from public.local_place_product_activation where local_place_id = onalaska
  ) then raise exception 'onalaska_active'; end if;
  if not exists (select 1 from public.local_place_boundaries where local_place_id = onalaska) then
    raise exception 'onalaska_boundary';
  end if;
  if exists (
    select 1 from public.local_place_product_activation where local_place_id = cleveland
  ) then raise exception 'cleveland_active'; end if;
  if (select count(*) from public.local_place_product_activation) <> 7 then
    raise exception 'active_places';
  end if;
  if (select count(*) from public.tx_county_product_activation) <> 7 then
    raise exception 'active_counties';
  end if;
  raise notice 'activation_independent';
  raise notice 'onalaska_inactive_with_boundary';
  raise notice 'cleveland_inactive';
  raise notice 'active_seven';
end
$$;

do $$
begin
  begin
    set local role anon;
    insert into public.local_place_external_ids (local_place_id, authority, external_id)
    values ('57b6c1da-0815-5ea9-9202-ec53a86f6c87', 'gnis', '00000000');
    raise exception 'anon_write_allowed';
  exception
    when insufficient_privilege then null;
    when others then if sqlerrm = 'anon_write_allowed' then raise; end if;
  end;
  reset role;
  raise notice 'anon_write_denied';
  begin
    set local role authenticated;
    delete from public.local_place_boundaries;
    raise exception 'authenticated_write_allowed';
  exception
    when insufficient_privilege then null;
    when others then if sqlerrm = 'authenticated_write_allowed' then raise; end if;
  end;
  reset role;
  raise notice 'authenticated_write_denied';
end
$$;
