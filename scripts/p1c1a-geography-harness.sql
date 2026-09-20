-- Isolated P1C-1A proofs. Not production.
\set ON_ERROR_STOP on
create temporary table p1c1a_proofs (name text primary key);
create or replace function pg_temp.ok(n text)
returns void language plpgsql as $$
begin insert into p1c1a_proofs values (n); end; $$;
create or replace function pg_temp.as_server()
returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.role', 'service_role', false); end; $$;
create or replace function pg_temp.denied(n text, q text, pat text)
returns void language plpgsql as $$
begin
  begin
    execute q;
    raise exception 'FAIL %', n;
  exception
    when others then
      if sqlerrm ilike '%FAIL %' then raise; end if;
      if sqlerrm not ilike pat then raise exception '% => %', n, sqlerrm; end if;
      perform pg_temp.ok(n);
  end;
end; $$;

do $$
declare
  fips text;
  n int;
  old_id uuid;
  city text;
  areas text[];
begin
  perform pg_temp.as_server();
  foreach fips in array array['48373','48455','48005','48457','48407','48291','48471'] loop
    if not public.is_professional_launch_county_fips(fips) then
      raise exception 'launch fips rejected %', fips;
    end if;
  end loop;
  perform pg_temp.ok('launch_fips_accepted');
  if public.is_professional_launch_county_fips('48113')
     or public.is_professional_launch_county_fips('48201')
     or public.is_professional_launch_county_fips('00000')
     or public.is_professional_launch_county_fips('Polk') then
    raise exception 'bad fips accepted';
  end if;
  perform pg_temp.ok('non_launch_and_text_rejected');

  perform pg_temp.denied(
    'non_launch_write_rejected',
    $q$insert into public.professional_primary_counties
      (professional_id, requested_county_fips, status)
      values ('b2222222-2222-2222-2222-222222222222', '48113', 'requested')$q$,
    '%check%'
  );
  perform pg_temp.denied(
    'free_text_write_rejected',
    $q$insert into public.professional_primary_counties
      (professional_id, requested_county_fips, status)
      values ('b2222222-2222-2222-2222-222222222222', 'Polk', 'requested')$q$,
    '%check%'
  );

  insert into public.professional_primary_counties
    (professional_id, requested_county_fips, status) values
    ('b2222222-2222-2222-2222-222222222222', '48373', 'requested'),
    ('b2222222-2222-2222-2222-222222222222', '48373', 'rejected');
  insert into public.professional_primary_counties
    (professional_id, requested_county_fips, effective_county_fips, status, effective_from)
    values ('b2222222-2222-2222-2222-222222222222', '48373', '48373', 'effective', now())
    returning id into old_id;
  update public.professional_primary_counties
     set status = 'superseded', effective_to = now()
   where id = old_id;
  insert into public.professional_primary_counties
    (professional_id, requested_county_fips, effective_county_fips, status, effective_from, supersedes_id)
    values ('b2222222-2222-2222-2222-222222222222', '48471', '48471', 'effective', now(), old_id);
  select count(*) into n from public.professional_primary_counties
   where professional_id = 'b2222222-2222-2222-2222-222222222222';
  if n <> 4 then raise exception 'history count %', n; end if;
  perform pg_temp.ok('primary_states_and_history');
  perform pg_temp.denied(
    'one_effective_primary',
    $q$insert into public.professional_primary_counties
      (professional_id, requested_county_fips, effective_county_fips, status, effective_from)
      values ('b2222222-2222-2222-2222-222222222222', '48005', '48005', 'effective', now())$q$,
    '%unique%'
  );

  insert into public.professional_service_counties (professional_id, county_fips, status)
    values ('d4444444-4444-4444-4444-444444444444', '48291', 'current');
  insert into public.professional_service_counties
    (professional_id, county_fips, status, effective_to)
    values ('d4444444-4444-4444-4444-444444444444', '48291', 'ended', now());
  perform pg_temp.denied(
    'service_one_current',
    $q$insert into public.professional_service_counties (professional_id, county_fips, status)
      values ('d4444444-4444-4444-4444-444444444444', '48291', 'current')$q$,
    '%unique%'
  );

  perform pg_temp.denied(
    'consumer_write_denied',
    $q$insert into public.professional_primary_counties
      (professional_id, requested_county_fips, status)
      values ('a1111111-1111-1111-1111-111111111111', '48373', 'requested')$q$,
    '%realtor-only%'
  );
  perform pg_temp.denied(
    'other_professional_write_denied',
    $q$insert into public.professional_service_counties (professional_id, county_fips, status)
      values ('e5555555-5555-5555-5555-555555555555', '48373', 'current')$q$,
    '%realtor-only%'
  );

  select primary_market_city, service_areas into city, areas
    from public.profiles where id = 'b2222222-2222-2222-2222-222222222222';
  if city is distinct from 'Livingston' or areas is distinct from array['Polk'] then
    raise exception 'presentation mutated';
  end if;
  perform pg_temp.ok('presentation_fields_unchanged');
end;
$$;

do $$
begin
  begin
    execute $q$set role authenticated; insert into public.professional_primary_counties
      (professional_id, requested_county_fips, status)
      values ('b2222222-2222-2222-2222-222222222222', '48373', 'requested')$q$;
    reset role; raise exception 'FAIL realtor_direct_write_denied';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' then raise; end if;
    perform pg_temp.ok('realtor_direct_write_denied');
  end;
  begin
    execute $q$set role authenticated; insert into public.professional_service_counties
      (professional_id, county_fips, status)
      values ('c3333333-3333-3333-3333-333333333333', '48471', 'current')$q$;
    reset role; raise exception 'FAIL cross_account_write_denied';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' then raise; end if;
    perform pg_temp.ok('cross_account_write_denied');
  end;
  begin
    execute $q$set role anon; select count(*) from public.professional_primary_counties$q$;
    reset role; raise exception 'FAIL anon_read_denied';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' then raise; end if;
    perform pg_temp.ok('anon_read_denied');
  end;
end;
$$;
select name from p1c1a_proofs order by name;
