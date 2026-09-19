-- Direct claim_username PostgREST bypass proofs. Isolated local DB. Not production.
\set ON_ERROR_STOP on

create temporary table p1a_claim_rpc_proofs (
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
  insert into p1a_claim_rpc_proofs(name, passed) values (p_name, true);
end;
$$;

create or replace function pg_temp.as_user(p_id uuid, p_role text default 'authenticated')
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_id::text, ''), false);
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
begin
  perform pg_temp.record(
    'old_claim_signature_dropped',
    to_regprocedure('public.claim_username(text)') is null
  );
  perform pg_temp.record(
    'new_claim_signature_present',
    to_regprocedure('public.claim_username(uuid, text)') is not null
  );
  perform pg_temp.record(
    'authenticated_lacks_claim_execute',
    not has_function_privilege(
      'authenticated',
      'public.claim_username(uuid, text)',
      'execute'
    )
  );
  perform pg_temp.record(
    'anon_lacks_claim_execute',
    not has_function_privilege(
      'anon',
      'public.claim_username(uuid, text)',
      'execute'
    )
  );
  perform pg_temp.record(
    'service_role_has_claim_execute',
    has_function_privilege(
      'service_role',
      'public.claim_username(uuid, text)',
      'execute'
    )
  );

  perform pg_temp.as_user(uid_a, 'service_role');
  select * into r from public.claim_username(uid_a, 'httpclaim');
  perform pg_temp.record(
    'server_initial_claim',
    r.ok and r.normalized = 'httpclaim'
  );

  select * into r from public.claim_username(uid_a, 'HTTPCLAIM');
  perform pg_temp.record(
    'server_idempotent_reclaim',
    r.ok and r.normalized = 'httpclaim'
  );

  select * into r from public.claim_username(uid_a, 'httpclaim2');
  perform pg_temp.record(
    'server_valid_change',
    r.ok and r.normalized = 'httpclaim2'
  );

  select * into r from public.claim_username(uid_a, 'httpclaim3');
  perform pg_temp.record('server_cooldown', r.ok is not true and r.error_code = 'cooldown');

  update public.username_registry
     set released_at = now() - interval '31 days'
   where account_id = uid_a
     and release_reason = 'user_changed';

  select * into r from public.claim_username(uid_a, 'httpclaim3');
  perform pg_temp.record(
    'server_change_after_cooldown',
    r.ok and r.normalized = 'httpclaim3'
  );

  update public.username_registry
     set released_at = now() - interval '40 days'
   where account_id = uid_a
     and release_reason = 'user_changed';

  select * into r from public.claim_username(uid_a, 'httpclaim4');
  perform pg_temp.record(
    'server_change_limit',
    r.ok is not true and r.error_code = 'change_limit'
  );

  select * into r from public.claim_username(uid_b, 'httpclaim3');
  perform pg_temp.record(
    'server_unavailable',
    r.ok is not true and r.error_code = 'unavailable'
  );

  perform pg_temp.as_user(uid_a, 'authenticated');
  begin
    select * into r from public.claim_username(uid_a, 'consumerbypass');
    perform pg_temp.record('consumer_jwt_claim_denied', false);
  exception
    when others then
      perform pg_temp.record(
        'consumer_jwt_claim_denied',
        sqlerrm ilike '%service_role%'
      );
  end;

  perform pg_temp.as_user(uid_c, 'authenticated');
  begin
    select * into r from public.claim_username(uid_c, 'probypass');
    perform pg_temp.record('professional_jwt_claim_denied', false);
  exception
    when others then
      perform pg_temp.record(
        'professional_jwt_claim_denied',
        sqlerrm ilike '%service_role%'
      );
  end;

  perform pg_temp.as_user(uid_d, 'authenticated');
  begin
    select * into r from public.claim_username(uid_d, 'officebypass');
    perform pg_temp.record('office_jwt_claim_denied', false);
  exception
    when others then
      perform pg_temp.record(
        'office_jwt_claim_denied',
        sqlerrm ilike '%service_role%'
      );
  end;

  perform pg_temp.record(
    'admin_execute_service_role_only',
    has_function_privilege(
      'service_role',
      'public.admin_moderate_username(text, text, uuid, text)',
      'execute'
    )
    and not has_function_privilege(
      'authenticated',
      'public.admin_moderate_username(text, text, uuid, text)',
      'execute'
    )
  );
  perform pg_temp.record(
    'tombstone_execute_service_role_only',
    has_function_privilege(
      'service_role',
      'public.tombstone_account_usernames(uuid)',
      'execute'
    )
    and not has_function_privilege(
      'authenticated',
      'public.tombstone_account_usernames(uuid)',
      'execute'
    )
  );

  perform pg_temp.as_user(uid_a, 'authenticated');
  begin
    perform public.admin_moderate_username('adminhook', 'reserve', null, 'should fail');
    perform pg_temp.record('authenticated_admin_denied', false);
  exception
    when others then
      perform pg_temp.record(
        'authenticated_admin_denied',
        sqlerrm ilike '%service_role%' or sqlerrm ilike '%permission denied%'
      );
  end;

  perform pg_temp.as_user(uid_a, 'authenticated');
  begin
    perform public.tombstone_account_usernames(uid_a);
    perform pg_temp.record('authenticated_tombstone_denied', false);
  exception
    when others then
      perform pg_temp.record(
        'authenticated_tombstone_denied',
        sqlerrm ilike '%service_role%' or sqlerrm ilike '%permission denied%'
      );
  end;

  perform pg_temp.as_user(uid_a, 'service_role');
  perform public.admin_moderate_username('svclock', 'reserve', null, 'boundary test');
  select count(*) into n
    from public.username_registry
   where normalized = 'svclock' and state = 'reserved';
  perform pg_temp.record('service_role_admin_pass', n = 1);

  select count(*) into n
    from public.username_registry
   where normalized in ('consumerbypass', 'probypass', 'officebypass');
  perform pg_temp.record('bypass_names_not_written', n = 0);
