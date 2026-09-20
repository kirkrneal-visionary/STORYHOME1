-- Isolated P1C-2A proofs. Not production.
\set ON_ERROR_STOP on
create temporary table p1c2a_proofs (name text primary key);
create or replace function pg_temp.ok(n text) returns void language plpgsql as $$
begin insert into p1c2a_proofs values (n); end; $$;
create or replace function pg_temp.as_server() returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.role', 'service_role', false); end; $$;

do $$
declare
  r record; own text[]; n int; city text; areas text[]; primary_n int; ended_id uuid;
begin
  perform pg_temp.as_server();
  select * into r from public.set_service_counties('a1111111-1111-1111-1111-111111111111', array['48373']);
  if r.ok then raise exception 'consumer'; end if;
  select * into r from public.set_service_counties('e5555555-5555-5555-5555-555555555555', array['48373']);
  if r.ok then raise exception 'other'; end if;
  perform pg_temp.ok('ineligible_denied');

  select * into r from public.set_service_counties('b2222222-2222-2222-2222-222222222222', array['48113']);
  if r.ok or r.error_code is distinct from 'invalid_county' then raise exception 'dallas'; end if;
  select * into r from public.set_service_counties('b2222222-2222-2222-2222-222222222222', array['Polk']);
  if r.ok then raise exception 'name'; end if;
  perform pg_temp.ok('invalid_county_denied');

  select * into r from public.request_primary_county('b2222222-2222-2222-2222-222222222222', '48373');
  select count(*) into primary_n from public.professional_primary_counties
   where professional_id = 'b2222222-2222-2222-2222-222222222222';

  select * into r from public.set_service_counties('b2222222-2222-2222-2222-222222222222', array['48373']);
  if not r.ok or r.county_fips <> array['48373'] then raise exception 'one'; end if;
  select * into r from public.set_service_counties('d4444444-4444-4444-4444-444444444444', array['48291','48471']);
  if not r.ok or r.county_fips <> array['48291','48471'] then raise exception 'broker multi'; end if;
  select * into r from public.set_service_counties(
    'b2222222-2222-2222-2222-222222222222',
    array['48373','48455','48005','48457','48407','48291','48471']
  );
  if not r.ok or array_length(r.county_fips, 1) <> 7 then raise exception 'seven'; end if;
  perform pg_temp.ok('eligible_sets');

  select * into r from public.set_service_counties(
    'b2222222-2222-2222-2222-222222222222',
    array['48471','48291','48407','48457','48005','48455','48373']
  );
  select count(*) into n from public.professional_service_counties
   where professional_id = 'b2222222-2222-2222-2222-222222222222' and status = 'ended';
  if not r.ok or n <> 0 then raise exception 'idempotent churn'; end if;
  perform pg_temp.ok('idempotent');

  select * into r from public.set_service_counties('b2222222-2222-2222-2222-222222222222', array['48373','48005']);
  select count(*) into n from public.professional_service_counties
   where professional_id = 'b2222222-2222-2222-2222-222222222222' and status = 'ended';
  if n <> 5 or r.county_fips <> array['48005','48373'] then raise exception 'remove'; end if;
  select id into ended_id from public.professional_service_counties
   where professional_id = 'b2222222-2222-2222-2222-222222222222'
     and county_fips = '48471' and status = 'ended' limit 1;
  select * into r from public.set_service_counties('b2222222-2222-2222-2222-222222222222', array['48373','48005','48471']);
  select count(*) into n from public.professional_service_counties
   where professional_id = 'b2222222-2222-2222-2222-222222222222'
     and county_fips = '48471' and status = 'current';
  if n <> 1 or ended_id is null then raise exception 'readd rewrite'; end if;
  perform pg_temp.ok('history_periods');

  select * into r from public.set_service_counties('b2222222-2222-2222-2222-222222222222', '{}');
  select county_fips into own from public.service_counties_own_state('b2222222-2222-2222-2222-222222222222');
  if not r.ok or own <> '{}' then raise exception 'empty'; end if;
  perform pg_temp.ok('empty_set');

  select count(*) into n from public.professional_primary_counties
   where professional_id = 'b2222222-2222-2222-2222-222222222222';
  select primary_market_city, service_areas into city, areas
    from public.profiles where id = 'b2222222-2222-2222-2222-222222222222';
  if n <> primary_n or city is distinct from 'Livingston' or areas is distinct from array['Polk'] then
    raise exception 'side effects';
  end if;
  perform pg_temp.ok('presentation_and_primary_unchanged');
end;
$$;

do $$
begin
  begin
    execute $q$set role authenticated; select public.set_service_counties(
      'c3333333-3333-3333-3333-333333333333', array['48373'])$q$;
    reset role; raise exception 'FAIL set rpc';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' and sqlerrm not ilike '%service_role%' then raise; end if;
    perform pg_temp.ok('client_cannot_set_rpc');
  end;
  begin
    execute $q$set role authenticated; insert into public.professional_service_counties
      (professional_id, county_fips, status)
      values ('b2222222-2222-2222-2222-222222222222', '48373', 'current')$q$;
    reset role; raise exception 'FAIL table write';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' and sqlerrm not ilike '%service_role%' then raise; end if;
    perform pg_temp.ok('direct_table_write_denied');
  end;
  begin
    execute $q$set role anon; select * from public.service_counties_own_state(
      'b2222222-2222-2222-2222-222222222222')$q$;
    reset role; raise exception 'FAIL anon';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' and sqlerrm not ilike '%service_role%' then raise; end if;
    perform pg_temp.ok('anon_denied');
  end;
end;
$$;
select name from p1c2a_proofs order by name;
