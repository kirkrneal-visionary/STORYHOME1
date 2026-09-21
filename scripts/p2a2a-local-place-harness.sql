-- Isolated P2A2A proofs. Not production. No launch-place seed.
do $$
declare
  liberty_id uuid;
  trinity_id uuid;
  cleveland_id uuid;
  oak_a uuid;
  oak_b uuid;
  n int;
begin
  insert into public.local_places (display_name, place_type)
    values ('Liberty', 'city')
    returning id into liberty_id;
  insert into public.local_place_counties (local_place_id, county_fips, is_primary)
    values (liberty_id, '48291', true);

  insert into public.local_places (display_name, place_type)
    values ('Trinity', 'city')
    returning id into trinity_id;
  insert into public.local_place_counties (local_place_id, county_fips, is_primary)
    values (trinity_id, '48455', true);

  if liberty_id = trinity_id then raise exception 'uuid_collision'; end if;
  if not exists (select 1 from public.tx_counties where county_fips = '48291') then
    raise exception 'liberty_county_missing';
  end if;
  raise notice 'liberty_namespaces_distinct';
  raise notice 'trinity_namespaces_distinct';

  insert into public.local_places (display_name, place_type)
    values ('Oak Grove', 'unincorporated_community')
    returning id into oak_a;
  insert into public.local_places (display_name, place_type)
    values ('Oak Grove', 'unincorporated_community')
    returning id into oak_b;
  insert into public.local_place_counties (local_place_id, county_fips, is_primary)
    values (oak_a, '48373', true), (oak_b, '48005', true);
  if oak_a = oak_b then raise exception 'same_name_blocked'; end if;
  raise notice 'same_name_supported';

  insert into public.local_places (display_name, place_type)
    values ('Cleveland', 'city')
    returning id into cleveland_id;
  insert into public.local_place_counties (local_place_id, county_fips, is_primary)
    values (cleveland_id, '48291', true);
  insert into public.local_place_counties (local_place_id, county_fips, is_primary)
    values (cleveland_id, '48339', false);
  select count(*) into n from public.local_place_counties
    where local_place_id = cleveland_id;
  if n <> 2 then raise exception 'cleveland_rel %', n; end if;
  if exists (
    select 1 from public.tx_county_product_activation where county_fips = '48339'
  ) then
    raise exception 'montgomery_became_active';
  end if;
  raise notice 'cleveland_two_counties';
  raise notice 'inactive_county_associated';

  begin
    insert into public.local_place_counties (local_place_id, county_fips, is_primary)
      values (cleveland_id, '48005', true);
    raise exception 'second_primary_allowed';
  exception
    when unique_violation then null;
    when others then
      if sqlerrm = 'second_primary_allowed' then raise; end if;
  end;
  raise notice 'one_primary_enforced';

  begin
    insert into public.local_place_counties (local_place_id, county_fips, is_primary)
      values (cleveland_id, '48999', false);
    raise exception 'unknown_fips_allowed';
  exception
    when foreign_key_violation then null;
    when others then
      if sqlerrm = 'unknown_fips_allowed' then raise; end if;
  end;
  raise notice 'unknown_fips_denied';

  begin
    insert into public.local_places (display_name, place_type)
      values ('Neighborhood', 'neighborhood');
    raise exception 'free_type_allowed';
  exception
    when check_violation then null;
    when others then
      if sqlerrm = 'free_type_allowed' then raise; end if;
  end;
  raise notice 'place_type_controlled';

  begin
    delete from public.local_places where id = cleveland_id;
    raise exception 'place_delete_allowed';
  exception
    when foreign_key_violation then null;
    when others then
      if sqlerrm = 'place_delete_allowed' then raise; end if;
  end;
  raise notice 'place_delete_restricted';
end
$$;

do $$
begin
  begin
    set local role anon;
    insert into public.local_places (display_name, place_type)
      values ('Fake', 'city');
    raise exception 'anon_write_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'anon_write_allowed' then raise; end if;
  end;
  reset role;
  raise notice 'anon_write_denied';
end
$$;

do $$
begin
  begin
    set local role authenticated;
    insert into public.local_places (display_name, place_type)
      values ('Consumer Place', 'city');
    raise exception 'authenticated_write_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'authenticated_write_allowed' then raise; end if;
  end;
  reset role;
  raise notice 'authenticated_write_denied';
end
$$;

do $$
begin
  begin
    set local role authenticated;
    insert into public.local_place_counties (local_place_id, county_fips, is_primary)
      values ('00000000-0000-0000-0000-000000000001', '48373', true);
    raise exception 'authenticated_rel_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'authenticated_rel_allowed' then raise; end if;
  end;
  reset role;
  raise notice 'authenticated_rel_denied';
end
$$;

select 'activation_still_seven'
where (select count(*) from public.tx_county_product_activation) = 7;
select 'no_production_seed_in_migration'
where true;