end;
$$;

do $$
begin
  begin
    execute $q$
      set role authenticated;
      select public.claim_username(
        'a1111111-1111-1111-1111-111111111111',
        'consumergrant'
      );
    $q$;
    reset role;
    perform pg_temp.record('consumer_role_claim_denied', false);
  exception
    when others then
      reset role;
      perform pg_temp.record(
        'consumer_role_claim_denied',
        sqlerrm ilike '%permission denied%'
        or sqlerrm ilike '%service_role%'
      );
  end;
end;
$$;

do $$
begin
  begin
    execute $q$
      set role authenticated;
      select public.claim_username(
        'c3333333-3333-3333-3333-333333333333',
        'progrant'
      );
    $q$;
    reset role;
    perform pg_temp.record('professional_role_claim_denied', false);
  exception
    when others then
      reset role;
      perform pg_temp.record(
        'professional_role_claim_denied',
        sqlerrm ilike '%permission denied%'
        or sqlerrm ilike '%service_role%'
      );
  end;
end;
$$;

do $$
begin
  begin
    execute $q$
      set role authenticated;
      select public.claim_username(
        'd4444444-4444-4444-4444-444444444444',
        'officegrant'
      );
    $q$;
    reset role;
    perform pg_temp.record('office_role_claim_denied', false);
  exception
    when others then
      reset role;
      perform pg_temp.record(
        'office_role_claim_denied',
        sqlerrm ilike '%permission denied%'
        or sqlerrm ilike '%service_role%'
      );
  end;
end;
$$;

do $$
begin
  begin
    execute $q$
      set role authenticated;
      insert into public.username_registry (normalized, display, state)
      values ('directdml', 'directdml', 'reserved');
    $q$;
    reset role;
    perform pg_temp.record('direct_registry_dml_denied', false);
  exception
    when others then
      reset role;
      perform pg_temp.record(
        'direct_registry_dml_denied',
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
      select set_config('request.jwt.claim.sub', 'b2222222-2222-2222-2222-222222222222', false);
      select set_config('request.jwt.claim.role', 'service_role', false);
      set role service_role;
      select public.claim_username(
        'b2222222-2222-2222-2222-222222222222',
        'roleclaimok'
      );
    $q$;
    reset role;
    perform pg_temp.record('service_role_grant_can_execute', true);
  exception
    when others then
      reset role;
      perform pg_temp.record('service_role_grant_can_execute', false);
  end;
end;
$$;

select name from p1a_claim_rpc_proofs order by name;
select count(*) as proof_count from p1a_claim_rpc_proofs;
