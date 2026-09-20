-- Isolated P1C-1A harness. Not production.
create extension if not exists pgcrypto;
create schema if not exists auth;
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end
$$;
create or replace function auth.role()
returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'authenticated');
$$;
grant usage on schema public to anon, authenticated, service_role;
create table if not exists public.profiles (
  id uuid primary key,
  account_kind text not null default 'consumer',
  account_purpose text not null default 'consumer',
  professional_role text,
  primary_market_city text,
  service_areas text[]
);
insert into public.profiles values
  ('a1111111-1111-1111-1111-111111111111', 'consumer', 'consumer', null, 'Lufkin', array['East Texas']),
  ('b2222222-2222-2222-2222-222222222222', 'agent', 'individual_pro', null, 'Livingston', array['Polk']),
  ('c3333333-3333-3333-3333-333333333333', 'agent', 'individual_pro', null, 'Huntsville', array['Walker']),
  ('d4444444-4444-4444-4444-444444444444', 'broker', 'managing_broker', null, 'Liberty', array['Liberty']),
  ('e5555555-5555-5555-5555-555555555555', 'consumer', 'other_professional', 'inspector', null, null);
