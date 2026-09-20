-- Isolated P1C-4A proofs. Not production.
\set ON_ERROR_STOP on
create temporary table p1c4a_proofs (name text primary key);
create or replace function pg_temp.ok(n text)
returns void language plpgsql as $$
begin insert into p1c4a_proofs values (n); end; $$;
create or replace function pg_temp.as_server()
returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.role', 'service_role', false); end; $$;

do $$
declare r record; n int; first_at timestamptz; city text; areas text[]; purpose text;
begin
  perform pg_temp.as_server();
  select count(*) into n from public.operational_state_own('b2222222-2222-2222-2222-222222222222');
  if n <> 0 then raise exception 'preexisting'; end if;
  perform pg_temp.ok('absence_not_configured');

  select * into r from public.set_operational_availability('a1111111-1111-1111-1111-111111111111', 'available');
  if r.ok then raise exception 'consumer'; end if;
  select * into r from public.set_operational_availability('e5555555-5555-5555-5555-555555555555', 'available');
  if r.ok then raise exception 'other'; end if;
  perform pg_temp.ok('ineligible_denied');

  select * into r from public.set_operational_availability('b2222222-2222-2222-2222-222222222222', 'busy');
  if r.ok or r.error_code is distinct from 'invalid_availability' then raise exception 'invalid'; end if;
  perform pg_temp.ok('invalid_rejected');

  select * into r from public.set_operational_availability('b2222222-2222-2222-2222-222222222222', 'available');
  if not r.ok or r.availability is distinct from 'available' then raise exception 'set available'; end if;
  first_at := r.updated_at;
  select * into r from public.set_operational_availability('b2222222-2222-2222-2222-222222222222', 'available');
  if not r.ok or r.updated_at is distinct from first_at then raise exception 'idempotent'; end if;
  perform pg_temp.ok('individual_set_available');
  perform pg_temp.ok('same_state_idempotent');

  select * into r from public.set_operational_availability(
    'b2222222-2222-2222-2222-222222222222', 'temporarily_unavailable');
  if not r.ok or r.availability is distinct from 'temporarily_unavailable' then
    raise exception 'set paused';
  end if;
  perform pg_temp.ok('individual_set_unavailable');

  select * into r from public.set_operational_availability('d4444444-4444-4444-4444-444444444444', 'available');
  if not r.ok then raise exception 'broker own'; end if;
  perform pg_temp.ok('managing_broker_own');

  select count(*) into n from public.professional_operational_state
   where professional_id = 'c3333333-3333-3333-3333-333333333333';
  if n <> 0 then raise exception 'cross write'; end if;
  perform pg_temp.ok('other_realtor_untouched');

  select account_purpose, primary_market_city, service_areas
    into purpose, city, areas
    from public.profiles where id = 'b2222222-2222-2222-2222-222222222222';
  if purpose is distinct from 'individual_pro' or city is distinct from 'Livingston'
     or areas is distinct from array['Polk'] then
    raise exception 'side effects';
  end if;
  perform pg_temp.ok('profile_unchanged');
end;
$$;

do $$
begin
  begin
    execute $q$set role authenticated; insert into public.professional_operational_state
      (professional_id, availability) values
      ('b2222222-2222-2222-2222-222222222222','available')$q$;
    reset role; raise exception 'FAIL client_table';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' then raise; end if;
    perform pg_temp.ok('direct_table_denied');
  end;
  begin
    execute $q$set role authenticated; select public.set_operational_availability(
      'b2222222-2222-2222-2222-222222222222','available')$q$;
    reset role; raise exception 'FAIL client_rpc';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' and sqlerrm not ilike '%service_role%' then raise; end if;
    perform pg_temp.ok('client_rpc_denied');
  end;
  begin
    execute $q$set role anon; select * from public.operational_state_own(
      'b2222222-2222-2222-2222-222222222222')$q$;
    reset role; raise exception 'FAIL anon';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' and sqlerrm not ilike '%service_role%' then raise; end if;
    perform pg_temp.ok('anon_denied');
  end;
end;
$$;
select name from p1c4a_proofs order by name;
