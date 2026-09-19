-- P1A-4 public resolve proofs. Isolated local database. Not production.
\set ON_ERROR_STOP on

create temporary table p1a4_proofs (
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
  insert into p1a4_proofs(name, passed) values (p_name, true);
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
  uid_c uuid := 'c3333333-3333-3333-3333-333333333333';
  uid_e uuid := 'e5555555-5555-5555-5555-555555555555';
begin
  perform pg_temp.as_user(uid_a, 'service_role');
  perform public.claim_username(uid_a, 'alpha');
  perform pg_temp.as_user(null, 'anon');
  select * into r from public.resolve_username('alpha');
  perform pg_temp.record(
    'anon_resolves_active_consumer',
    r.normalized = 'alpha' and r.account_id = uid_a
  );

  perform pg_temp.as_user(null, 'anon');
  select * into r from public.resolve_username('ALPHA');
  perform pg_temp.record(
    'anon_resolves_case_variant',
    r.normalized = 'alpha' and r.account_id = uid_a
  );

  perform pg_temp.as_user(uid_c, 'service_role');
  perform public.claim_username(uid_c, 'sarahpro');
  perform pg_temp.as_user(null, 'anon');
  select * into r from public.resolve_username('sarahpro');
  perform pg_temp.record(
    'anon_resolves_active_professional',
    r.normalized = 'sarahpro' and r.account_id = uid_c
  );

  perform pg_temp.as_user(null, 'anon');
  select count(*) into n from public.resolve_username('unknownname');
  perform pg_temp.record('unknown_empty', n = 0);

  select count(*) into n from public.resolve_username('admin');
  perform pg_temp.record('reserved_empty', n = 0);

  select count(*) into n from public.resolve_username('кирк');
  perform pg_temp.record('unicode_empty', n = 0);

  select count(*) into n from public.resolve_username('bad name');
  perform pg_temp.record('invalid_empty', n = 0);

  perform pg_temp.as_user(uid_a, 'service_role');
  perform public.claim_username(uid_a, 'beta');
  perform pg_temp.as_user(null, 'anon');
  select count(*) into n from public.resolve_username('alpha');
  perform pg_temp.record('changed_old_empty', n = 0);
  select * into r from public.resolve_username('beta');
  perform pg_temp.record(
    'changed_new_active',
    r.normalized = 'beta' and r.account_id = uid_a
  );

  perform pg_temp.as_user(uid_e, 'service_role');
  perform public.claim_username(uid_e, 'goneuser');
  perform pg_temp.as_user(uid_e, 'service_role');
  perform public.tombstone_account_usernames(uid_e);
  perform pg_temp.as_user(null, 'anon');
  select count(*) into n from public.resolve_username('goneuser');
  perform pg_temp.record('deleted_tombstone_empty', n = 0);

  perform pg_temp.record(
    'no_registry_select_for_anon',
    not has_table_privilege('anon', 'public.username_registry', 'select')
  );
end
$$;

select name from p1a4_proofs order by name;
