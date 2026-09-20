-- Isolated P1C-3A2 addendum. Not production.
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
alter table public.brokerages add column if not exists broker_id uuid;
alter table public.brokerages add column if not exists slug text;
alter table public.brokerages alter column id set default gen_random_uuid();
create unique index if not exists brokerages_slug_key
  on public.brokerages (lower(slug)) where slug is not null;
alter table public.profiles add column if not exists trec_license text;
alter table public.profiles add column if not exists verified_purpose text;
create table if not exists public.brokerage_invites (
  id uuid primary key default gen_random_uuid(),
  brokerage_id uuid not null references public.brokerages(id),
  agent_license text not null,
  status text not null default 'active'
    check (status in ('active','accepted','removed')),
  unique (brokerage_id, agent_license)
);
create or replace function public.is_managing_broker(p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
     where id = p_uid and account_purpose = 'managing_broker'
  );
$$;
create or replace function public.is_broker_of(p_bid uuid, p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_managing_broker(p_uid) and (
    exists (select 1 from public.brokerages b where b.id = p_bid and b.broker_id = p_uid)
    or exists (
      select 1 from public.profiles p
       where p.id = p_uid and p.brokerage_id = p_bid
         and p.account_purpose = 'managing_broker'
    )
  );
$$;
create or replace function public.open_office_account()
returns boolean language plpgsql security definer set search_path = public as $$
declare v_kind text; v_purpose text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select account_kind, account_purpose into v_kind, v_purpose
    from public.profiles where id = auth.uid();
  if v_purpose = 'managing_broker' then return true; end if;
  if v_kind is distinct from 'broker' or v_purpose is distinct from 'individual_pro' then
    raise exception 'Only a Story Pro broker login can become the office account';
  end if;
  update public.profiles
     set account_purpose = 'managing_broker', verified_purpose = 'managing_broker'
   where id = auth.uid();
  return true;
end;
$$;
update public.brokerages set broker_id = 'f6666666-6666-6666-6666-666666666666', slug = 'story-home-realty'
 where id = '11111111-1111-1111-1111-111111111111';
update public.brokerages set broker_id = 'd4444444-4444-4444-4444-444444444444', slug = 'east-texas-office'
 where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set trec_license = 'LIC-B' where id = 'b2222222-2222-2222-2222-222222222222';
update public.profiles set trec_license = 'LIC-C' where id = 'c3333333-3333-3333-3333-333333333333';
update public.profiles set trec_license = 'LIC-E' where id = 'e5555555-5555-5555-5555-555555555555';
insert into public.profiles
  (id, account_kind, account_purpose, professional_role, brokerage_id, primary_market_city, service_areas, sponsor_name, sponsor_license_number, trec_license)
values
  ('f6666666-6666-6666-6666-666666666666', 'broker', 'individual_pro', null, null, 'Lufkin', null, null, null, null),
  ('88888888-8888-8888-8888-888888888888', 'agent', 'individual_pro', null, null, null, null, null, null, 'LIC-H'),
  ('99999999-9999-9999-9999-999999999999', 'agent', 'individual_pro', null, null, null, null, null, null, 'LIC-I');
insert into public.brokerage_invites (brokerage_id, agent_license) values
  ('11111111-1111-1111-1111-111111111111', 'LIC-B'),
  ('22222222-2222-2222-2222-222222222222', 'LIC-B'),
  ('11111111-1111-1111-1111-111111111111', 'LIC-C'),
  ('22222222-2222-2222-2222-222222222222', 'LIC-C'),
  ('11111111-1111-1111-1111-111111111111', 'LIC-E'),
  ('11111111-1111-1111-1111-111111111111', 'LIC-H'),
  ('11111111-1111-1111-1111-111111111111', 'LIC-I'),
  ('22222222-2222-2222-2222-222222222222', 'LIC-I');
