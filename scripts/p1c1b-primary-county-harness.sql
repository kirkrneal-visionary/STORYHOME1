-- Isolated P1C-1B proofs. Not production.
\set ON_ERROR_STOP on
create temporary table p1c1b_proofs (name text primary key);
create or replace function pg_temp.ok(n text) returns void language plpgsql as $$
begin insert into p1c1b_proofs values (n); end; $$;
create or replace function pg_temp.as_server() returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.role', 'service_role', false); end; $$;

do $$
declare
  r record; s record; n int; req uuid; prior uuid;
begin
  perform pg_temp.as_server();
  select * into r from public.request_primary_county('a1111111-1111-1111-1111-111111111111', '48373');
  if r.ok then raise exception 'consumer'; end if;
  select * into r from public.request_primary_county('e5555555-5555-5555-5555-555555555555', '48373');
  if r.ok then raise exception 'other'; end if;
  perform pg_temp.ok('ineligible_denied');
  select * into r from public.request_primary_county('b2222222-2222-2222-2222-222222222222', '48113');
  if r.ok or r.error_code is distinct from 'invalid_county' then raise exception 'dallas'; end if;
  select * into r from public.request_primary_county('b2222222-2222-2222-2222-222222222222', 'Polk');
  if r.ok then raise exception 'text'; end if;
  perform pg_temp.ok('invalid_county_denied');

  select * into r from public.request_primary_county('b2222222-2222-2222-2222-222222222222', '48373');
  if not r.ok then raise exception 'pro'; end if;
  select * into r from public.request_primary_county('d4444444-4444-4444-4444-444444444444', '48291');
  if not r.ok then raise exception 'broker'; end if;
  select count(*) into n from public.professional_primary_counties
   where professional_id = 'b2222222-2222-2222-2222-222222222222' and status = 'effective';
  if n <> 0 then raise exception 'auto effective'; end if;
  perform pg_temp.ok('eligible_request_not_effective');

  select * into r from public.request_primary_county('b2222222-2222-2222-2222-222222222222', '48373');
  select count(*) into n from public.professional_primary_counties
   where professional_id = 'b2222222-2222-2222-2222-222222222222' and status = 'requested';
  if not r.ok or n <> 1 then raise exception 'idempotent'; end if;
  select id into prior from public.professional_primary_counties
   where professional_id = 'b2222222-2222-2222-2222-222222222222' and status = 'requested';
  select * into r from public.request_primary_county('b2222222-2222-2222-2222-222222222222', '48005');
  select status into s from public.professional_primary_counties where id = prior;
  select count(*) into n from public.professional_primary_counties
   where professional_id = 'b2222222-2222-2222-2222-222222222222' and status = 'requested';
  if not r.ok or n <> 1 or s.status is distinct from 'rejected' then raise exception 'replace'; end if;
  perform pg_temp.ok('pending_rules');

  select id into req from public.professional_primary_counties
   where professional_id = 'b2222222-2222-2222-2222-222222222222' and status = 'requested';
  select * into r from public.decide_primary_county(req, 'approve');
  select * into s from public.primary_county_own_state('b2222222-2222-2222-2222-222222222222');
  if not r.ok or s.effective_county_fips is distinct from '48005' then raise exception 'approve'; end if;
  select * into r from public.request_primary_county('b2222222-2222-2222-2222-222222222222', '48471');
  select * into s from public.primary_county_own_state('b2222222-2222-2222-2222-222222222222');
  if s.effective_county_fips is distinct from '48005' or s.pending_county_fips is distinct from '48471' then
    raise exception 'preserve';
  end if;
  select id into req from public.professional_primary_counties
   where professional_id = 'b2222222-2222-2222-2222-222222222222' and status = 'requested';
  select * into r from public.decide_primary_county(req, 'reject');
  select * into s from public.primary_county_own_state('b2222222-2222-2222-2222-222222222222');
  if s.effective_county_fips is distinct from '48005' or s.pending_county_fips is not null then
    raise exception 'reject mutated';
  end if;
  select * into r from public.decide_primary_county(req, 'approve');
  if r.ok or r.error_code is distinct from 'not_pending' then raise exception 'reapprove'; end if;
  perform pg_temp.ok('approve_reject_preserve');

  select * into r from public.request_primary_county('b2222222-2222-2222-2222-222222222222', '48471');
  select id into req from public.professional_primary_counties
   where professional_id = 'b2222222-2222-2222-2222-222222222222' and status = 'requested';
  select * into r from public.decide_primary_county(req, 'approve');
  select count(*) into n from public.professional_primary_counties
   where professional_id = 'b2222222-2222-2222-2222-222222222222' and status = 'effective';
  if n <> 1 then raise exception 'two effective'; end if;
  select count(*) into n from public.professional_primary_counties
   where professional_id = 'b2222222-2222-2222-2222-222222222222'
     and status = 'superseded' and effective_county_fips = '48005';
  if n <> 1 then raise exception 'no supersede'; end if;
  select * into r from public.decide_primary_county(req, 'reject');
  if r.ok then raise exception 'reject after approve'; end if;
  perform pg_temp.ok('supersede_and_one_effective');

  update public.profiles set account_purpose = 'individual_pro'
   where id = 'c3333333-3333-3333-3333-333333333333';
  select * into r from public.request_primary_county('c3333333-3333-3333-3333-333333333333', '48471');
  select id into req from public.professional_primary_counties
   where professional_id = 'c3333333-3333-3333-3333-333333333333' and status = 'requested';
  update public.profiles set account_purpose = 'consumer'
   where id = 'c3333333-3333-3333-3333-333333333333';
  select * into r from public.decide_primary_county(req, 'approve');
  if r.ok or r.error_code is distinct from 'not_eligible' then raise exception 'purpose loss'; end if;
  perform pg_temp.ok('ineligible_before_approve');
  select * into s from public.primary_county_own_state('d4444444-4444-4444-4444-444444444444');
  if s.pending_county_fips is distinct from '48291' or s.effective_county_fips is not null then
    raise exception 'own state';
  end if;
  perform pg_temp.ok('self_read_bounded');
end;
$$;

do $$
begin
  begin
    execute $q$set role authenticated; select public.decide_primary_county(
      'b2222222-2222-2222-2222-222222222222', 'approve')$q$;
    reset role; raise exception 'FAIL decide';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' and sqlerrm not ilike '%service_role%' then raise; end if;
    perform pg_temp.ok('client_cannot_decide');
  end;
  begin
    execute $q$set role authenticated; select public.request_primary_county(
      'c3333333-3333-3333-3333-333333333333', '48373')$q$;
    reset role; raise exception 'FAIL request';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' and sqlerrm not ilike '%service_role%' then raise; end if;
    perform pg_temp.ok('client_cannot_request_rpc');
  end;
  begin
    execute $q$set role anon; select * from public.primary_county_own_state(
      'b2222222-2222-2222-2222-222222222222')$q$;
    reset role; raise exception 'FAIL anon';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' and sqlerrm not ilike '%service_role%' then raise; end if;
    perform pg_temp.ok('anon_read_denied');
  end;
end;
$$;
select name from p1c1b_proofs order by name;
