-- Isolated P2B2C2 persist proofs. No hosted apply. No listing membership.

insert into public.county_parcels (prop_id, county_fips, situs_city, geom) values
  ('liv_inside', '48373', 'Livingston',
    ST_Multi(ST_SetSRID(ST_MakeEnvelope(-94.938555, 30.710596, -94.938155, 30.710996), 4326))),
  ('liv_boundary', '48373', 'Livingston',
    ST_Multi(ST_SetSRID(ST_MakeEnvelope(-94.972076, 30.722740, -94.972056, 30.722760), 4326))),
  ('liv_mailing', '48373', 'Livingston',
    ST_Multi(ST_SetSRID(ST_MakeEnvelope(-94.850200, 30.709800, -94.849800, 30.710200), 4326))),
  ('polk_rural', '48373', 'Camden',
    ST_Multi(ST_SetSRID(ST_MakeEnvelope(-94.700200, 30.699800, -94.699800, 30.700200), 4326))),
  ('ona_inside', '48373', 'Onalaska',
    ST_Multi(ST_SetSRID(ST_MakeEnvelope(-95.105926, 30.820372, -95.105526, 30.820772), 4326))),
  ('cle_liberty', '48291', 'Cleveland',
    ST_Multi(ST_SetSRID(ST_MakeEnvelope(-95.071847, 30.342453, -95.071447, 30.342853), 4326))),
  ('cle_san_jacinto', '48407', 'Cleveland',
    ST_Multi(ST_SetSRID(ST_MakeEnvelope(-95.071847, 30.342453, -95.071447, 30.342853), 4326)));
insert into public.county_parcels (prop_id, county_fips, situs_city) values
  ('no_geom', '48373', 'Livingston');

do $$
declare
  r record;
  livingston uuid := '57b6c1da-0815-5ea9-9202-ec53a86f6c87';
  onalaska uuid := 'df5284bd-dc05-5397-b4e9-14fbd75ba1ca';
  cleveland uuid := 'd34e1210-95ec-5371-92cf-69271971259e';
  n int;
  situs text;
  cfips text;
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'county_parcels_local_place_id_idx'
  ) then raise exception 'missing_index'; end if;
  raise notice 'index_ok';

  select * into r from public.parcels_recompute_local_place(null);
  if r.total <> 8 then raise exception 'total %', r.total; end if;
  raise notice 'recompute_ok';

  if (select local_place_id from public.county_parcels where prop_id = 'liv_inside') <> livingston
    or (select situs_city from public.county_parcels where prop_id = 'liv_inside') <> 'Livingston'
    or (select county_fips from public.county_parcels where prop_id = 'liv_inside') <> '48373'
  then raise exception 'liv_inside'; end if;
  raise notice 'livingston_persisted';

  if (select local_place_id from public.county_parcels where prop_id = 'polk_rural') is not null
    then raise exception 'polk_rural'; end if;
  raise notice 'polk_outside_null';

  if (select local_place_id from public.county_parcels where prop_id = 'liv_mailing') is not null
    then raise exception 'liv_mailing'; end if;
  if (select local_place_id from public.county_parcels where prop_id = 'liv_boundary') <> livingston
    then raise exception 'liv_boundary'; end if;
  raise notice 'livingston_mailing_null';
  raise notice 'boundary_point_persisted';

  if (select local_place_id from public.county_parcels where prop_id = 'ona_inside') <> onalaska
    then raise exception 'ona'; end if;
  if exists (select 1 from public.local_place_product_activation where local_place_id = onalaska)
    then raise exception 'ona_active'; end if;
  raise notice 'onalaska_persisted_inactive';

  if (select local_place_id from public.county_parcels where prop_id = 'cle_liberty') <> cleveland
    then raise exception 'cle_liberty'; end if;
  raise notice 'cleveland_liberty_persisted';

  if (select local_place_id from public.county_parcels where prop_id = 'cle_san_jacinto') is not null
    then raise exception 'cle_sj'; end if;
  select status into situs from public.classify_parcel_local_place(
    '48407', (select geom from public.county_parcels where prop_id = 'cle_san_jacinto'), null, null);
  if situs <> 'ASSOCIATION_MISMATCH' then raise exception 'cle_sj_status'; end if;
  raise notice 'cleveland_san_jacinto_null_mismatch';

  if (select local_place_id from public.county_parcels where prop_id = 'no_geom') is not null
    then raise exception 'no_geom'; end if;
  raise notice 'no_geom_null';

  insert into public.local_places (id, display_name, place_type)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'OverlapProbe', 'other');
  insert into public.local_place_counties (local_place_id, county_fips, is_primary)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '48373', true);
  insert into public.local_place_boundaries (
    local_place_id, geom, source, source_vintage, source_geoid, retrieved_at
  )
  select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', geom, 'census_tiger_place', 'tiger_2024',
         '4899999', now()
  from public.local_place_boundaries
  where local_place_id = livingston;
  perform public.parcels_recompute_local_place('48373');
  if (select local_place_id from public.county_parcels where prop_id = 'liv_inside') is not null
    then raise exception 'ambiguous_not_null'; end if;
  raise notice 'ambiguity_null';
  delete from public.local_place_boundaries where local_place_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  delete from public.local_place_counties where local_place_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  delete from public.local_places where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  perform public.parcels_recompute_local_place('48373');
  if (select local_place_id from public.county_parcels where prop_id = 'liv_inside') <> livingston
    then raise exception 'liv_restore'; end if;

  select * into r from public.parcels_recompute_local_place(null);
  if r.changed <> 0 then raise exception 'not_idempotent %', r.changed; end if;
  raise notice 'idempotent';

  begin
    insert into public.county_parcels (prop_id, county_fips, local_place_id)
    values ('bad_fk', '48373', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    raise exception 'unknown_uuid_allowed';
  exception
    when foreign_key_violation then null;
    when others then if sqlerrm = 'unknown_uuid_allowed' then raise; end if;
  end;
  raise notice 'unknown_uuid_rejected';

  select count(*) into n from public.local_place_boundaries;
  if n <> 22 then raise exception 'boundaries %', n; end if;
  select count(*) into n from public.local_place_external_ids;
  if n <> 44 then raise exception 'external_ids %', n; end if;
  if exists (
    select 1 from public.local_place_counties
    where local_place_id = cleveland and county_fips not in ('48291', '48339')
  ) then raise exception 'cleveland_counties'; end if;
  if (select count(*) from public.local_place_product_activation) <> 7 then
    raise exception 'activation';
  end if;
  select situs_city, county_fips into situs, cfips
  from public.county_parcels where prop_id = 'liv_mailing';
  if situs <> 'Livingston' or cfips <> '48373' then raise exception 'situs_mutated'; end if;
  raise notice 'boundaries_unchanged';
  raise notice 'external_ids_unchanged';
  raise notice 'counties_unchanged';
  raise notice 'activation_unchanged';
  raise notice 'situs_unchanged';
end
$$;

do $$
begin
  begin
    set local role anon;
    update public.county_parcels set local_place_id = '57b6c1da-0815-5ea9-9202-ec53a86f6c87';
    raise exception 'anon_write_allowed';
  exception
    when insufficient_privilege then null;
    when others then if sqlerrm = 'anon_write_allowed' then raise; end if;
  end;
  reset role;
  begin
    set local role authenticated;
    perform public.parcels_recompute_local_place(null);
    raise exception 'authenticated_recompute_allowed';
  exception
    when insufficient_privilege then null;
    when others then if sqlerrm = 'authenticated_recompute_allowed' then raise; end if;
  end;
  reset role;
  raise notice 'client_mutation_denied';
end
$$;
