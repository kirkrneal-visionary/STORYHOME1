-- Wave 2 disposable schema twin.
-- Do not paste this into the live Story Home SQL editor.
-- Never apply against project ksvllgzsnzyahqsjuove.

create schema if not exists auth;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table if not exists public.brokerages (
  id text primary key,
  broker_id uuid not null
);

create table if not exists public.profiles (
  id uuid primary key,
  email text not null,
  account_kind text not null,
  account_purpose text not null,
  brokerage_id text
);

create table if not exists public.shi_farms (
  id text primary key,
  agent_id uuid not null,
  name text not null
);

create table if not exists public.shi_prospects (
  id text primary key,
  agent_id uuid not null,
  label text not null
);

create table if not exists public.shi_study_folders (
  id text primary key,
  owner_id uuid not null,
  name text not null
);

create table if not exists public.shi_market_frames (
  id text primary key,
  owner_id uuid not null,
  folder_id text not null,
  name text not null
);

create table if not exists public.homes (
  id text primary key,
  owner_id uuid not null,
  nickname text not null
);

create table if not exists public.home_documents (
  id text primary key,
  home_id text not null,
  owner_id uuid not null,
  title text not null
);

create table if not exists public.listings (
  id text primary key,
  agent_id uuid not null,
  brokerage_id text,
  status text not null,
  address_serif text not null
);

create table if not exists public.suites (
  id text primary key,
  user_id uuid not null,
  name text not null
);

create table if not exists public.suite_items (
  id text primary key,
  suite_id text not null,
  listing_id text not null
);

create or replace function public.is_managing_broker(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_uid
      and account_purpose = 'managing_broker'
  );
$$;

create or replace function public.is_broker_of(p_bid text, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_managing_broker(p_uid)
    and (
      exists (
        select 1 from public.brokerages b
        where b.id = p_bid and b.broker_id = p_uid
      )
      or exists (
        select 1 from public.profiles p
        where p.id = p_uid
          and p.brokerage_id = p_bid
          and p.account_purpose = 'managing_broker'
      )
    );
$$;

alter table public.shi_farms enable row level security;
alter table public.shi_farms force row level security;
create policy "shi farms agent all" on public.shi_farms
  for all
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

alter table public.shi_prospects enable row level security;
alter table public.shi_prospects force row level security;
create policy "shi prospects agent all" on public.shi_prospects
  for all
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

alter table public.shi_study_folders enable row level security;
alter table public.shi_study_folders force row level security;
create policy "shi folders owner all" on public.shi_study_folders
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

alter table public.shi_market_frames enable row level security;
alter table public.shi_market_frames force row level security;
create policy "shi frames owner all" on public.shi_market_frames
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

alter table public.homes enable row level security;
alter table public.homes force row level security;
create policy homes_select on public.homes
  for select
  using (owner_id = auth.uid());

alter table public.home_documents enable row level security;
alter table public.home_documents force row level security;
create policy home_documents_select on public.home_documents
  for select
  using (owner_id = auth.uid());

alter table public.listings enable row level security;
alter table public.listings force row level security;
create policy listings_read_public on public.listings
  for select using (true);
create policy listings_update_owner_or_broker on public.listings
  for update
  using (agent_id = auth.uid()
         or (brokerage_id is not null and public.is_broker_of(brokerage_id, auth.uid())))
  with check (agent_id = auth.uid()
         or (brokerage_id is not null and public.is_broker_of(brokerage_id, auth.uid())));

alter table public.suites enable row level security;
alter table public.suites force row level security;
create policy suites_all_own on public.suites
  for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.suite_items enable row level security;
alter table public.suite_items force row level security;
create policy suite_items_all_own on public.suite_items
  for all
  using (exists (select 1 from public.suites s
                 where s.id = suite_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.suites s
                 where s.id = suite_id and s.user_id = auth.uid()));
