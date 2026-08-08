-- Story Home — Backend foundation (schema + helpers + triggers)
-- Phase: activate Supabase. One canonical schema for every blueprint entity.
-- Apply order: 0001_init.sql, then 0002_rls.sql, then (optional) ../seed.sql
--
-- Notes:
--  * profiles.id == auth.users.id (Supabase Auth is the identity source of truth).
--  * A property is a single `listings` row. The "ProListing" (agent-editable
--    view) is the same row exposed to its owning agent via extra columns +
--    owner-scoped RLS — one source of truth, not two tables.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Org: brokerages, profiles (users), teams
-- ---------------------------------------------------------------------------

create table if not exists public.brokerages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  broker_license text,
  -- Broker of Record (owning profile). Nullable at bootstrap to break the
  -- circular FK with profiles; set once the broker profile exists.
  broker_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null default '',
  initials text not null default '',
  account_kind text not null default 'consumer'
    check (account_kind in ('consumer','agent','broker')),
  professional_role text
    check (professional_role in ('realtor_broker','inspector','appraiser','lender')),
  brokerage_id uuid references public.brokerages(id) on delete set null,
  credential text,
  license_number text,
  team_leader_authorized boolean not null default false,
  primary_market_city text,
  bio text,
  avatar_url text,
  -- Reputation is deferred/non-functional for now; kept for a later page.
  reputation_score int,
  star_rating numeric(3,2),
  review_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.brokerages
  add constraint brokerages_broker_fk
  foreign key (broker_id) references public.profiles(id) on delete set null;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  brokerage_id uuid not null references public.brokerages(id) on delete cascade,
  name text not null,
  leader_id uuid not null references public.profiles(id) on delete cascade,
  authorized boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, member_id)
);

-- ---------------------------------------------------------------------------
-- Marketplace: listings (+ pro/editable fields), analytics, engagement
-- ---------------------------------------------------------------------------

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  brokerage_id uuid references public.brokerages(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  mls_number text,
  price numeric(12,2) not null,
  address_serif text not null,
  city text not null,
  county_name text not null,
  county_fips text,
  state text not null default 'TX',
  zip text,
  beds int not null default 0,
  baths numeric(3,1) not null default 0,
  sqft int not null default 0,
  acres numeric(10,2) not null default 0,
  lot_size text,
  year_built int,
  description text not null default '',
  property_type text
    check (property_type in ('Single Family','Farm and Ranch','Condo','Town Home')),
  status text not null default 'Active'
    check (status in (
      'Active','Option Pending Continue to Show','Option Pending',
      'Under Contract','Terminated','Withdrawn','Expired','Sold')),
  has_office boolean not null default false,
  has_garage boolean not null default false,
  has_pool boolean not null default false,
  has_hoa boolean not null default false,
  photo_urls text[] not null default '{}',
  lat double precision,
  lng double precision,
  -- Pro/editable + compliance fields
  listing_agent_name text,
  listing_agent_license text,
  brokerage_name text,
  lead_paint_disclosure_provided boolean not null default false,
  sellers_disclosure_provided boolean not null default false,
  -- Seller-portal passcode (auto-generated when published)
  seller_access_code text unique,
  days_on_market int not null default 0,
  like_count int not null default 0,
  save_count int not null default 0,
  comment_count int not null default 0
);

create index if not exists listings_agent_idx on public.listings (agent_id);
create index if not exists listings_status_idx on public.listings (status);
create index if not exists listings_county_idx on public.listings (county_name);

-- Aggregate analytics shown in the seller portal
create table if not exists public.listing_analytics (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  views int not null default 0,
  clicks int not null default 0,
  saves int not null default 0,
  repeat_viewers int not null default 0,
  avg_time_viewed_seconds int not null default 0,
  views_this_week int not null default 0,
  saves_this_week int not null default 0,
  updated_at timestamptz not null default now()
);

-- Raw event stream (MLS-era pipeline)
create table if not exists public.listing_analytics_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  event_type text not null check (event_type in ('view','click','save','unsave')),
  session_id text,
  viewer_fingerprint text,
  duration_seconds int,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_idx
  on public.listing_analytics_events (listing_id, event_type, created_at desc);

create table if not exists public.listing_comments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Consumer: suites (albums), suite items, follows, messages
-- ---------------------------------------------------------------------------

