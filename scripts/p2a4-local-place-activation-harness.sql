-- Isolated P2A4 proofs. Not public routes.
do $$
declare
  n int;
  r record;
  cleveland uuid := 'd34e1210-95ec-5371-92cf-69271971259e';
  probe uuid;
begin
  select count(*) into n from public.local_places;
  if n <> 22 then raise exception 'places_changed %', n; end if;
  raise notice 'canonical_places_22';

  select count(*) into n from public.local_place_product_activation;
  if n <> 7 then raise exception 'active_count %', n; end if;
  raise notice 'active_seven';

  if exists (
    select 1 from public.local_place_product_activation where local_place_id = cleveland
  ) then raise exception 'cleveland_active'; end if;
  raise notice 'cleveland_inactive';

  if exists (
    select 1 from public.local_place_product_activation a
    join public.local_place_counties c
      on c.local_place_id = a.local_place_id and c.is_primary
    where (a.local_place_id, c.county_fips) not in (
      ('00029d4e-eb06-5551-83de-6e016d76fa06', '48005'),
      ('e27d8dab-f9bb-5a40-88a0-989630cf6c91', '48291'),
      ('57b6c1da-0815-5ea9-9202-ec53a86f6c87', '48373'),
      ('d44ba033-63c7-5d3e-a701-9f07b33b78cd', '48407'),
      ('33b96f7a-394f-508f-bb97-f53ea282e6a8', '48455'),
      ('e48fe0cb-c8ee-5620-bf75-5cae48bf095f', '48457'),
      ('860e0e40-a3b2-5e4f-baef-4b8e39f8e219', '48471')
    )
  ) then raise exception 'hub_county_mismatch'; end if;
  if exists (
    select 1 from public.local_place_product_activation a
    join public.local_place_counties c
      on c.local_place_id = a.local_place_id and c.is_primary
    where not exists (
      select 1 from public.tx_county_product_activation p
      where p.county_fips = c.county_fips
    )
  ) then raise exception 'inactive_primary_allowed'; end if;
  raise notice 'hub_counties_ok';
  raise notice 'active_county_required';

  if (select count(*) from public.tx_county_product_activation) <> 7 then
    raise exception 'county_activation_changed'; end if;
  if exists (select 1 from public.tx_county_product_activation where county_fips = '48339') then
    raise exception 'montgomery_active'; end if;
  raise notice 'montgomery_inactive';
  raise notice 'county_activation_unchanged';

  insert into public.local_place_aliases (local_place_id, alias_kind, raw_value, normalized_value)
    values (cleveland, 'name', 'Cleveland TX', 'cleveland-tx');
  select * into r from public.resolve_local_place('48291', 'Cleveland TX');
  if r.local_place_id <> cleveland or r.key_class <> 'alias' then
    raise exception 'cleveland_alias'; end if;
  if exists (
    select 1 from public.local_place_product_activation
    where local_place_id = r.local_place_id
  ) then raise exception 'alias_activated_place'; end if;
  raise notice 'inactive_resolve_not_product';

  begin
    insert into public.local_place_product_activation (local_place_id, is_active)
      values ('00000000-0000-0000-0000-000000000001', true);
    raise exception 'unknown_uuid_allowed';
  exception when others then
    if sqlerrm = 'unknown_uuid_allowed' then raise; end if;
  end;
  raise notice 'unknown_uuid_denied';

  insert into public.local_places (display_name, place_type, canonical_slug)
    values ('Probe', 'other', 'p2a4-probe') returning id into probe;
  insert into public.local_place_counties (local_place_id, county_fips, is_primary)
    values (probe, '48339', true);
  begin
    insert into public.local_place_product_activation (local_place_id, is_active)
      values (probe, true);
    raise exception 'inactive_primary_place_allowed';
  exception when others then
    if sqlerrm = 'inactive_primary_place_allowed' then raise; end if;
  end;
  delete from public.local_place_counties where local_place_id = probe;
  delete from public.local_places where id = probe;
  raise notice 'inactive_primary_denied';

  if (select display_name from public.local_places where id = cleveland) <> 'Cleveland'
    or (select count(*) from public.local_place_counties where local_place_id = cleveland) <> 2
  then raise exception 'cleveland_mutated'; end if;
  raise notice 'canonical_facts_unchanged';
end
$$;

do $$
begin
  begin
    set local role anon;
    insert into public.local_place_product_activation (local_place_id, is_active)
      values ('d34e1210-95ec-5371-92cf-69271971259e', true);
    raise exception 'anon_write_allowed';
  exception
    when insufficient_privilege then null;
    when others then if sqlerrm = 'anon_write_allowed' then raise; end if;
  end;
  reset role;
  raise notice 'anon_write_denied';
  begin
    set local role authenticated;
    delete from public.local_place_product_activation;
    raise exception 'authenticated_write_allowed';
  exception
    when insufficient_privilege then null;
    when others then if sqlerrm = 'authenticated_write_allowed' then raise; end if;
  end;
  reset role;
  raise notice 'authenticated_write_denied';
end
$$;

insert into public.local_place_product_activation (local_place_id, is_active) values
  ('00029d4e-eb06-5551-83de-6e016d76fa06', true),
  ('e27d8dab-f9bb-5a40-88a0-989630cf6c91', true),
  ('57b6c1da-0815-5ea9-9202-ec53a86f6c87', true),
  ('d44ba033-63c7-5d3e-a701-9f07b33b78cd', true),
  ('33b96f7a-394f-508f-bb97-f53ea282e6a8', true),
  ('e48fe0cb-c8ee-5620-bf75-5cae48bf095f', true),
  ('860e0e40-a3b2-5e4f-baef-4b8e39f8e219', true)
on conflict (local_place_id) do update
  set is_active = excluded.is_active;

select 'idempotent_seven'
where (select count(*) from public.local_place_product_activation) = 7;
