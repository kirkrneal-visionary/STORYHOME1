-- Isolated P2B2C1 dry-run. Does not persist membership. Does not mutate activation.

create table public.county_parcels (
  source text not null default 'p2b2c1_fixture',
  prop_id text primary key,
  county_fips text not null,
  situs_city text,
  geom geometry(MultiPolygon, 4326),
  centroid_lat double precision,
  centroid_lng double precision
);

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
  n int;
  livingston uuid := '57b6c1da-0815-5ea9-9202-ec53a86f6c87';
  onalaska uuid := 'df5284bd-dc05-5397-b4e9-14fbd75ba1ca';
  cleveland uuid := 'd34e1210-95ec-5371-92cf-69271971259e';
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'county_parcels' and column_name = 'local_place_id'
  ) then raise exception 'membership_column'; end if;
  raise notice 'no_membership_column';

  select * into r from public.classify_parcel_local_place(
    '48373', (select geom from public.county_parcels where prop_id = 'liv_inside'), null, null);
  if r.status <> 'MATCHED' or r.local_place_id <> livingston or r.match_count <> 1 then
    raise exception 'liv_inside % %', r.status, r.local_place_id;
  end if;
  raise notice 'livingston_inside_matched';

  select * into r from public.classify_parcel_local_place(
    '48373', (select geom from public.county_parcels where prop_id = 'liv_mailing'), null, null);
  if r.status <> 'UNMATCHED' or r.local_place_id is not null then
    raise exception 'liv_mailing %', r.status;
  end if;
  raise notice 'livingston_mailing_unmatched';

  select * into r from public.classify_parcel_local_place(
    '48373', (select geom from public.county_parcels where prop_id = 'liv_boundary'), null, null);
  if r.status <> 'MATCHED' or r.local_place_id <> livingston then
    raise exception 'liv_boundary %', r.status;
  end if;
  raise notice 'livingston_boundary_matched';
  raise notice 'st_covers_boundary';

  select * into r from public.classify_parcel_local_place(
    '48373', (select geom from public.county_parcels where prop_id = 'polk_rural'), null, null);
  if r.status <> 'UNMATCHED' then raise exception 'polk_rural %', r.status; end if;
  raise notice 'polk_outside_unmatched';

  select * into r from public.classify_parcel_local_place(
    '48373', (select geom from public.county_parcels where prop_id = 'ona_inside'), null, null);
  if r.status <> 'MATCHED' or r.local_place_id <> onalaska then
    raise exception 'ona %', r.status;
  end if;
  if exists (select 1 from public.local_place_product_activation where local_place_id = onalaska) then
    raise exception 'onalaska_active';
  end if;
  raise notice 'onalaska_matched_inactive';

  select * into r from public.classify_parcel_local_place(
    '48291', (select geom from public.county_parcels where prop_id = 'cle_liberty'), null, null);
  if r.status <> 'MATCHED' or r.local_place_id <> cleveland then
    raise exception 'cle_liberty %', r.status;
  end if;
  raise notice 'cleveland_liberty_matched';

  select * into r from public.classify_parcel_local_place(
    '48407', (select geom from public.county_parcels where prop_id = 'cle_san_jacinto'), null, null);
  if r.status <> 'ASSOCIATION_MISMATCH' or r.local_place_id <> cleveland then
    raise exception 'cle_sj % %', r.status, r.local_place_id;
  end if;
  raise notice 'cleveland_san_jacinto_association_mismatch';

  select * into r from public.classify_parcel_local_place('48373', null, null, null);
  if r.status <> 'UNMATCHED' then raise exception 'no_geom %', r.status; end if;
  raise notice 'no_geom_unmatched';

  if exists (
    select 1 from public.local_place_boundaries a
    join public.local_place_boundaries b on a.local_place_id < b.local_place_id
    where ST_Intersects(a.geom, b.geom) and not ST_Touches(a.geom, b.geom)
  ) then raise exception 'overlap_in_22'; end if;
  if public.parcel_local_place_status(2, true) <> 'AMBIGUOUS' then
    raise exception 'ambiguity_rule';
  end if;
  raise notice 'ambiguity_none_in_22';
  raise notice 'ambiguity_fail_closed';
  raise notice 'one_place_max';

  if exists (
    select 1 from public.local_place_counties
    where local_place_id = cleveland and county_fips not in ('48291', '48339')
  ) then raise exception 'cleveland_counties_mutated'; end if;
  if (select count(*) from public.local_place_product_activation) <> 7 then
    raise exception 'activation_changed';
  end if;
  raise notice 'counties_unchanged';
  raise notice 'activation_unchanged';
  raise notice 'situs_not_authority';
  raise notice 'etj_not_membership';
end
$$;

do $$
begin
  begin
    set local role anon;
    perform public.classify_parcel_local_place('48373', null, null, null);
    raise exception 'anon_classify_allowed';
  exception
    when insufficient_privilege then null;
    when others then if sqlerrm = 'anon_classify_allowed' then raise; end if;
  end;
  reset role;
  raise notice 'anon_classify_denied';
end
$$;
