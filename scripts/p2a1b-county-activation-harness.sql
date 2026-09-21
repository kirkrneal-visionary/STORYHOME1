-- Isolated P2A1B proofs. Not production.
do $$
declare
  n int;
  extra int;
begin
  select count(*) into n from public.tx_counties;
  if n <> 254 then raise exception 'canonical_count %', n; end if;
  raise notice 'canonical_254';

  select count(*) into n from public.tx_county_product_activation
    where is_active;
  if n <> 7 then raise exception 'active_count %', n; end if;
  raise notice 'active_7';

  if exists (
    select 1 from public.tx_county_product_activation a
    where a.county_fips not in (
      '48005','48291','48373','48407','48455','48457','48471'
    )
  ) then
    raise exception 'extra_active';
  end if;
  raise notice 'launch_seven_only';

  if exists (
    select 1 from public.tx_county_product_activation
    where county_fips = '48339'
  ) then
    raise exception 'montgomery_active';
  end if;
  if not exists (
    select 1 from public.tx_counties
    where county_fips = '48339' and canonical_name = 'Montgomery County'
  ) then
    raise exception 'montgomery_missing';
  end if;
  raise notice 'montgomery_inactive';
end
$$;

insert into public.tx_county_product_activation (county_fips, is_active) values
  ('48005', true),
  ('48291', true),
  ('48373', true),
  ('48407', true),
  ('48455', true),
  ('48457', true),
  ('48471', true)
on conflict (county_fips) do update
  set is_active = excluded.is_active;

do $$
begin
  if (select count(*) from public.tx_county_product_activation) <> 7 then
    raise exception 'idempotent_dup';
  end if;
  raise notice 'activation_idempotent';
end
$$;

do $$
begin
  begin
    insert into public.tx_county_product_activation (county_fips, is_active)
      values ('48999', true);
    raise exception 'unknown_fips_allowed';
  exception
    when foreign_key_violation then null;
    when others then
      if sqlerrm = 'unknown_fips_allowed' then raise; end if;
  end;
  raise notice 'unknown_fips_rejected';
end
$$;

do $$
begin
  begin
    set local role anon;
    insert into public.tx_county_product_activation (county_fips, is_active)
      values ('48113', true);
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
    insert into public.tx_county_product_activation (county_fips, is_active)
      values ('48113', true);
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
    delete from public.tx_county_product_activation where county_fips = '48373';
    raise exception 'authenticated_delete_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'authenticated_delete_allowed' then raise; end if;
  end;
  reset role;
  raise notice 'authenticated_delete_denied';
end
$$;

select 'service_active_7'
where (select count(*) from public.tx_county_product_activation) = 7;
