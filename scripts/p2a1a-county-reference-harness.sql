-- Isolated P2A1A proofs. Not production.
do $$
declare
  n int;
begin
  select count(*) into n from public.tx_counties;
  if n <> 254 then raise exception 'count %', n; end if;
  raise notice 'count_254';
  if exists (select 1 from public.tx_counties where state <> 'TX') then
    raise exception 'non_texas';
  end if;
  select count(*) into n from public.tx_counties
  where county_fips in ('48005','48291','48373','48407','48455','48457','48471');
  if n <> 7 then raise exception 'launch_seven_missing'; end if;
  if not exists (
    select 1 from public.tx_counties
    where county_fips = '48339' and canonical_name = 'Montgomery County'
  ) then
    raise exception 'montgomery_missing';
  end if;
  raise notice 'seed_integrity';
end
$$;

do $$
begin
  begin
    set local role anon;
    insert into public.tx_counties (county_fips, canonical_name)
      values ('48999', 'Fake County');
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
    insert into public.tx_counties (county_fips, canonical_name)
      values ('48998', 'Consumer County');
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
    update public.tx_counties
      set canonical_name = 'Hacked'
      where county_fips = '48373';
    raise exception 'authenticated_update_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'authenticated_update_allowed' then raise; end if;
  end;
  reset role;
  raise notice 'authenticated_update_denied';
end
$$;

select 'service_read_254'
where (select count(*) from public.tx_counties) = 254;
