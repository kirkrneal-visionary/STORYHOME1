-- County Stories Wave 1: authority / schema only.
-- No media bucket, no publish RPC, no consumer UI, no P1C geography bind.
-- Story Slot is the durable business object. Media arrives in later waves.

-- ---------------------------------------------------------------------------
-- Story Day (America/Chicago, 8:00 AM boundary)
-- Production publish (later) must call these with database now(), never a
-- client-submitted clock. The optional timestamp exists for isolated tests.
-- ---------------------------------------------------------------------------
create or replace function public.county_story_day(p_at timestamptz default now())
returns date
language sql
stable
parallel safe
set search_path = public
as $$
  select (timezone('America/Chicago', p_at) - interval '8 hours')::date;
$$;

comment on function public.county_story_day(timestamptz) is
  'County Stories business day. 08:00 America/Chicago boundary. Database clock is authority. TypeScript twins are display/test only.';

create or replace function public.county_story_next_reset(p_at timestamptz default now())
returns timestamptz
language sql
stable
parallel safe
set search_path = public
as $$
  select timezone(
    'America/Chicago',
    ((public.county_story_day(p_at) + 1) + time '08:00')
  );
$$;

comment on function public.county_story_next_reset(timestamptz) is
  'Next 08:00 America/Chicago after p_at. DST-safe. Not a client clock.';

revoke all on function public.county_story_day(timestamptz)
  from public, anon, authenticated;
