-- Isolated P2A2B proofs. Not production seed.
do $$
declare
  liberty_id uuid; trinity_id uuid; cleveland_id uuid; oak_a uuid; oak_b uuid;
  r record; n int;
begin
  insert into public.local_places (display_name, place_type, canonical_slug)
    values ('Liberty', 'city', 'liberty') returning id into liberty_id;
  insert into public.local_place_counties (local_place_id, county_fips, is_primary)
    values (liberty_id, '48291', true);
  insert into public.local_places (display_name, place_type, canonical_slug)
    values ('Trinity', 'city', 'trinity') returning id into trinity_id;
  insert into public.local_place_counties (local_place_id, county_fips, is_primary)
    values (trinity_id, '48455', true);
  insert into public.local_places (display_name, place_type, canonical_slug)
    values ('Oak Grove', 'unincorporated_community', 'oak-grove') returning id into oak_a;
  insert into public.local_places (display_name, place_type, canonical_slug)
    values ('Oak Grove', 'unincorporated_community', 'oak-grove') returning id into oak_b;
  insert into public.local_place_counties (local_place_id, county_fips, is_primary)
    values (oak_a, '48373', true), (oak_b, '48005', true);
  raise notice 'same_name_slugs_ok';

  insert into public.local_places (display_name, place_type, canonical_slug)
    values ('Cleveland', 'city', 'cleveland') returning id into cleveland_id;
  insert into public.local_place_counties (local_place_id, county_fips, is_primary)
    values (cleveland_id, '48291', true), (cleveland_id, '48339', false);

  select * into r from public.resolve_local_place('48291', 'Liberty');
  if r.local_place_id <> liberty_id or r.key_class <> 'canonical_slug'
    or r.primary_county_fips <> '48291' then raise exception 'liberty_resolve'; end if;
  raise notice 'liberty_place_ok';
  select * into r from public.resolve_local_place('48455', 'TRINITY');
  if r.local_place_id <> trinity_id then raise exception 'trinity_resolve'; end if;
  raise notice 'trinity_place_ok';
  select count(*) into n from public.resolve_local_place('48291', 'trinity');
  if n <> 0 then raise exception 'cross_county_leak'; end if;
  raise notice 'county_context_ok';

  select * into r from public.resolve_local_place('48291', 'cleveland');
  if r.local_place_id <> cleveland_id or r.primary_county_fips <> '48291' then
    raise exception 'cleveland_liberty'; end if;
  select * into r from public.resolve_local_place('48339', 'Cleveland');
  if r.local_place_id <> cleveland_id or r.requested_county_associated is not true
    or r.primary_county_fips <> '48291' then raise exception 'cleveland_montgomery'; end if;
  select count(*) into n from public.resolve_local_place('48005', 'cleveland');
  if n <> 0 then raise exception 'cleveland_wrong_parent'; end if;
  raise notice 'cleveland_two_county_ok';
  raise notice 'wrong_parent_no_match';

  update public.local_places set canonical_slug = 'cleveland-tx' where id = cleveland_id;
  insert into public.local_place_aliases (local_place_id, alias_kind, raw_value, normalized_value)
    values (cleveland_id, 'slug', 'cleveland', 'x');
  select * into r from public.resolve_local_place('48291', 'cleveland');
  if r.local_place_id <> cleveland_id or r.key_class <> 'alias' or cleveland_id is null then
    raise exception 'old_slug'; end if;
  raise notice 'old_slug_alias_ok';

  select count(*) into n from public.resolve_local_place('48373', 'livngston');
  if n <> 0 then raise exception 'fuzzy_matched'; end if;
  select count(*) into n from public.resolve_local_place('48373', 'no-such-place');
  if n <> 0 then raise exception 'unknown_matched'; end if;
  select count(*) into n from public.resolve_local_place('99999', 'liberty');
  if n <> 0 then raise exception 'unknown_county'; end if;
  raise notice 'unknown_no_match';
  raise notice 'fuzzy_none';

  begin
    insert into public.local_place_counties (local_place_id, county_fips, is_primary)
      values (oak_b, '48373', false);
    raise exception 'ambiguous_allowed';
  exception when others then if sqlerrm = 'ambiguous_allowed' then raise; end if;
  end;
  raise notice 'ambiguity_fail_closed';

  if public.normalize_local_place_key(' Cold Spring ') <> 'cold-spring' then
    raise exception 'norm'; end if;
  insert into public.local_place_aliases (local_place_id, alias_kind, raw_value, normalized_value)
    values (liberty_id, 'name', 'Liberty City', 'x');
  select * into r from public.resolve_local_place('48291', 'Liberty City');
  if r.local_place_id <> liberty_id or r.key_class <> 'alias' then
    raise exception 'name_alias'; end if;
  raise notice 'normalize_ok';

  begin
    update public.local_places set canonical_slug = 'liberty' where id = cleveland_id;
    raise exception 'slug_hijack_allowed';
  exception when others then if sqlerrm = 'slug_hijack_allowed' then raise; end if;
  end;
  begin
    insert into public.local_place_aliases (local_place_id, alias_kind, raw_value, normalized_value)
      values (liberty_id, 'slug', 'cleveland', 'x');
    raise exception 'alias_collision_allowed';
  exception when others then if sqlerrm = 'alias_collision_allowed' then raise; end if;
  end;
  begin
    insert into public.local_place_aliases (local_place_id, alias_kind, raw_value, normalized_value)
      values (cleveland_id, 'name', 'Cleveland', 'x');
    raise exception 'dup_alias_allowed';
  exception when others then if sqlerrm = 'dup_alias_allowed' then raise; end if;
  end;
  begin
    update public.local_place_aliases set local_place_id = liberty_id
      where local_place_id = cleveland_id;
    raise exception 'reassign_allowed';
  exception when others then if sqlerrm = 'reassign_allowed' then raise; end if;
  end;
  raise notice 'security_collision_ok';

  if exists (select 1 from public.tx_county_product_activation where county_fips = '48339') then
    raise exception 'montgomery_active'; end if;
  raise notice 'montgomery_inactive';
end
$$;

do $$
begin
  begin
    set local role anon;
    insert into public.local_place_aliases (local_place_id, alias_kind, raw_value, normalized_value)
      values ('00000000-0000-0000-0000-000000000001', 'slug', 'x', 'x');
    raise exception 'anon_write_allowed';
  exception
    when insufficient_privilege then null;
    when others then if sqlerrm = 'anon_write_allowed' then raise; end if;
  end;
  reset role;
  raise notice 'anon_write_denied';
  begin
    set local role authenticated;
    update public.local_places set canonical_slug = 'hacked';
    raise exception 'authenticated_write_allowed';
  exception
    when insufficient_privilege then null;
    when others then if sqlerrm = 'authenticated_write_allowed' then raise; end if;
  end;
  reset role;
  raise notice 'authenticated_write_denied';
end
$$;

select 'activation_still_seven'
where (select count(*) from public.tx_county_product_activation) = 7;
