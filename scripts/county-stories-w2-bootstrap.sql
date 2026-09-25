-- Isolated County Stories Wave 2 harness. Not production.
create extension if not exists pgcrypto;
create schema if not exists auth;
create schema if not exists storage;
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

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    'authenticated'
  );
$$;

grant usage on schema public to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id text primary key,
  name text,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists public.profiles (
  id uuid primary key,
  account_kind text not null default 'consumer',
  account_purpose text not null default 'consumer',
  professional_role text,
  brokerage_id uuid
);

create table if not exists public.brokerages (
  id uuid primary key
);

create table if not exists public.listings (
  id uuid primary key,
  agent_id uuid references public.profiles (id)
);

insert into public.brokerages (id) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
on conflict do nothing;

insert into public.profiles (
  id, account_kind, account_purpose, professional_role, brokerage_id
) values
  ('a1111111-1111-1111-1111-111111111111', 'consumer', 'consumer', null, null),
  ('b2222222-2222-2222-2222-222222222222', 'agent', 'individual_pro', 'realtor_broker', null),
  ('c3333333-3333-3333-3333-333333333333', 'agent', 'individual_pro', 'realtor_broker', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('d4444444-4444-4444-4444-444444444444', 'broker', 'managing_broker', 'realtor_broker', null),
  ('e5555555-5555-5555-5555-555555555555', 'consumer', 'other_professional', 'inspector', null)
on conflict do nothing;

insert into public.listings (id, agent_id) values
  ('11111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222')
on conflict do nothing;