revoke all on function public.county_story_next_reset(timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_day(timestamptz) to service_role;
grant execute on function public.county_story_next_reset(timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Story-specific County activation (not tx_county_product_activation, not P1C)
-- ---------------------------------------------------------------------------
create table public.county_story_activation (
  county_fips text primary key
    references public.tx_counties (county_fips)
    on delete restrict
    on update restrict,
  is_active boolean not null,
  activated_at timestamptz not null default now(),
  constraint county_story_activation_active_only check (is_active)
);

comment on table public.county_story_activation is
  'County Stories County eligibility. Separate from County profile activation and P1C geography. No row means inactive. Server/service-role only.';

insert into public.county_story_activation (county_fips, is_active) values
  ('48005', true),
  ('48291', true),
  ('48373', true),
  ('48407', true),
  ('48455', true),
  ('48457', true),
  ('48471', true)
on conflict (county_fips) do update
  set is_active = excluded.is_active;

create or replace function public.county_story_county_is_active(p_fips text)
returns boolean
language sql
stable
parallel safe
set search_path = public
as $$
  select exists (
    select 1
      from public.county_story_activation a
     where a.county_fips = p_fips
       and a.is_active
  );
$$;

comment on function public.county_story_county_is_active(text) is
  'County Stories activation only. Montgomery and missing FIPS are inactive.';

revoke all on function public.county_story_county_is_active(text)
  from public, anon, authenticated;
grant execute on function public.county_story_county_is_active(text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Publisher eligibility foundation (not payment, not brokerage_id)
-- ---------------------------------------------------------------------------
create or replace function public.county_story_publisher_eligible(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = p_uid
       and p.account_purpose in ('individual_pro', 'managing_broker')
  );
$$;

comment on function public.county_story_publisher_eligible(uuid) is
  'County Stories publisher foundation. individual_pro and managing_broker only. other_professional is denied. brokerage_id is not required.';

revoke all on function public.county_story_publisher_eligible(uuid)
  from public, anon, authenticated;
grant execute on function public.county_story_publisher_eligible(uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- County/day capacity lock row (counter is advisory; slot uniqueness is safety)
-- ---------------------------------------------------------------------------
create table public.county_story_days (
  county_fips text not null
    references public.tx_counties (county_fips)
    on delete restrict
    on update restrict,
  story_day date not null,
  accepted_count integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (county_fips, story_day),
  constraint county_story_days_count_check
    check (accepted_count >= 0 and accepted_count <= 30)
);

comment on table public.county_story_days is
  'Per County + Story Day lock/count row for the future 30-slot accept transaction. Reconstructable from county_story_slots.';

-- ---------------------------------------------------------------------------
-- Durable Story Slot
-- ---------------------------------------------------------------------------
create table public.county_story_slots (
  id uuid primary key default gen_random_uuid(),
  professional_owner_id uuid not null
    references public.profiles (id)
    on delete restrict
    on update restrict,
  county_fips text not null
    references public.tx_counties (county_fips)
    on delete restrict
    on update restrict,
  story_day date not null,
  slot_number integer not null,
  state text not null,
  story_type text,
  listing_id uuid
    references public.listings (id)
    on delete set null
    on update restrict,
  brokerage_id uuid
    references public.brokerages (id)
    on delete set null
    on update restrict,
  replacement_used boolean not null default false,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint county_story_slots_slot_number_check
    check (slot_number >= 1 and slot_number <= 30),
  constraint county_story_slots_state_check
    check (state in ('accepted', 'hidden', 'expired')),
  constraint county_story_slots_type_check
    check (
      story_type is null
      or story_type in ('local_knowledge', 'open_house_property')
    ),
  constraint county_story_slots_county_day_slot_unique
    unique (county_fips, story_day, slot_number),
  constraint county_story_slots_owner_day_unique
    unique (professional_owner_id, story_day)
);

comment on table public.county_story_slots is
  'Durable County Story slot. One consumed slot per professional per Story Day. listing_id and brokerage_id are optional. Media is temporary and is not stored here.';

comment on column public.county_story_slots.listing_id is
  'Optional Story Home listing. Open House / Property type does not require this.';

comment on column public.county_story_slots.brokerage_id is
  'Optional brokerage snapshot reference. Null does not disqualify a verified broker.';

comment on column public.county_story_slots.story_day is
  'Canonical America/Chicago 08:00 business-day key. Not a substitute for accepted_at.';

create index county_story_slots_county_day_idx
  on public.county_story_slots (county_fips, story_day);

create index county_story_slots_owner_day_idx
  on public.county_story_slots (professional_owner_id, story_day);

-- ---------------------------------------------------------------------------
-- Publish-intent / idempotency foundation
-- ---------------------------------------------------------------------------
create table public.county_story_publish_intents (
  id uuid primary key default gen_random_uuid(),
  professional_owner_id uuid not null
    references public.profiles (id)
    on delete restrict
    on update restrict,
  idempotency_key text not null,
  operation text not null,
  slot_id uuid
    references public.county_story_slots (id)
    on delete set null
    on update restrict,
  result_code text,
  created_at timestamptz not null default now(),
  constraint county_story_publish_intents_key_check
    check (char_length(idempotency_key) between 8 and 128),
  constraint county_story_publish_intents_operation_check
    check (operation in ('publish', 'replace')),
  constraint county_story_publish_intents_owner_key_unique
    unique (professional_owner_id, idempotency_key)
);

comment on table public.county_story_publish_intents is
  'Idempotency foundation for future publish/replace. Same professional + key must replay one result.';

create index county_story_publish_intents_slot_idx
  on public.county_story_publish_intents (slot_id);

-- ---------------------------------------------------------------------------
-- Write guard: service_role + eligible owner + activated County
-- ---------------------------------------------------------------------------
create or replace function public.county_story_authority_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'county stories authority requires service_role'
      using errcode = '42501';
  end if;

  if tg_table_name = 'county_story_activation' then
    return new;
  end if;

  if tg_table_name in ('county_story_days', 'county_story_slots') then
    if not public.county_story_county_is_active(new.county_fips) then
      raise exception 'county_story_county_inactive'
        using errcode = '23514';
    end if;
  end if;

  if tg_table_name = 'county_story_slots' then
    if not public.county_story_publisher_eligible(new.professional_owner_id) then
      raise exception 'county_story_publisher_ineligible'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.county_story_authority_guard() is
  'Wave 1 write guard. Service-role only. Does not read P1C geography or require brokerage_id.';

drop trigger if exists county_story_activation_authority on public.county_story_activation;
create trigger county_story_activation_authority
  before insert or update on public.county_story_activation
  for each row
  execute function public.county_story_authority_guard();

drop trigger if exists county_story_days_authority on public.county_story_days;
create trigger county_story_days_authority
  before insert or update on public.county_story_days
  for each row
  execute function public.county_story_authority_guard();

drop trigger if exists county_story_slots_authority on public.county_story_slots;
create trigger county_story_slots_authority
  before insert or update on public.county_story_slots
  for each row
  execute function public.county_story_authority_guard();

drop trigger if exists county_story_publish_intents_authority
  on public.county_story_publish_intents;
create trigger county_story_publish_intents_authority
  before insert or update on public.county_story_publish_intents
  for each row
  execute function public.county_story_authority_guard();

revoke all on function public.county_story_authority_guard()
  from public, anon, authenticated;
grant execute on function public.county_story_authority_guard()
  to service_role;

-- ---------------------------------------------------------------------------
-- RLS: no client policies. Authenticated/anon cannot create or alter authority.
-- ---------------------------------------------------------------------------
alter table public.county_story_activation enable row level security;
alter table public.county_story_activation force row level security;
alter table public.county_story_days enable row level security;
alter table public.county_story_days force row level security;
alter table public.county_story_slots enable row level security;
alter table public.county_story_slots force row level security;
alter table public.county_story_publish_intents enable row level security;
alter table public.county_story_publish_intents force row level security;

revoke all on table public.county_story_activation
  from public, anon, authenticated;
revoke all on table public.county_story_days
  from public, anon, authenticated;
revoke all on table public.county_story_slots
  from public, anon, authenticated;
revoke all on table public.county_story_publish_intents
  from public, anon, authenticated;

grant all on table public.county_story_activation to service_role;
grant all on table public.county_story_days to service_role;
grant all on table public.county_story_slots to service_role;
grant all on table public.county_story_publish_intents to service_role;
