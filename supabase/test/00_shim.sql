-- LOCAL TEST SHIM ONLY — emulates the pieces Supabase provides in production
-- (the `auth` schema, auth.uid(), and the anon/authenticated roles) so the real
-- migrations can be applied and RLS verified against a plain Postgres.
-- This file is NOT applied to a real Supabase project.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- In production this returns the JWT `sub`. Here it reads a settable GUC so the
-- test harness can impersonate a user.
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('app.uid', true), '')::uuid;
$$;
grant execute on function auth.uid() to public;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

grant usage on schema auth to anon, authenticated, service_role;
