-- Isolated proofs after 0088. Every session below has no authenticator (aal1).
create or replace function pg_temp.attempt(p_uid uuid, p_sql text)
returns text
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, false);
  perform set_config('request.jwt.claim.role', 'authenticated', false);
  perform set_config('request.jwt.claim.aal', 'aal1', false);
  execute p_sql;
  return 'ok';
exception when others then
  return sqlerrm;
end;
$$;

create or replace function pg_temp.expect(p_name text, p_got text, p_want text)
returns text
language plpgsql
as $$
begin
  if p_got is distinct from p_want then
    raise exception '%: expected %, got %', p_name, p_want, p_got;
  end if;
  return p_name;
end;
$$;

select pg_temp.expect(
  'pro_without_code_saves_settings',
  pg_temp.attempt(
    'c3333333-3333-3333-3333-333333333333',
    $q$update public.profiles set specialties = array['Luxury'] where id = 'c3333333-3333-3333-3333-333333333333'$q$
  ),
  'ok'
);
select pg_temp.expect(
  'broker_without_code_saves_settings',
  pg_temp.attempt(
    'd4444444-4444-4444-4444-444444444444',
    $q$update public.profiles set primary_market_city = 'Austin' where id = 'd4444444-4444-4444-4444-444444444444'$q$
  ),
  'ok'
);
select pg_temp.expect(
  'unconfirmed_email_still_blocked',
  pg_temp.attempt(
    'f6666666-6666-6666-6666-666666666666',
    $q$update public.profiles set specialties = array['Luxury'] where id = 'f6666666-6666-6666-6666-666666666666'$q$
  ),
  'Confirm your email before Story Pro settings.'
);
select pg_temp.expect(
  'consumer_still_blocked',
  pg_temp.attempt(
    'a1111111-1111-1111-1111-111111111111',
    $q$update public.profiles set specialties = array['Luxury'] where id = 'a1111111-1111-1111-1111-111111111111'$q$
  ),
  'Story Pro settings cannot be changed on this account.'
);
select pg_temp.expect(
  'purpose_lock_kept',
  pg_temp.attempt(
    'c3333333-3333-3333-3333-333333333333',
    $q$update public.profiles set account_purpose = 'managing_broker' where id = 'c3333333-3333-3333-3333-333333333333'$q$
  ),
  'account_purpose cannot be changed by the client'
);
select pg_temp.expect(
  'username_lock_kept',
  pg_temp.attempt(
    'c3333333-3333-3333-3333-333333333333',
    $q$update public.profiles set username_normalized = 'taken' where id = 'c3333333-3333-3333-3333-333333333333'$q$
  ),
  'username cannot be changed by the client'
);
select pg_temp.expect(
  'insert_lock_kept',
  pg_temp.attempt(
    'b2222222-2222-2222-2222-222222222222',
    $q$insert into public.profiles (id, account_kind, account_purpose) values ('99999999-9999-9999-9999-999999999999', 'broker', 'managing_broker')$q$
  ),
  'account_kind cannot be set by the client'
);

select pg_temp.expect(
  'authenticators_removed',
  (select count(*)::text from auth.mfa_factors),
  '0'
);
select pg_temp.expect(
  'code_challenges_removed',
  (select count(*)::text from auth.mfa_challenges),
  '0'
);
select pg_temp.expect(
  'accounts_kept',
  (select count(*)::text from auth.users),
  '4'
);

-- Leaves one aal policy behind so the runner can prove 0088 reports it.
create table public.aal_probe (id int);
alter table public.aal_probe enable row level security;
create policy aal_probe_needs_code on public.aal_probe
  using ((auth.jwt() ->> 'aal') = 'aal2');
select 'aal_probe_ready';
