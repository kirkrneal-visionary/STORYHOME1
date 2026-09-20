-- Isolated P1C-5A proofs. Not production.
\set ON_ERROR_STOP on
create temporary table p1c5a_proofs (name text primary key);
create or replace function pg_temp.ok(n text)
returns void language plpgsql as $$
begin insert into p1c5a_proofs values (n); end; $$;
create or replace function pg_temp.as_user(uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.role', 'authenticated', false);
  perform set_config('request.jwt.claim.sub', uid::text, false);
end; $$;
create or replace function pg_temp.as_server()
returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.role', 'service_role', false); end; $$;

do $$
declare r record; n int; ptr uuid; city text; areas text[]; purpose text; first uuid;
begin
  perform pg_temp.as_server();
  select count(*) into n from public.professional_operational_state;
  if n <> 0 then raise exception 'availability backfill'; end if;
  select count(*) into n from public.professional_brokerage_relationships
   where professional_id = 'e5555555-5555-5555-5555-555555555555';
  if n <> 0 then raise exception 'other invented'; end if;
  select count(*) into n from public.professional_brokerage_relationships
   where professional_id = 'c3333333-3333-3333-3333-333333333333';
  if n <> 0 then raise exception 'unattached invented'; end if;
  select count(*) into n from public.professional_brokerage_relationships
   where professional_id = 'b2222222-2222-2222-2222-222222222222' and status = 'active';
  if n <> 1 then raise exception 'realtor reconstruct'; end if;
  perform pg_temp.ok('existing_data_no_invent');

  perform pg_temp.as_user('e5555555-5555-5555-5555-555555555555');
  if public.accept_brokerage_invite('11111111-1111-1111-1111-111111111111') then
    raise exception 'other accepted';
  end if;
  if (select brokerage_id from public.profiles
        where id = 'e5555555-5555-5555-5555-555555555555') is not null then
    raise exception 'other pointer';
  end if;
  perform pg_temp.ok('other_professional_invite_denied');

  perform pg_temp.as_user('c3333333-3333-3333-3333-333333333333');
  if not public.accept_brokerage_invite('11111111-1111-1111-1111-111111111111') then
    raise exception 'realtor accept';
  end if;
  select count(*) into n from public.brokerage_invites
   where agent_license = 'LIC-C' and brokerage_id = '22222222-2222-2222-2222-222222222222'
     and status = 'active';
  if n <> 1 then raise exception 'other invite cleaned'; end if;
  perform pg_temp.ok('realtor_accept_keeps_other_invite');

  if not public.accept_brokerage_invite('22222222-2222-2222-2222-222222222222') then
    raise exception 'switch';
  end if;
  select brokerage_id into ptr from public.profiles
   where id = 'c3333333-3333-3333-3333-333333333333';
  if ptr is distinct from '22222222-2222-2222-2222-222222222222' then
    raise exception 'switch pointer';
  end if;
  select count(*) into n from public.professional_brokerage_relationships
   where professional_id = 'c3333333-3333-3333-3333-333333333333' and status = 'active';
  if n <> 1 then raise exception 'switch two active'; end if;
  perform pg_temp.ok('invite_switch_atomic');

  perform pg_temp.as_user('f6666666-6666-6666-6666-666666666666');
  if not public.open_office_account() then raise exception 'open office'; end if;
  first := public.create_managed_brokerage('First Office');
  if (select brokerage_id from public.profiles
        where id = 'f6666666-6666-6666-6666-666666666666') is distinct from first then
    raise exception 'first create';
  end if;
  begin
    perform public.create_managed_brokerage('Second Office');
    raise exception 'silent overwrite';
  exception when others then
    if sqlerrm not ilike '%Current brokerage already set%' then raise; end if;
  end;
  if (select brokerage_id from public.profiles
        where id = 'f6666666-6666-6666-6666-666666666666') is distinct from first then
    raise exception 'overwrite moved';
  end if;
  perform pg_temp.ok('create_overwrite_blocked');

  perform pg_temp.as_server();
  select * into r from public.request_primary_county(
    'b2222222-2222-2222-2222-222222222222', '48373');
  if not r.ok then raise exception 'request'; end if;
  if exists (
    select 1 from public.professional_primary_counties
     where professional_id = 'b2222222-2222-2222-2222-222222222222'
       and status = 'effective'
  ) then
    raise exception 'request became effective';
  end if;
  select * into r from public.set_service_counties(
    'b2222222-2222-2222-2222-222222222222', array['48455']);
  if not r.ok then raise exception 'service set'; end if;
  select * into r from public.request_primary_county(
    'b2222222-2222-2222-2222-222222222222', 'Houston');
  if r.ok then raise exception 'name fips'; end if;
  select * into r from public.set_service_counties(
    'b2222222-2222-2222-2222-222222222222', array['99999']);
  if r.ok then raise exception 'nonlaunch'; end if;
  select * into r from public.set_operational_availability(
    'b2222222-2222-2222-2222-222222222222', 'ineligible');
  if r.ok then raise exception 'avail invalid'; end if;
  select * into r from public.set_operational_availability(
    'b2222222-2222-2222-2222-222222222222', 'available');
  if not r.ok then raise exception 'avail set'; end if;
  select account_purpose, primary_market_city, service_areas, brokerage_id
    into purpose, city, areas, ptr
    from public.profiles where id = 'b2222222-2222-2222-2222-222222222222';
  if purpose is distinct from 'individual_pro' or city is distinct from 'Livingston'
     or areas is distinct from array['Polk']
     or ptr is distinct from '11111111-1111-1111-1111-111111111111' then
    raise exception 'side effects';
  end if;
  if exists (
    select 1 from public.professional_primary_counties
     where professional_id = 'b2222222-2222-2222-2222-222222222222'
       and status = 'effective'
  ) then
    raise exception 'service wrote primary';
  end if;
  perform pg_temp.ok('facts_stay_separate');
end;
$$;

do $$
begin
  begin
    perform pg_temp.as_user('a1111111-1111-1111-1111-111111111111');
    perform public.own_brokerage_relationship_history();
    raise exception 'FAIL consumer history';
  exception when others then
    if sqlerrm ilike '%FAIL consumer%' then raise; end if;
    perform pg_temp.ok('history_consumer_denied');
  end;
  begin
    perform pg_temp.as_user('e5555555-5555-5555-5555-555555555555');
    perform public.own_brokerage_relationship_history();
    raise exception 'FAIL other history';
  exception when others then
    if sqlerrm ilike '%FAIL other%' then raise; end if;
    perform pg_temp.ok('history_other_denied');
  end;
  begin
    perform set_config('request.jwt.claim.sub', '', false);
    execute $q$set role anon; select public.accept_brokerage_invite(
      '11111111-1111-1111-1111-111111111111')$q$;
    reset role; raise exception 'FAIL anon';
  exception when others then
    reset role;
    if sqlerrm ilike '%FAIL anon%' then raise; end if;
    perform pg_temp.ok('anon_invite_denied');
  end;
end;
$$;
select name from p1c5a_proofs order by name;
