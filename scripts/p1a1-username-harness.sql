-- P1A-1 behavioral proofs against an isolated local database.
\set ON_ERROR_STOP on

create temporary table p1a1_proofs (
  name text primary key,
  passed boolean not null
);

create or replace function pg_temp.record(p_name text, p_ok boolean)
returns void
language plpgsql
as $$
begin
  if not p_ok then
    raise exception 'FAIL %', p_name;
  end if;
  insert into p1a1_proofs(name, passed) values (p_name, true);
end;
$$;

create or replace function pg_temp.as_user(p_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_id::text, false);
  perform set_config('request.jwt.claim.role', 'authenticated', false);
  perform set_config('request.jwt.claim.aal', 'aal1', false);
end;
$$;

do $$
declare
  r record;
  n int;
  kind text;
  purpose text;
  pro_before boolean;
  pro_after boolean;
begin
  perform pg_temp.as_user('a1111111-1111-1111-1111-111111111111');
  select * into r from public.claim_username('kirkneal');
  perform pg_temp.record('first_claim', r.ok and r.normalized = 'kirkneal');

  select * into r from public.claim_username('KIRKNEAL');
  perform pg_temp.record('idempotent_reclaim', r.ok and r.normalized = 'kirkneal');

  perform pg_temp.as_user('b2222222-2222-2222-2222-222222222222');
  select * into r from public.claim_username('kirkneal');
  perform pg_temp.record('second_account_blocked', r.ok is not true and r.error_code = 'unavailable');

  select * into r from public.claim_username('KirkNeal');
  perform pg_temp.record('case_bypass_blocked', r.ok is not true and r.error_code = 'unavailable');

  select * into r from public.username_inspect('kirkéneal');
  perform pg_temp.record('unicode_rejected', r.status = 'invalid' and r.code = 'bad_chars');

  select * into r from public.username_inspect('kir');
  perform pg_temp.record('min_4_enforced', r.status = 'invalid' and r.code = 'too_short');

  select * into r from public.username_inspect('abcdefghijabcdefghija');
  perform pg_temp.record('max_20_enforced', r.status = 'invalid' and r.code = 'too_long');

  perform pg_temp.as_user('a1111111-1111-1111-1111-111111111111');
  select * into r from public.claim_username('admin');
  perform pg_temp.record('reserved_rejected', r.ok is not true and r.error_code = 'unavailable');

  select * into r from public.username_availability('admin');
  perform pg_temp.record(
    'reserved_unavailable_opaque',
    r.status = 'unavailable' and r.code = 'taken_or_blocked'
  );

  select * into r from public.claim_username('kirkneal2');
  perform pg_temp.record('change_tombstones_old', r.ok and r.normalized = 'kirkneal2');

  select count(*) into n
    from public.username_registry
   where normalized = 'kirkneal' and state = 'tombstoned';
  perform pg_temp.record('old_name_tombstoned', n = 1);

  select count(*) into n
    from public.username_registry
   where account_id = 'a1111111-1111-1111-1111-111111111111'
     and state = 'active';
  perform pg_temp.record('one_active_after_change', n = 1);

  perform pg_temp.as_user('b2222222-2222-2222-2222-222222222222');
  select * into r from public.claim_username('kirkneal');
  perform pg_temp.record('tombstone_not_reclaimable', r.ok is not true and r.error_code = 'unavailable');

  select * into r from public.username_availability('kirkneal');
  perform pg_temp.record(
    'tombstone_unavailable_opaque',
    r.status = 'unavailable' and r.code = 'taken_or_blocked'
  );

  select count(*) into n from public.resolve_username('kirkneal');
  perform pg_temp.record('tombstone_resolve_empty', n = 0);

  perform pg_temp.as_user('a1111111-1111-1111-1111-111111111111');
  select * into r from public.claim_username('kirkneal3');
  perform pg_temp.record('cooldown_enforced', r.ok is not true and r.error_code = 'cooldown');

  update public.username_registry
     set released_at = now() - interval '31 days'
   where account_id = 'a1111111-1111-1111-1111-111111111111'
     and release_reason = 'user_changed';

  select * into r from public.claim_username('kirkneal3');
  perform pg_temp.record('second_change_after_cooldown', r.ok and r.normalized = 'kirkneal3');

  update public.username_registry
     set released_at = now() - interval '40 days'
   where account_id = 'a1111111-1111-1111-1111-111111111111'
     and release_reason = 'user_changed';

  select * into r from public.claim_username('kirkneal4');
  perform pg_temp.record('rolling_12m_cap', r.ok is not true and r.error_code = 'change_limit');

  select count(*) into n
    from public.username_registry
   where account_id = 'a1111111-1111-1111-1111-111111111111'
     and state = 'active';
  perform pg_temp.record('one_active_username', n = 1);

  perform set_config('story.allow_profile_privilege_write', '', true);

  begin
    insert into public.username_registry (
      normalized, display, state, account_id, claimed_at
    ) values (
      'secondactive', 'secondactive', 'active',
      'a1111111-1111-1111-1111-111111111111', now()
    );
    perform pg_temp.record('unique_one_active_index', false);
  exception
    when unique_violation then
      perform pg_temp.record('unique_one_active_index', true);
  end;

  begin
    update public.profiles
       set username_normalized = 'hackedname'
     where id = 'a1111111-1111-1111-1111-111111111111';
    perform pg_temp.record('direct_profile_username_denied', false);
  exception
    when others then
      perform pg_temp.record(
        'direct_profile_username_denied',
        sqlerrm ilike '%username cannot be changed by the client%'
      );
  end;

  select account_kind, account_purpose
    into kind, purpose
    from public.profiles
   where id = 'a1111111-1111-1111-1111-111111111111';
  perform pg_temp.record(
    'consumer_privilege_unchanged',
    kind = 'consumer' and purpose = 'consumer'
    and public.may_use_story_pro('a1111111-1111-1111-1111-111111111111') is not true
  );

  select public.may_use_story_pro('c3333333-3333-3333-3333-333333333333')
    into pro_before;
  perform pg_temp.as_user('c3333333-3333-3333-3333-333333333333');
  select * into r from public.claim_username('storyprouser');
  select public.may_use_story_pro('c3333333-3333-3333-3333-333333333333')
    into pro_after;
  select account_kind, account_purpose
    into kind, purpose
    from public.profiles
   where id = 'c3333333-3333-3333-3333-333333333333';
  perform pg_temp.record(
    'story_pro_privilege_unchanged',
    r.ok and pro_before and pro_after
    and kind = 'agent' and purpose = 'individual_pro'
  );

  select public.may_use_story_pro('d4444444-4444-4444-4444-444444444444')
    into pro_before;
  perform pg_temp.as_user('d4444444-4444-4444-4444-444444444444');
  select * into r from public.claim_username('officeuser');
  select public.may_use_story_pro('d4444444-4444-4444-4444-444444444444')
    into pro_after;
  select account_purpose into purpose
    from public.profiles
   where id = 'd4444444-4444-4444-4444-444444444444';
  perform pg_temp.record(
    'office_privilege_unchanged',
    r.ok and pro_before and pro_after and purpose = 'managing_broker'
  );

  perform pg_temp.as_user('e5555555-5555-5555-5555-555555555555');
  select * into r from public.claim_username('deletemeok');
  perform pg_temp.record('delete_setup_claim', r.ok);
  delete from public.profiles where id = 'e5555555-5555-5555-5555-555555555555';
  select count(*) into n
    from public.username_registry
   where normalized = 'deletemeok'
     and state = 'tombstoned';
  perform pg_temp.record('delete_keeps_tombstone', n = 1);
  perform pg_temp.as_user('b2222222-2222-2222-2222-222222222222');
  select * into r from public.claim_username('deletemeok');
  perform pg_temp.record(
    'deleted_name_not_reclaimable',
    r.ok is not true and r.error_code = 'unavailable'
  );
