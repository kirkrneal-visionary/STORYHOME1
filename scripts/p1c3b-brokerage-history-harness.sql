-- Isolated P1C-3B proofs. Not production.
\set ON_ERROR_STOP on
create temporary table p1c3b_proofs (name text primary key);
create or replace function pg_temp.ok(n text)
returns void language plpgsql as $$
begin insert into p1c3b_proofs values (n); end; $$;
create or replace function pg_temp.as_server()
returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.role', 'service_role', false); end; $$;
create or replace function pg_temp.as_user(uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.role', 'authenticated', false);
  perform set_config('request.jwt.claim.sub', uid::text, false);
end; $$;

do $$
declare n int; src text; typ text; from_at timestamptz; created timestamptz;
begin
  perform pg_temp.as_server();
  select count(*), min(source), min(relationship_type), min(effective_from)
    into n, src, typ, from_at
    from public.professional_brokerage_relationships
   where professional_id = 'b2222222-2222-2222-2222-222222222222' and status = 'active';
  if n <> 1 or src is distinct from 'reconstructed_current' or typ is distinct from 'sponsored_agent'
     or from_at < now() - interval '1 hour' then
    raise exception 'agent reconstruct';
  end if;
  perform pg_temp.ok('realtor_pointer_reconstructed');
  select relationship_type, source into typ, src
    from public.professional_brokerage_relationships
   where professional_id = 'd4444444-4444-4444-4444-444444444444' and status = 'active';
  if typ is distinct from 'managing_broker_of' or src is distinct from 'reconstructed_current' then
    raise exception 'broker type';
  end if;
  perform pg_temp.ok('managing_broker_classified');
  if exists (
    select 1 from public.professional_brokerage_relationships
     where professional_id in (
       'a1111111-1111-1111-1111-111111111111',
       'e5555555-5555-5555-5555-555555555555',
       'c3333333-3333-3333-3333-333333333333'
     )
  ) then
    raise exception 'ineligible backfill';
  end if;
  perform pg_temp.ok('other_professional_not_backfilled');
  perform pg_temp.ok('consumer_not_backfilled');
  perform pg_temp.ok('null_pointer_no_history');
  n := public.reconstruct_current_brokerage_relationships();
  if n <> 0 then raise exception 'idempotent %', n; end if;
  select count(*), min(effective_from) into n, created
    from public.professional_brokerage_relationships
   where professional_id = 'b2222222-2222-2222-2222-222222222222';
  if n <> 1 or created is distinct from from_at then raise exception 'churn'; end if;
  perform pg_temp.ok('matching_history_unchanged');
  perform pg_temp.ok('backfill_idempotent');
end;
$$;

do $$
declare n int;
begin
  perform pg_temp.as_server();
  insert into public.professional_brokerage_relationships
    (professional_id, brokerage_id, relationship_type, status, source)
  values (
    'c3333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'sponsored_agent', 'active', 'office_accept'
  );
  update public.profiles
     set brokerage_id = '22222222-2222-2222-2222-222222222222'
   where id = 'c3333333-3333-3333-3333-333333333333';
  begin
    perform public.reconstruct_current_brokerage_relationships();
    raise exception 'FAIL mismatch';
  exception when others then
    if sqlerrm ilike '%FAIL mismatch%' then raise; end if;
    if sqlerrm not ilike '%mismatch%' then raise; end if;
  end;
  select count(*) into n from public.professional_brokerage_relationships
   where professional_id = 'c3333333-3333-3333-3333-333333333333' and status = 'active';
  if n <> 1 then raise exception 'mismatch extra'; end if;
  perform pg_temp.ok('mismatch_fails_closed');
  delete from public.professional_brokerage_relationships
   where professional_id = 'c3333333-3333-3333-3333-333333333333';
  update public.profiles set brokerage_id = null
   where id = 'c3333333-3333-3333-3333-333333333333';
end;
$$;

do $$
declare r record; n int;
begin
  perform pg_temp.as_user('b2222222-2222-2222-2222-222222222222');
  select count(*) into n from public.own_brokerage_relationship_history();
  if n <> 1 then raise exception 'own count'; end if;
  select * into r from public.own_brokerage_relationship_history();
  if not r.recorded or not r.is_current or r.brokerage_name is null then
    raise exception 'own shape';
  end if;
  perform pg_temp.ok('own_history_read');
  perform pg_temp.as_user('c3333333-3333-3333-3333-333333333333');
  select count(*) into n from public.own_brokerage_relationship_history();
  if n <> 0 then raise exception 'cross'; end if;
  perform pg_temp.ok('cross_account_empty');
end;
$$;

do $$
begin
  begin
    perform pg_temp.as_user('a1111111-1111-1111-1111-111111111111');
    perform public.own_brokerage_relationship_history();
    raise exception 'FAIL consumer_read';
  exception when others then
    if sqlerrm ilike '%FAIL consumer_read%' then raise; end if;
    if sqlerrm not ilike '%realtor-only%' then raise; end if;
    perform pg_temp.ok('consumer_read_denied');
  end;
  begin
    perform pg_temp.as_user('e5555555-5555-5555-5555-555555555555');
    perform public.own_brokerage_relationship_history();
    raise exception 'FAIL other_read';
  exception when others then
    if sqlerrm ilike '%FAIL other_read%' then raise; end if;
    if sqlerrm not ilike '%realtor-only%' then raise; end if;
    perform pg_temp.ok('other_professional_read_denied');
  end;
  begin
    execute $q$set role authenticated; select public.reconstruct_current_brokerage_relationships()$q$;
    reset role; raise exception 'FAIL client_backfill';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' and sqlerrm not ilike '%service_role%' then raise; end if;
    perform pg_temp.ok('client_backfill_denied');
  end;
  begin
    execute $q$set role anon; select * from public.own_brokerage_relationship_history()$q$;
    reset role; raise exception 'FAIL anon';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' and sqlerrm not ilike '%Sign in%' then raise; end if;
    perform pg_temp.ok('anon_denied');
  end;
end;
$$;
select name from p1c3b_proofs order by name;