create table if not exists public.suites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  cover_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.suite_items (
  id uuid primary key default gen_random_uuid(),
  suite_id uuid not null references public.suites(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (suite_id, listing_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, agent_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  message_text text not null,
  attached_listing_id uuid references public.listings(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_participants_idx
  on public.messages (sender_id, receiver_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Pro CRM: buyers, seller clients, referrals
-- ---------------------------------------------------------------------------

create table if not exists public.buyers (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  stage text not null default 'New lead',
  budget_min numeric(12,2) not null default 0,
  budget_max numeric(12,2) not null default 0,
  target_areas text[] not null default '{}',
  min_beds int not null default 0,
  property_type text,
  pre_approved boolean not null default false,
  note text,
  last_activity text,
  created_at timestamptz not null default now()
);
create index if not exists buyers_agent_idx on public.buyers (agent_id);

create table if not exists public.seller_clients (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  stage text not null default 'Prospect',
  listing_id uuid references public.listings(id) on delete set null,
  list_price numeric(12,2) not null default 0,
  days_on_market int not null default 0,
  access_code text,
  next_action text,
  last_activity text,
  created_at timestamptz not null default now()
);
create index if not exists seller_clients_agent_idx on public.seller_clients (agent_id);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles(id) on delete cascade,
  claimer_id uuid references public.profiles(id) on delete set null,
  status text not null default 'Open' check (status in ('Open','Claimed','Closed')),
  client_description text not null,
  target_market text not null,
  budget_range text not null,
  terms text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Leads: inquiries + claims (15-minute routing)
-- ---------------------------------------------------------------------------

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  created_at timestamptz not null default now()
);
create index if not exists inquiries_agent_idx on public.inquiries (agent_id);
create index if not exists inquiries_consumer_idx on public.inquiries (consumer_id);

create table if not exists public.lead_claims (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  unique (consumer_id)
);

-- ---------------------------------------------------------------------------
-- Community: channels, threads, posts, library folders, Q&A
-- ---------------------------------------------------------------------------

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  brokerage_id uuid not null references public.brokerages(id) on delete cascade,
  scope text not null check (scope in ('brokerage','team')),
  team_id uuid references public.teams(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  check (scope = 'brokerage' or team_id is not null)
);

create table if not exists public.library_folders (
  id uuid primary key default gen_random_uuid(),
  brokerage_id uuid not null references public.brokerages(id) on delete cascade,
  name text not null,
  category text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  category text not null,
  title text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  tags text[] not null default '{}',
  pinned boolean not null default false,
  locked boolean not null default false,
  library_folder_id uuid references public.library_folders(id) on delete set null,
  reviewed_as_of timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now()
);
create index if not exists threads_channel_idx on public.threads (channel_id);
create index if not exists threads_library_idx on public.threads (library_folder_id);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  kind text not null default 'post' check (kind in ('post','update')),
  created_at timestamptz not null default now()
);
create index if not exists posts_thread_idx on public.posts (thread_id, created_at);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  body text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  tags text[] not null default '{}',
  accepted_answer_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.questions
  add constraint questions_accepted_answer_fk
  foreign key (accepted_answer_id) references public.answers(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Boosts (county-capped inventory)
-- ---------------------------------------------------------------------------

create table if not exists public.boost_tiers (
  id text primary key check (id in ('starter','growth','max')),
  name text not null,
  price_monthly_cents int not null,
  slots_per_county int not null,
  reach_label text not null,
  description text not null
);

create table if not exists public.boost_county_slot_overrides (
  county_fips text not null,
  tier_id text not null references public.boost_tiers(id) on delete cascade,
  slots_per_county int not null check (slots_per_county >= 0),
  primary key (county_fips, tier_id)
);

create table if not exists public.listing_boosts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  county_fips text not null,
  tier_id text not null references public.boost_tiers(id),
  status text not null default 'active' check (status in ('active','canceled','expired')),
  stripe_subscription_id text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists listing_boosts_active_idx
  on public.listing_boosts (county_fips, tier_id) where status = 'active';

-- ---------------------------------------------------------------------------
-- RLS helper functions (SECURITY DEFINER to avoid recursive policy checks)
-- ---------------------------------------------------------------------------

create or replace function public.account_kind(p_uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select account_kind from public.profiles where id = p_uid;
$$;

create or replace function public.is_brokerage_member(p_bid uuid, p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = p_uid and brokerage_id = p_bid
  );
$$;

create or replace function public.is_broker_of(p_bid uuid, p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.brokerages b
    where b.id = p_bid and b.broker_id = p_uid
  ) or exists (
    select 1 from public.profiles p
    where p.id = p_uid and p.brokerage_id = p_bid and p.account_kind = 'broker'
  );
$$;

create or replace function public.is_team_member(p_tid uuid, p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teams t where t.id = p_tid and t.leader_id = p_uid
  ) or exists (
    select 1 from public.team_members tm
    where tm.team_id = p_tid and tm.member_id = p_uid
  );
$$;

-- Can the user see this channel? Brokerage-wide channels: any brokerage member.
-- Team channels: team members, or the broker (legal oversight).
create or replace function public.can_view_channel(p_channel uuid, p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.channels c
    where c.id = p_channel
      and public.is_brokerage_member(c.brokerage_id, p_uid)
      and (
        c.scope = 'brokerage'
        or public.is_team_member(c.team_id, p_uid)
        or public.is_broker_of(c.brokerage_id, p_uid)
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Auth trigger: create a profile row for every new auth user
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_kind text := coalesce(new.raw_user_meta_data->>'account_kind', 'consumer');
begin
  insert into public.profiles (id, email, full_name, initials, account_kind, professional_role)
  values (
    new.id,
    new.email,
    v_name,
    upper(left(v_name, 1)) ||
      upper(coalesce(nullif(split_part(v_name, ' ', 2), ''), '')),
    case when v_kind in ('consumer','agent','broker') then v_kind else 'consumer' end,
    nullif(new.raw_user_meta_data->>'professional_role', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.boost_tiers (id, name, price_monthly_cents, slots_per_county, reach_label, description) values
  ('starter','Starter',2500,3,'+30% local reach','Extra visibility in your county marketplace feed.'),
  ('growth','Growth',5000,3,'+75% reach · Featured badge','Stronger placement and a Featured badge on your card.'),
  ('max','Max',10000,1,'+150% reach · Top placement','Top county placement — only one Max boost per county.')
on conflict (id) do nothing;
