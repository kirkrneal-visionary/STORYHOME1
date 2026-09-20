-- Isolated P1C-3A2 proofs. Not production.
\set ON_ERROR_STOP on
create temporary table p1c3a2_proofs (name text primary key);
create or replace function pg_temp.ok(n text)
returns void language plpgsql as $$
begin insert into p1c3a2_proofs values (n); end; $$;
create or replace function pg_temp.as_user(uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.role', 'authenticated', false);
  perform set_config('request.jwt.claim.sub', uid::text, false);
end; $$;
create or replace function pg_temp.consistent(n text, uid uuid)
returns void language plpgsql as $$
declare ptr uuid; act int; bid uuid; purpose text;
begin
  select brokerage_id, account_purpose into ptr, purpose from public.profiles where id = uid;
  select count(*) into act
    from public.professional_brokerage_relationships
   where professional_id = uid and status = 'active';
  select brokerage_id into bid
    from public.professional_brokerage_relationships
   where professional_id = uid and status = 'active';
  if act > 1 then raise exception '% two active', n; end if;
  if purpose not in ('individual_pro', 'managing_broker') then
    if act <> 0 then raise exception '% other history', n; end if;
    perform pg_temp.ok(n); return;
  end if;
  if ptr is null and act <> 0 then raise exception '% null+active', n; end if;
  if ptr is not null and (act <> 1 or bid is distinct from ptr) then
    raise exception '% pointer/history', n;
  end if;
  perform pg_temp.ok(n);
end; $$;

do $$
declare
  okb boolean; n int; src text; from_at timestamptz; ended_id uuid; new_id uuid; from2 timestamptz;
begin
  perform pg_temp.as_user('f6666666-6666-6666-6666-666666666666');
  if not public.open_office_account() then raise exception 'open office'; end if;
  select count(*) into n from public.professional_brokerage_relationships
   where professional_id = 'f6666666-6666-6666-6666-666666666666';
  if n <> 0 then raise exception 'open office history'; end if;
  perform pg_temp.ok('open_office_no_history');

  perform pg_temp.as_user('b2222222-2222-2222-2222-222222222222');
  select count(*) into n from public.professional_brokerage_relationships
   where professional_id = 'b2222222-2222-2222-2222-222222222222';
  if n <> 0 then raise exception 'preexisting history'; end if;
  if not public.accept_brokerage_invite('11111111-1111-1111-1111-111111111111') then
    raise exception 'transitional accept';
  end if;
  select count(*) into n from public.professional_brokerage_relationships
   where professional_id = 'b2222222-2222-2222-2222-222222222222' and status = 'ended';
  if n <> 0 then raise exception 'fabricated end'; end if;
  select source, effective_from into src, from_at
    from public.professional_brokerage_relationships
   where professional_id = 'b2222222-2222-2222-2222-222222222222' and status = 'active';
  if src is distinct from 'office_accept' then raise exception 'source'; end if;
  if (select brokerage_id from public.profiles
        where id = 'b2222222-2222-2222-2222-222222222222')
       is distinct from '11111111-1111-1111-1111-111111111111' then
    raise exception 'pointer';
  end if;
  if (select status from public.brokerage_invites
        where brokerage_id = '11111111-1111-1111-1111-111111111111'
          and agent_license = 'LIC-B') is distinct from 'accepted' then
    raise exception 'invite';
  end if;
  perform pg_temp.ok('accept_creates_sponsored_active');
  perform pg_temp.ok('transitional_pointer_no_fabricated_end');
  perform pg_temp.consistent('pointer_matches_history', 'b2222222-2222-2222-2222-222222222222');

  update public.brokerage_invites set status = 'active'
   where brokerage_id = '11111111-1111-1111-1111-111111111111' and agent_license = 'LIC-B';
  if not public.accept_brokerage_invite('11111111-1111-1111-1111-111111111111') then
    raise exception 'idempotent accept';
  end if;
  select count(*), min(effective_from) into n, from2
    from public.professional_brokerage_relationships
   where professional_id = 'b2222222-2222-2222-2222-222222222222';
  if n <> 1 or from2 is distinct from from_at then raise exception 'idempotent churn'; end if;
  perform pg_temp.ok('same_brokerage_idempotent');

  perform pg_temp.as_user('c3333333-3333-3333-3333-333333333333');
  if not public.accept_brokerage_invite('11111111-1111-1111-1111-111111111111') then
    raise exception 'c accept 1';
  end if;
  if (select status from public.brokerage_invites
        where brokerage_id = '22222222-2222-2222-2222-222222222222'
          and agent_license = 'LIC-C') is distinct from 'active' then
    raise exception 'other invite cleared';
  end if;
  select count(*) into n from public.professional_brokerage_relationships
   where professional_id = 'c3333333-3333-3333-3333-333333333333' and status = 'active';
  if n <> 1 then raise exception 'second active after first accept'; end if;
  perform pg_temp.ok('other_invites_remain_active');
  if not public.accept_brokerage_invite('22222222-2222-2222-2222-222222222222') then
    raise exception 'c accept 2';
  end if;
  select id, source into ended_id, src
    from public.professional_brokerage_relationships
   where professional_id = 'c3333333-3333-3333-3333-333333333333'
     and brokerage_id = '11111111-1111-1111-1111-111111111111' and status = 'ended';
  if ended_id is null or src is distinct from 'office_accept' then
    raise exception 'old history';
  end if;
  if (select relationship_type from public.professional_brokerage_relationships
        where professional_id = 'c3333333-3333-3333-3333-333333333333'
          and status = 'active') is distinct from 'sponsored_agent' then
    raise exception 'switch type';
  end if;
  perform pg_temp.ok('brokerage_switch');
  perform pg_temp.ok('old_history_retained');
  perform pg_temp.consistent('no_second_active', 'c3333333-3333-3333-3333-333333333333');

  perform pg_temp.as_user('f6666666-6666-6666-6666-666666666666');
  if public.remove_agent_from_brokerage('c3333333-3333-3333-3333-333333333333') then
    raise exception 'stale remove';
  end if;
  if (select brokerage_id from public.profiles
        where id = 'c3333333-3333-3333-3333-333333333333')
       is distinct from '22222222-2222-2222-2222-222222222222' then
    raise exception 'stale cleared';
  end if;
  perform pg_temp.ok('stale_remove_denied');

  perform pg_temp.as_user('d4444444-4444-4444-4444-444444444444');
  if not public.remove_agent_from_brokerage('c3333333-3333-3333-3333-333333333333') then
    raise exception 'remove';
  end if;
  if (select brokerage_id from public.profiles
        where id = 'c3333333-3333-3333-3333-333333333333') is not null then
    raise exception 'pointer not cleared';
  end if;
  if (select status from public.brokerage_invites
        where brokerage_id = '22222222-2222-2222-2222-222222222222'
          and agent_license = 'LIC-C') is distinct from 'removed' then
    raise exception 'invite not removed';
  end if;
  if (select effective_end is null from public.professional_brokerage_relationships
        where id = ended_id) then
    raise exception 'ended row mutated';
  end if;
  if (select status from public.professional_brokerage_relationships
        where professional_id = 'c3333333-3333-3333-3333-333333333333'
          and brokerage_id = '22222222-2222-2222-2222-222222222222')
       is distinct from 'ended' then
    raise exception 'remove status';
  end if;
  perform pg_temp.ok('office_remove_ends');
  perform pg_temp.consistent('remove_consistent', 'c3333333-3333-3333-3333-333333333333');
  if public.remove_agent_from_brokerage('c3333333-3333-3333-3333-333333333333') then
    raise exception 'dup remove';
  end if;
  perform pg_temp.ok('duplicate_remove_safe');

  select count(*) into n from public.professional_brokerage_relationships
   where professional_id = 'd4444444-4444-4444-4444-444444444444';
  if n <> 0 then raise exception 'broker preexisting history'; end if;
  new_id := public.create_managed_brokerage('New Office');
  if (select brokerage_id from public.profiles
        where id = 'd4444444-4444-4444-4444-444444444444') is distinct from new_id then
    raise exception 'create pointer';
  end if;
  if (select relationship_type || status || source
        from public.professional_brokerage_relationships
       where professional_id = 'd4444444-4444-4444-4444-444444444444'
         and status = 'active') is distinct from 'managing_broker_ofactivecreate_office' then
    raise exception 'create history';
  end if;
  perform pg_temp.ok('create_managed_sets_history');
  perform pg_temp.consistent('create_consistent', 'd4444444-4444-4444-4444-444444444444');
  perform public.create_managed_brokerage('Second Office');
  select count(*) into n from public.professional_brokerage_relationships
   where professional_id = 'd4444444-4444-4444-4444-444444444444' and status = 'ended';
  if n <> 1 then raise exception 'create transition'; end if;
  perform pg_temp.ok('create_transitions_existing');
  perform pg_temp.consistent('create_transition_consistent', 'd4444444-4444-4444-4444-444444444444');

  begin
    perform pg_temp.as_user('a1111111-1111-1111-1111-111111111111');
    perform public.create_managed_brokerage('Nope');
    raise exception 'consumer create';
  exception when others then
    if sqlerrm not ilike '%Managing broker required%' then raise; end if;
  end;
  begin
    perform pg_temp.as_user('d4444444-4444-4444-4444-444444444444');
    perform public.create_managed_brokerage('  ');
    raise exception 'blank name';
  exception when others then
    if sqlerrm not ilike '%Name required%' then raise; end if;
  end;
  perform pg_temp.ok('create_preconditions');

  update public.profiles
     set sponsor_name = 'TREC Only', sponsor_license_number = '999999'
   where id = 'b2222222-2222-2222-2222-222222222222';
  select count(*) into n from public.professional_brokerage_relationships
   where professional_id = 'b2222222-2222-2222-2222-222222222222';
  if n <> 1 then raise exception 'trec history'; end if;
  perform pg_temp.ok('trec_sponsor_no_history');

  perform pg_temp.as_user('e5555555-5555-5555-5555-555555555555');
  if not public.accept_brokerage_invite('11111111-1111-1111-1111-111111111111') then
    raise exception 'other accept';
  end if;
  select count(*) into n from public.professional_brokerage_relationships
   where professional_id = 'e5555555-5555-5555-5555-555555555555';
  if n <> 0 then raise exception 'other history write'; end if;
  perform pg_temp.ok('other_professional_no_history');
end;
$$;

create function pg_temp.boom() returns trigger language plpgsql as $$
begin
  if new.professional_id = '88888888-8888-8888-8888-888888888888' then
    raise exception 'forced history fail';
  end if;
  return new;
end; $$;

do $$
begin
  execute 'create trigger p1c3a2_boom before insert on public.professional_brokerage_relationships for each row execute function pg_temp.boom()';
  begin
    perform pg_temp.as_user('88888888-8888-8888-8888-888888888888');
    perform public.accept_brokerage_invite('11111111-1111-1111-1111-111111111111');
    raise exception 'FAIL atomic';
  exception when others then
    if sqlerrm ilike '%FAIL atomic%' then raise; end if;
    if sqlerrm not ilike '%forced history fail%' then raise; end if;
  end;
  execute 'drop trigger p1c3a2_boom on public.professional_brokerage_relationships';
  if (select brokerage_id from public.profiles
        where id = '88888888-8888-8888-8888-888888888888') is not null then
    raise exception 'atomic pointer';
  end if;
  if (select status from public.brokerage_invites
        where agent_license = 'LIC-H') is distinct from 'active' then
    raise exception 'atomic invite';
  end if;
  if exists (
    select 1 from public.professional_brokerage_relationships
     where professional_id = '88888888-8888-8888-8888-888888888888'
  ) then
    raise exception 'atomic history';
  end if;
  perform pg_temp.ok('transaction_atomic');
end;
$$;

do $$
begin
  begin
    execute $q$set role authenticated; insert into public.professional_brokerage_relationships
      (professional_id, brokerage_id, relationship_type, status) values
      ('b2222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222','sponsored_agent','ended')$q$;
    reset role; raise exception 'FAIL professional_dml_denied';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' then raise; end if;
    perform pg_temp.ok('professional_dml_denied');
  end;
  begin
    execute $q$set role authenticated; insert into public.professional_brokerage_relationships
      (professional_id, brokerage_id, relationship_type, status) values
      ('a1111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','sponsored_agent','active')$q$;
    reset role; raise exception 'FAIL consumer_dml_denied';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' then raise; end if;
    perform pg_temp.ok('consumer_dml_denied');
  end;
  begin
    execute $q$set role authenticated; select public.sync_brokerage_relationship(
      'b2222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111',
      'sponsored_agent','office_accept','b2222222-2222-2222-2222-222222222222')$q$;
    reset role; raise exception 'FAIL helper_not_client_callable';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' then raise; end if;
    perform pg_temp.ok('helper_not_client_callable');
  end;
  begin
    execute $q$set role anon; select count(*) from public.professional_brokerage_relationships$q$;
    reset role; raise exception 'FAIL anon_denied';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' then raise; end if;
    perform pg_temp.ok('anon_denied');
  end;
end;
$$;
select name from p1c3a2_proofs order by name;
