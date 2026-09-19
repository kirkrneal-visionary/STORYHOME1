-- Isolated P1A-1 harness world. Not applied to production.
create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'authenticated');
$$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'aal', coalesce(nullif(current_setting('request.jwt.claim.aal', true), ''), 'aal1'),
    'role', coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'authenticated'),
    'sub', nullif(current_setting('request.jwt.claim.sub', true), '')
  );
$$;

create table if not exists auth.users (
  id uuid primary key,
  email_confirmed_at timestamptz
);

create table if not exists public.profiles (
  id uuid primary key,
  account_kind text not null default 'consumer',
  account_purpose text not null default 'consumer',
  professional_role text,
  legal_full_name text,
  trec_status text,
  trec_license text,
  license_number text,
  trec_verified_at timestamptz,
  verified_legal_name text,
  verified_license text,
  verified_purpose text,
  verified_account_kind text,
  brokerage_id uuid,
  team_leader_authorized boolean not null default false,
  forced_logout_at timestamptz,
  specialties text[],
  service_areas text[],
  languages text[],
  designations text[],
  primary_market_city text
);

create or replace function public.may_use_story_pro(p_uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
      from public.profiles
     where id = p_uid
       and account_purpose in ('individual_pro', 'managing_broker')
  );
$$;

insert into public.profiles (id, account_kind, account_purpose)
values
  ('a1111111-1111-1111-1111-111111111111', 'consumer', 'consumer'),
  ('b2222222-2222-2222-2222-222222222222', 'consumer', 'consumer'),
  ('c3333333-3333-3333-3333-333333333333', 'agent', 'individual_pro'),
  ('d4444444-4444-4444-4444-444444444444', 'broker', 'managing_broker'),
  ('e5555555-5555-5555-5555-555555555555', 'consumer', 'consumer');
