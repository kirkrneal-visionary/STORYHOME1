-- Isolated P2A3 proofs. Seed is 0075. Not production activation.
do $$
declare
  n int;
  r record;
  cleveland_id uuid := 'd34e1210-95ec-5371-92cf-69271971259e';
  liberty_id uuid := 'e27d8dab-f9bb-5a40-88a0-989630cf6c91';
  trinity_id uuid := '6e8bfac5-1b0c-531d-be26-f53bef1ecf42';
begin
  select count(*) into n from public.local_places;
  if n <> 21 then raise exception 'seed_count %', n; end if;
  raise notice 'seed_count_21';

  if exists (select 1 from public.local_places group by id having count(*) > 1) then
    raise exception 'dup_uuid'; end if;
  if (select count(distinct canonical_slug) from public.local_places) <> 21 then
    raise exception 'slug_count'; end if;
  raise notice 'one_uuid_one_slug';

  if exists (
    select 1 from public.local_places p
    where not exists (
      select 1 from public.local_place_counties c where c.local_place_id = p.id
    )
  ) then raise exception 'missing_county'; end if;
  if exists (
    select local_place_id from public.local_place_counties
    where is_primary group by local_place_id having count(*) <> 1
  ) or exists (
    select p.id from public.local_places p
    where not exists (
      select 1 from public.local_place_counties c
      where c.local_place_id = p.id and c.is_primary
    )
  ) then raise exception 'primary_count'; end if;
  if exists (
    select 1 from public.local_place_counties c
    where not exists (select 1 from public.tx_counties t where t.county_fips = c.county_fips)
  ) then raise exception 'bad_fips'; end if;
  raise notice 'county_rels_ok';

  if (select count(*) from public.tx_county_product_activation) <> 7 then
    raise exception 'activation_changed'; end if;
  if exists (select 1 from public.tx_county_product_activation where county_fips = '48339') then
    raise exception 'montgomery_active'; end if;
  raise notice 'montgomery_inactive';
  raise notice 'activation_still_seven';

  if (select count(*) from public.local_places where id = cleveland_id) <> 1 then
    raise exception 'cleveland_dup'; end if;
  if not exists (
    select 1 from public.local_place_counties
    where local_place_id = cleveland_id and county_fips = '48291' and is_primary
  ) then raise exception 'cleveland_liberty_primary'; end if;
  if not exists (
    select 1 from public.local_place_counties
    where local_place_id = cleveland_id and county_fips = '48339' and not is_primary
  ) then raise exception 'cleveland_montgomery'; end if;
  if exists (
    select 1 from public.local_place_counties
    where local_place_id = cleveland_id and county_fips not in ('48291', '48339')
  ) then raise exception 'cleveland_extra_county'; end if;
  raise notice 'cleveland_one_uuid';

  select * into r from public.resolve_local_place('48291', 'Liberty');
  if r.local_place_id <> liberty_id then raise exception 'liberty_place'; end if;
  select * into r from public.resolve_local_place('48455', 'Trinity');
  if r.local_place_id <> trinity_id then raise exception 'trinity_place'; end if;
  select count(*) into n from public.resolve_local_place('48291', 'trinity');
  if n <> 0 then raise exception 'cross_county'; end if;
  raise notice 'liberty_collision_safe';
  raise notice 'trinity_collision_safe';

  select * into r from public.resolve_local_place('48407', 'Cold Spring');
  if r.local_place_id <> 'd44ba033-63c7-5d3e-a701-9f07b33b78cd'
    or r.key_class <> 'alias' then raise exception 'cold_spring_alias'; end if;
  raise notice 'coldspring_alias_ok';
end
$$;

select 'idempotent_seed'
where (select count(*) from public.local_places) = 21
  and (select count(*) from public.local_place_counties) = 22;

do $$
begin
  begin
    set local role anon;
    update public.local_places set display_name = 'hacked';
    raise exception 'anon_write_allowed';
  exception
    when insufficient_privilege then null;
    when others then if sqlerrm = 'anon_write_allowed' then raise; end if;
  end;
  reset role;
  raise notice 'anon_write_denied';
  begin
    set local role authenticated;
    delete from public.local_place_counties;
    raise exception 'authenticated_write_allowed';
  exception
    when insufficient_privilege then null;
    when others then if sqlerrm = 'authenticated_write_allowed' then raise; end if;
  end;
  reset role;
  raise notice 'authenticated_write_denied';
end
$$;
