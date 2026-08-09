-- ---------------------------------------------------------------------------
-- Big phase: account settings + brokerage identity/profile
--
-- Extends profiles (agent/pro public profile fields + persisted TREC
-- verification) and brokerages (self-branded identity: name is already there;
-- add slug, logo, about, location, contact). Adds public read for brokerages so
-- brokerage profile pages work for logged-out visitors.
-- ---------------------------------------------------------------------------

-- --- Brokerage identity (self-named, self-branded — like a HAR office page) ---
alter table public.brokerages add column if not exists slug text;
alter table public.brokerages add column if not exists logo_url text;
alter table public.brokerages add column if not exists about text;
alter table public.brokerages add column if not exists address text;
alter table public.brokerages add column if not exists city text;
alter table public.brokerages add column if not exists state text default 'TX';
alter table public.brokerages add column if not exists zip text;
alter table public.brokerages add column if not exists website text;
alter table public.brokerages add column if not exists phone text;
alter table public.brokerages add column if not exists lat double precision;
alter table public.brokerages add column if not exists lng double precision;

create unique index if not exists brokerages_slug_key
  on public.brokerages (lower(slug)) where slug is not null;

-- --- Professional public-profile + settings fields on profiles ---
alter table public.profiles add column if not exists photo_url text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists specialties text[] not null default '{}';
alter table public.profiles add column if not exists service_areas text[] not null default '{}';
alter table public.profiles add column if not exists languages text[] not null default '{}';
alter table public.profiles add column if not exists designations text[] not null default '{}';
alter table public.profiles add column if not exists socials jsonb not null default '{}'::jsonb;

-- --- Persisted TREC verification (set at signup from user metadata) ---
alter table public.profiles add column if not exists trec_license text;
alter table public.profiles add column if not exists trec_status text;
alter table public.profiles add column if not exists trec_verified_at timestamptz;
alter table public.profiles add column if not exists sponsor_license_number text;
alter table public.profiles add column if not exists sponsor_name text;

-- --- Signup trigger now persists license + TREC verification from metadata ---
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_kind text := coalesce(new.raw_user_meta_data->>'account_kind', 'consumer');
  v_lic  text := nullif(new.raw_user_meta_data->>'trec_license', '');
  v_stat text := nullif(new.raw_user_meta_data->>'trec_status', '');
begin
  insert into public.profiles (
    id, email, full_name, initials, account_kind, professional_role,
    license_number, trec_license, trec_status, trec_verified_at,
    sponsor_license_number, sponsor_name
  )
  values (
    new.id,
    new.email,
    v_name,
    upper(left(v_name, 1)) ||
      upper(coalesce(nullif(split_part(v_name, ' ', 2), ''), '')),
    case when v_kind in ('consumer','agent','broker') then v_kind else 'consumer' end,
    nullif(new.raw_user_meta_data->>'professional_role', ''),
    v_lic,
    v_lic,
    v_stat,
    case when v_stat is not null then now() else null end,
    nullif(new.raw_user_meta_data->>'sponsor_license_number', ''),
    nullif(new.raw_user_meta_data->>'sponsor_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- --- Public read for brokerage profile pages (was authenticated-only) ---
drop policy if exists brokerages_public_read on public.brokerages;
create policy brokerages_public_read on public.brokerages
  for select to anon using (true);

grant select on public.brokerages to anon;
grant select on public.profiles   to anon;
