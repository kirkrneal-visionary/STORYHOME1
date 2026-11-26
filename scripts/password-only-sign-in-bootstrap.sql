-- Isolated password-only sign-in world. Not applied to production.
-- Runs after scripts/p1a1-username-pg-bootstrap.sql and 0058.
create table if not exists auth.mfa_factors (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  factor_type text not null default 'totp',
  status text not null default 'verified'
);

create table if not exists auth.mfa_challenges (
  id uuid primary key,
  factor_id uuid not null references auth.mfa_factors (id) on delete cascade
);

insert into auth.users (id, email_confirmed_at)
values
  ('a1111111-1111-1111-1111-111111111111', now()),
  ('c3333333-3333-3333-3333-333333333333', now()),
  ('d4444444-4444-4444-4444-444444444444', now()),
  ('f6666666-6666-6666-6666-666666666666', null);

select set_config('story.allow_profile_privilege_write', '1', false);
insert into public.profiles (id, account_kind, account_purpose)
values ('f6666666-6666-6666-6666-666666666666', 'agent', 'individual_pro');
select set_config('story.allow_profile_privilege_write', '', false);

insert into auth.mfa_factors (id, user_id)
values
  ('11111111-aaaa-4aaa-8aaa-111111111111', 'c3333333-3333-3333-3333-333333333333'),
  ('22222222-aaaa-4aaa-8aaa-222222222222', 'c3333333-3333-3333-3333-333333333333'),
  ('33333333-aaaa-4aaa-8aaa-333333333333', 'd4444444-4444-4444-4444-444444444444');
insert into auth.mfa_challenges (id, factor_id)
values ('44444444-bbbb-4bbb-8bbb-444444444444', '11111111-aaaa-4aaa-8aaa-111111111111');

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

do $$
declare
  r text;
begin
  r := pg_temp.attempt(
    'c3333333-3333-3333-3333-333333333333',
    $q$update public.profiles set specialties = array['Luxury'] where id = 'c3333333-3333-3333-3333-333333333333'$q$
  );
  if r <> 'Confirm your email and authenticator before Story Pro settings.' then
    raise exception 'before 0088: expected the authenticator block, got %', r;
  end if;
end
$$;
select 'before_0088_pro_without_code_blocked';