end;
$$;

do $$
begin
  begin
    execute $q$
      set role authenticated;
      insert into public.username_registry (normalized, display, state)
      values ('hackername', 'hackername', 'reserved');
    $q$;
    reset role;
    perform pg_temp.record('direct_registry_write_denied', false);
  exception
    when insufficient_privilege then
      reset role;
      perform pg_temp.record('direct_registry_write_denied', true);
    when others then
      reset role;
      perform pg_temp.record(
        'direct_registry_write_denied',
        sqlerrm ilike '%permission denied%'
        or sqlerrm ilike '%insufficient%'
        or sqlerrm ilike '%row-level security%'
      );
  end;
end;
$$;

do $$
begin
  begin
    execute $q$
      set role authenticated;
      select public.admin_moderate_username(
        'adminhook', 'reserve', null, 'should fail'
      );
    $q$;
    reset role;
    perform pg_temp.record('admin_hook_not_client', false);
  exception
    when insufficient_privilege then
      reset role;
      perform pg_temp.record('admin_hook_not_client', true);
    when others then
      reset role;
      perform pg_temp.record(
        'admin_hook_not_client',
        sqlerrm ilike '%permission denied%'
        or sqlerrm ilike '%service_role%'
      );
  end;
end;
$$;

select name from p1a1_proofs order by name;
select count(*) as proof_count from p1a1_proofs;
