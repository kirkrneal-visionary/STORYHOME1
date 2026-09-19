-- P1A-2 API hook proofs. Isolated local database. Not production.
\set ON_ERROR_STOP on

create temporary table p1a2_proofs (
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
  insert into p1a2_proofs(name, passed) values (p_name, true);
end;
$$;

create or replace function pg_temp.as_user(p_id uuid, p_role text default 'authenticated')
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_id::text, false);
  perform set_config('request.jwt.claim.role', p_role, false);
  perform set_config('request.jwt.claim.aal', 'aal1', false);
end;
$$;

do $$
declare
  r record;
  n int;
  uid_a uuid := 'a1111111-1111-1111-1111-111111111111';
  uid_b uuid := 'b2222222-2222-2222-2222-222222222222';
  uid_c uuid := 'c3333333-3333-3333-3333-333333333333';
  uid_d uuid := 'd4444444-4444-4444-4444-444444444444';
  uid_e uuid := 'e5555555-5555-5555-5555-555555555555';
begin
  perform pg_temp.as_user(uid_a);
  select * into r from public.username_availability('freshname');
  perform pg_temp.record('avail_fresh', r.status = 'available' and r.normalized = 'freshname');

  perform pg_temp.as_user(uid_a);
  perform public.claim_username('freshname');
  select * into r from public.username_availability('freshname');
  perform pg_temp.record(
    'avail_active_opaque',
    r.status = 'unavailable' and r.code = 'taken_or_blocked'
  );
  select * into r from public.username_availability('admin');
  perform pg_temp.record(
    'avail_reserved_opaque',
    r.status = 'unavailable' and r.code = 'taken_or_blocked'
  );
  select * into r from public.username_availability('@FreshName');
  perform pg_temp.record(
    'avail_case_at',
    r.status = 'unavailable' and r.normalized = 'freshname'
  );

  perform pg_temp.as_user(uid_b);
  perform public.claim_username('oldlabel');
  perform pg_temp.as_user(uid_b, 'service_role');
  perform public.tombstone_account_usernames(uid_b);
  select * into r from public.username_availability('oldlabel');
  perform pg_temp.record(
    'avail_tombstone_opaque',
    r.status = 'unavailable' and r.code = 'taken_or_blocked'
  );

  perform pg_temp.as_user(uid_e);
  perform public.claim_username('deletehook');
  perform pg_temp.as_user(uid_e, 'service_role');
  n := public.tombstone_account_usernames(uid_e);
  perform pg_temp.record('delete_hook_count', n = 1);
  select count(*) into n
    from public.username_registry
   where normalized = 'deletehook' and state = 'tombstoned';
  perform pg_temp.record('delete_hook_tombstone', n = 1);
  select count(*) into n
    from public.profiles
   where id = uid_e and username_normalized is null;
  perform pg_temp.record('delete_hook_clears_pointer', n = 1);

  delete from public.profiles where id = uid_e;
  select count(*) into n
    from public.username_registry
   where normalized = 'deletehook';
  perform pg_temp.record('delete_hook_survives_profile', n = 1);
  select count(*) into n
    from public.username_registry
   where normalized = 'deletehook' and account_id is null;
  perform pg_temp.record('delete_hook_account_id_nulled', n = 1);

  perform pg_temp.as_user(uid_b);
  select * into r from public.username_availability('deletehook');
  perform pg_temp.record(
    'deleted_still_unavailable',
    r.status = 'unavailable' and r.code = 'taken_or_blocked'
  );
  select * into r from public.claim_username('deletehook');
  perform pg_temp.record('deleted_still_unclaimable', r.ok is not true);

  perform pg_temp.as_user(uid_a);
  select * into r from public.username_own_mutation_state();
  perform pg_temp.record(
    'own_state_no_other_account',
    r.active_normalized = 'freshname'
    and r.cooldown_until is null
  );

  perform pg_temp.as_user(uid_c);
  begin
    perform public.tombstone_account_usernames(uid_a);
    perform pg_temp.record('pro_cannot_tombstone_rpc', false);
  exception
    when others then
      perform pg_temp.record(
        'pro_cannot_tombstone_rpc',
        sqlerrm ilike '%service_role%'
      );
  end;

  perform pg_temp.as_user(uid_d);
  begin
    perform public.admin_moderate_username('adminhook', 'reserve', null, 'office try');
    perform pg_temp.record('office_cannot_admin', false);
  exception
    when others then
      perform pg_temp.record(
        'office_cannot_admin',
        sqlerrm ilike '%service_role%'
      );
  end;

  perform pg_temp.as_user(uid_a);
  begin
    perform public.admin_moderate_username('adminhook', 'reserve', null, 'consumer try');
    perform pg_temp.record('consumer_cannot_admin', false);
  exception
    when others then
      perform pg_temp.record(
        'consumer_cannot_admin',
        sqlerrm ilike '%service_role%'
      );
  end;

  perform pg_temp.as_user(uid_a, 'service_role');
  perform public.admin_moderate_username('svcreserve', 'reserve', null, 'controlled test');
  select count(*) into n
    from public.username_registry
   where normalized = 'svcreserve' and state = 'reserved';
  perform pg_temp.record('service_role_can_admin', n = 1);
end;
$$;

do $$
begin
  begin
    execute $q$
      set role authenticated;
      select public.tombstone_account_usernames('a1111111-1111-1111-1111-111111111111');
    $q$;
    reset role;
    perform pg_temp.record('auth_role_cannot_tombstone', false);
  exception
    when others then
      reset role;
      perform pg_temp.record(
        'auth_role_cannot_tombstone',
        sqlerrm ilike '%permission denied%'
        or sqlerrm ilike '%service_role%'
      );
  end;
end;
$$;

select name from p1a2_proofs order by name;
select count(*) as proof_count from p1a2_proofs;
