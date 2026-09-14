-- Story Labs empty-project schema. Do not run on live Story Home.
-- Safety: abort if county_parcels already has real data (live vault).

do $$
begin
  if to_regclass('public.county_parcels') is not null then
    if (select count(*) from public.county_parcels) > 1000 then
      raise exception 'STOP: this database already has parcel data. This paste is only for empty Story Labs.';
    end if;
  end if;
end
$$;


-- ===== 0001_init.sql =====
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

-- ===== 0002_rls.sql =====
-- Story Home — Row Level Security
-- Database-enforced access control. Apply after 0001_init.sql.

-- Base grants: RLS (below) is the real gate; these just expose the tables.
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;

-- Enable RLS everywhere
alter table public.brokerages            enable row level security;
alter table public.profiles              enable row level security;
alter table public.teams                 enable row level security;
alter table public.team_members          enable row level security;
alter table public.listings              enable row level security;
alter table public.listing_analytics     enable row level security;
alter table public.listing_analytics_events enable row level security;
alter table public.listing_comments      enable row level security;
alter table public.suites                enable row level security;
alter table public.suite_items           enable row level security;
alter table public.follows               enable row level security;
alter table public.messages              enable row level security;
alter table public.buyers                enable row level security;
alter table public.seller_clients        enable row level security;
alter table public.referrals             enable row level security;
alter table public.inquiries             enable row level security;
alter table public.lead_claims           enable row level security;
alter table public.channels              enable row level security;
alter table public.library_folders       enable row level security;
alter table public.threads               enable row level security;
alter table public.posts                 enable row level security;
alter table public.questions             enable row level security;
alter table public.answers               enable row level security;
alter table public.boost_tiers           enable row level security;
alter table public.listing_boosts        enable row level security;

-- ---------------- profiles ----------------
create policy profiles_read on public.profiles
  for select to anon, authenticated using (true);
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- ---------------- brokerages ----------------
create policy brokerages_read on public.brokerages
  for select to authenticated using (true);
create policy brokerages_insert on public.brokerages
  for insert to authenticated with check (true);
create policy brokerages_update_broker on public.brokerages
  for update to authenticated
  using (public.is_broker_of(id, auth.uid()))
  with check (public.is_broker_of(id, auth.uid()));

-- ---------------- teams ----------------
create policy teams_read_members on public.teams
  for select to authenticated
  using (public.is_brokerage_member(brokerage_id, auth.uid()));
create policy teams_insert on public.teams
  for insert to authenticated
  with check (
    public.is_broker_of(brokerage_id, auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.brokerage_id = teams.brokerage_id
        and p.team_leader_authorized
    )
  );
create policy teams_modify on public.teams
  for update to authenticated
  using (leader_id = auth.uid() or public.is_broker_of(brokerage_id, auth.uid()))
  with check (leader_id = auth.uid() or public.is_broker_of(brokerage_id, auth.uid()));
create policy teams_delete on public.teams
  for delete to authenticated
  using (leader_id = auth.uid() or public.is_broker_of(brokerage_id, auth.uid()));

-- ---------------- team_members ----------------
create policy team_members_read on public.team_members
  for select to authenticated
  using (public.is_team_member(team_id, auth.uid())
         or exists (select 1 from public.teams t
                    where t.id = team_id
                      and public.is_broker_of(t.brokerage_id, auth.uid())));
create policy team_members_write on public.team_members
  for all to authenticated
  using (exists (select 1 from public.teams t
                 where t.id = team_id
                   and (t.leader_id = auth.uid()
                        or public.is_broker_of(t.brokerage_id, auth.uid()))))
  with check (exists (select 1 from public.teams t
                 where t.id = team_id
                   and (t.leader_id = auth.uid()
                        or public.is_broker_of(t.brokerage_id, auth.uid()))));

-- ---------------- listings (marketplace + pro edit) ----------------
create policy listings_read_public on public.listings
  for select to anon, authenticated using (true);
create policy listings_insert_own on public.listings
  for insert to authenticated with check (agent_id = auth.uid());
create policy listings_update_owner_or_broker on public.listings
  for update to authenticated
  using (agent_id = auth.uid()
         or (brokerage_id is not null and public.is_broker_of(brokerage_id, auth.uid())))
  with check (agent_id = auth.uid()
         or (brokerage_id is not null and public.is_broker_of(brokerage_id, auth.uid())));
create policy listings_delete_owner_or_broker on public.listings
  for delete to authenticated
  using (agent_id = auth.uid()
         or (brokerage_id is not null and public.is_broker_of(brokerage_id, auth.uid())));

-- ---------------- listing_analytics (owner/broker only) ----------------
create policy listing_analytics_read on public.listing_analytics
  for select to authenticated
  using (exists (select 1 from public.listings l
                 where l.id = listing_id
                   and (l.agent_id = auth.uid()
                        or (l.brokerage_id is not null
                            and public.is_broker_of(l.brokerage_id, auth.uid())))));

create policy listing_analytics_events_read on public.listing_analytics_events
  for select to authenticated
  using (exists (select 1 from public.listings l
                 where l.id = listing_id and l.agent_id = auth.uid()));
create policy listing_analytics_events_insert on public.listing_analytics_events
  for insert to authenticated with check (true);

-- ---------------- listing_comments ----------------
create policy listing_comments_read on public.listing_comments
  for select to anon, authenticated using (true);
create policy listing_comments_insert on public.listing_comments
  for insert to authenticated with check (user_id = auth.uid());
create policy listing_comments_modify on public.listing_comments
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy listing_comments_delete on public.listing_comments
  for delete to authenticated using (user_id = auth.uid());

-- ---------------- suites (buyer owns their own) ----------------
create policy suites_all_own on public.suites
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy suite_items_all_own on public.suite_items
  for all to authenticated
  using (exists (select 1 from public.suites s
                 where s.id = suite_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.suites s
                 where s.id = suite_id and s.user_id = auth.uid()));

-- ---------------- follows ----------------
create policy follows_all_own on public.follows
  for all to authenticated
  using (follower_id = auth.uid()) with check (follower_id = auth.uid());

-- ---------------- messages ----------------
create policy messages_read on public.messages
  for select to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy messages_insert on public.messages
  for insert to authenticated with check (sender_id = auth.uid());
create policy messages_update_receiver on public.messages
  for update to authenticated
  using (receiver_id = auth.uid()) with check (receiver_id = auth.uid());

-- ---------------- buyers / seller_clients (owner agent) ----------------
create policy buyers_all_own on public.buyers
  for all to authenticated
  using (agent_id = auth.uid()) with check (agent_id = auth.uid());
create policy seller_clients_all_own on public.seller_clients
  for all to authenticated
  using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- ---------------- referrals ----------------
create policy referrals_read on public.referrals
  for select to authenticated using (true);
create policy referrals_insert on public.referrals
  for insert to authenticated with check (poster_id = auth.uid());
create policy referrals_update on public.referrals
  for update to authenticated
  using (poster_id = auth.uid() or claimer_id = auth.uid())
  with check (poster_id = auth.uid() or claimer_id = auth.uid());

-- ---------------- inquiries / lead_claims ----------------
create policy inquiries_read on public.inquiries
  for select to authenticated
  using (consumer_id = auth.uid() or agent_id = auth.uid());
create policy inquiries_insert on public.inquiries
  for insert to authenticated with check (consumer_id = auth.uid());

create policy lead_claims_read on public.lead_claims
  for select to authenticated
  using (agent_id = auth.uid() or consumer_id = auth.uid());
create policy lead_claims_insert on public.lead_claims
  for insert to authenticated with check (agent_id = auth.uid());

-- ---------------- channels (team-private visibility) ----------------
create policy channels_read on public.channels
  for select to authenticated
  using (public.can_view_channel(id, auth.uid()));
create policy channels_write on public.channels
  for all to authenticated
  using (public.is_broker_of(brokerage_id, auth.uid())
         or (team_id is not null and public.is_team_member(team_id, auth.uid())))
  with check (public.is_broker_of(brokerage_id, auth.uid())
         or (team_id is not null and public.is_team_member(team_id, auth.uid())));

-- ---------------- library_folders (broker curates) ----------------
create policy library_folders_read on public.library_folders
  for select to authenticated
  using (public.is_brokerage_member(brokerage_id, auth.uid()));
create policy library_folders_write on public.library_folders
  for all to authenticated
  using (public.is_broker_of(brokerage_id, auth.uid()))
  with check (public.is_broker_of(brokerage_id, auth.uid()));

-- ---------------- threads ----------------
create policy threads_read on public.threads
  for select to authenticated
  using (public.can_view_channel(channel_id, auth.uid()));
create policy threads_insert on public.threads
  for insert to authenticated
  with check (author_id = auth.uid() and public.can_view_channel(channel_id, auth.uid()));
create policy threads_modify on public.threads
  for update to authenticated
  using (author_id = auth.uid()
         or exists (select 1 from public.channels c
                    where c.id = channel_id
                      and public.is_broker_of(c.brokerage_id, auth.uid())))
  with check (true);
create policy threads_delete on public.threads
  for delete to authenticated
  using (author_id = auth.uid()
         or exists (select 1 from public.channels c
                    where c.id = channel_id
                      and public.is_broker_of(c.brokerage_id, auth.uid())));

-- ---------------- posts ----------------
create policy posts_read on public.posts
  for select to authenticated
  using (exists (select 1 from public.threads t
                 where t.id = thread_id
                   and public.can_view_channel(t.channel_id, auth.uid())));
create policy posts_insert on public.posts
  for insert to authenticated
  with check (author_id = auth.uid()
              and exists (select 1 from public.threads t
                          where t.id = thread_id
                            and public.can_view_channel(t.channel_id, auth.uid())));
create policy posts_modify on public.posts
  for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy posts_delete on public.posts
  for delete to authenticated using (author_id = auth.uid());

-- ---------------- questions / answers (public Q&A) ----------------
create policy questions_read on public.questions
  for select to authenticated using (true);
create policy questions_insert on public.questions
  for insert to authenticated with check (author_id = auth.uid());
create policy questions_update on public.questions
  for update to authenticated
  using (author_id = auth.uid() or public.account_kind(auth.uid()) = 'broker')
  with check (author_id = auth.uid() or public.account_kind(auth.uid()) = 'broker');

create policy answers_read on public.answers
  for select to authenticated using (true);
create policy answers_insert on public.answers
  for insert to authenticated with check (author_id = auth.uid());
create policy answers_modify on public.answers
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy answers_delete on public.answers
  for delete to authenticated using (author_id = auth.uid());

-- ---------------- boosts ----------------
create policy boost_tiers_read on public.boost_tiers
  for select to anon, authenticated using (true);
create policy listing_boosts_read on public.listing_boosts
  for select to authenticated
  using (exists (select 1 from public.listings l
                 where l.id = listing_id
                   and (l.agent_id = auth.uid()
                        or (l.brokerage_id is not null
                            and public.is_broker_of(l.brokerage_id, auth.uid())))));
-- Writes to listing_boosts go through the server (service_role) with the
-- assert_boost_slot_available() check; no authenticated write policy on purpose.

-- ===== 0003_homes.sql =====
-- Story Home — Consumer "My Home" homeowner data vault (CARFAX-for-homes).
-- Private by default; a homeowner explicitly grants a specific realtor access to
-- a specific home, revocable anytime. Enforced by RLS, not just the UI.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.homes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  nickname text not null default 'My Home',
  address text not null default '',
  city text not null default '',
  county_name text not null default '',
  state text not null default 'TX',
  zip text not null default '',
  beds int,
  baths numeric(3,1),
  sqft int,
  year_built int,
  property_type text,
  purchase_date date,
  purchase_price numeric(12,2),
  photo_url text,
  created_at timestamptz not null default now()
);
create index if not exists homes_owner_idx on public.homes (owner_id);

create table if not exists public.home_records (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  occurred_on date not null default current_date,
  category text not null default 'Other',
  title text not null,
  description text,
  cost numeric(12,2) not null default 0,
  contractor text,
  warranty_until date,
  is_capital_improvement boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists home_records_home_idx on public.home_records (home_id);

create table if not exists public.home_expenses (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  spent_on date not null default current_date,
  category text not null default 'Other',
  vendor text,
  amount numeric(12,2) not null default 0,
  tax_year int,
  is_capital_improvement boolean not null default false,
  receipt_document_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists home_expenses_home_idx on public.home_expenses (home_id);

create table if not exists public.home_documents (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  doc_type text not null default 'other'
    check (doc_type in ('tax','insurance','warranty','receipt','deed','other')),
  title text not null,
  file_path text,
  created_at timestamptz not null default now()
);
create index if not exists home_documents_home_idx on public.home_documents (home_id);

-- Explicit, revocable, per-home consent to a specific realtor.
create table if not exists public.home_access_grants (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  grantee_agent_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null default 'full' check (scope in ('full','report')),
  status text not null default 'active' check (status in ('active','revoked')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (home_id, grantee_agent_id)
);
create index if not exists home_grants_grantee_idx on public.home_access_grants (grantee_agent_id, status);

-- ---------------------------------------------------------------------------
-- Access helper (SECURITY DEFINER to avoid recursive policy evaluation)
-- ---------------------------------------------------------------------------

create or replace function public.has_home_access(
  p_home uuid,
  p_uid uuid,
  p_need_full boolean
)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.home_access_grants g
    where g.home_id = p_home
      and g.grantee_agent_id = p_uid
      and g.status = 'active'
      and (not p_need_full or g.scope = 'full')
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.homes               enable row level security;
alter table public.home_records        enable row level security;
alter table public.home_expenses       enable row level security;
alter table public.home_documents      enable row level security;
alter table public.home_access_grants  enable row level security;

-- homes: owner full; granted realtor may read (any active grant)
create policy homes_select on public.homes
  for select to authenticated
  using (owner_id = auth.uid() or public.has_home_access(id, auth.uid(), false));
create policy homes_insert on public.homes
  for insert to authenticated with check (owner_id = auth.uid());
create policy homes_update on public.homes
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy homes_delete on public.homes
  for delete to authenticated using (owner_id = auth.uid());

-- records (home history): owner full; granted realtor read on ANY active grant
create policy home_records_select on public.home_records
  for select to authenticated
  using (owner_id = auth.uid() or public.has_home_access(home_id, auth.uid(), false));
create policy home_records_write on public.home_records
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid())
  );

-- expenses: owner full; granted realtor read ONLY with full scope
create policy home_expenses_select on public.home_expenses
  for select to authenticated
  using (owner_id = auth.uid() or public.has_home_access(home_id, auth.uid(), true));
create policy home_expenses_write on public.home_expenses
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid())
  );

-- documents: owner full; granted realtor read ONLY with full scope
create policy home_documents_select on public.home_documents
  for select to authenticated
  using (owner_id = auth.uid() or public.has_home_access(home_id, auth.uid(), true));
create policy home_documents_write on public.home_documents
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid())
  );

-- grants: owner manages; grantee may see grants pointed at them
create policy home_grants_select on public.home_access_grants
  for select to authenticated
  using (owner_id = auth.uid() or grantee_agent_id = auth.uid());
create policy home_grants_write on public.home_access_grants
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid())
  );

-- Expose the new tables to the API roles (RLS above is the real gate).
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;

-- ===== 0004_storage.sql =====
-- Story Home — private Storage for home documents/receipts.
-- Apply on the real Supabase project (requires the `storage` schema). NOT part
-- of the local RLS test (plain Postgres has no storage schema).
--
-- Path convention: home-docs/{owner_id}/{home_id}/{filename}
-- v1 policy: owner-only access. Sharing a file with a granted realtor is done
-- via app-generated signed URLs (a later enhancement can add grant-aware paths).

insert into storage.buckets (id, name, public)
values ('home-docs', 'home-docs', false)
on conflict (id) do nothing;

drop policy if exists "home docs owner read" on storage.objects;
create policy "home docs owner read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'home-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "home docs owner write" on storage.objects;
create policy "home docs owner write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'home-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "home docs owner update" on storage.objects;
create policy "home docs owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'home-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "home docs owner delete" on storage.objects;
create policy "home docs owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'home-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===== 0005_home_details.sql =====
-- Story Home — My Home fine-tune: property profile, disclosure, structures,
-- folders, receipt attachments, closing packet, and an access audit log.
-- Same consent model as 0003 (owner full; granted realtor read per scope).

-- ---------------------------------------------------------------------------
-- Extend homes: photo (private path), land, and closing facts
-- ---------------------------------------------------------------------------
alter table public.homes
  add column if not exists photo_path text,
  add column if not exists lot_acres numeric(10,2),
  add column if not exists water_source text,
  add column if not exists sewer_type text,
  add column if not exists fenced boolean not null default false,
  add column if not exists ag_exemption boolean not null default false,
  add column if not exists road_frontage text,
  add column if not exists is_financed boolean,
  add column if not exists title_company text,
  add column if not exists gf_number text,
  add column if not exists lender text,
  add column if not exists loan_amount numeric(12,2);

-- ---------------------------------------------------------------------------
-- Records & expenses: "Other" free-text + attached receipt/invoice
-- ---------------------------------------------------------------------------
alter table public.home_records
  add column if not exists category_other text,
  add column if not exists receipt_path text,
  add column if not exists receipt_name text;

alter table public.home_expenses
  add column if not exists category_other text,
  add column if not exists receipt_path text,
  add column if not exists receipt_name text;

-- ---------------------------------------------------------------------------
-- Folders (organize the Documents vault) + document extras + closing packet
-- ---------------------------------------------------------------------------
create table if not exists public.home_folders (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null default 'documents',
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists home_folders_home_idx on public.home_folders (home_id);

alter table public.home_documents
  add column if not exists folder_id uuid references public.home_folders(id) on delete set null,
  add column if not exists doc_type_other text,
  add column if not exists is_closing_doc boolean not null default false,
  add column if not exists closing_slot text,
  add column if not exists sensitive boolean not null default false;

-- ---------------------------------------------------------------------------
-- Structures (barns, shops, sheds, etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.home_structures (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'Other',
  kind_other text,
  name text not null default '',
  size_sqft int,
  year_built int,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists home_structures_home_idx on public.home_structures (home_id);

-- ---------------------------------------------------------------------------
-- Disclosure (informational TREC-style form, stored as structured JSON)
-- ---------------------------------------------------------------------------
create table if not exists public.home_disclosures (
  home_id uuid primary key references public.homes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Access audit log (owner-visible): who was granted/revoked, when
-- ---------------------------------------------------------------------------
create table if not exists public.home_access_audit (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid,
  action text not null,
  scope text,
  detail text,
  at timestamptz not null default now()
);
create index if not exists home_audit_home_idx on public.home_access_audit (home_id, at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.home_folders        enable row level security;
alter table public.home_structures     enable row level security;
alter table public.home_disclosures    enable row level security;
alter table public.home_access_audit   enable row level security;

-- Folders: owner writes; granted (full) can read (they see the doc vault)
create policy home_folders_select on public.home_folders
  for select to authenticated
  using (owner_id = auth.uid() or public.has_home_access(home_id, auth.uid(), true));
create policy home_folders_write on public.home_folders
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid())
  );

-- Structures: part of the property "report" — visible on any active grant
create policy home_structures_select on public.home_structures
  for select to authenticated
  using (owner_id = auth.uid() or public.has_home_access(home_id, auth.uid(), false));
create policy home_structures_write on public.home_structures
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid())
  );

-- Disclosure: part of the property "report" — visible on any active grant
create policy home_disclosures_select on public.home_disclosures
  for select to authenticated
  using (owner_id = auth.uid() or public.has_home_access(home_id, auth.uid(), false));
create policy home_disclosures_write on public.home_disclosures
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid())
  );

-- Audit: owner-only
create policy home_audit_select on public.home_access_audit
  for select to authenticated using (owner_id = auth.uid());
create policy home_audit_insert on public.home_access_audit
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid())
  );

-- Expose new tables to API roles (RLS is the gate)
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;

-- ===== 0006_county_parcels.sql =====
-- ---------------------------------------------------------------------------
-- County parcel data (public record) — pilot: Polk Central Appraisal District
--
-- Source: Polk CAD public ArcGIS parcel service (PolkCADWebService/FeatureServer/0),
-- which returns per-parcel attributes AND lot geometry with no license/API fee.
-- This is PUBLIC RECORD data, so these tables are world-readable; only the
-- service role (bulk ingester) may write them. Nothing here is fabricated —
-- rows exist only for parcels actually ingested from the county.
-- ---------------------------------------------------------------------------

create table if not exists public.county_parcels (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'polk_cad',
  county_fips text not null default '48373',      -- Polk County, TX
  prop_id text not null,                          -- CAD property id
  geo_id text,                                    -- CAD geographic id
  owner_name text,
  situs_num text,
  situs_street text,
  situs_city text,
  situs_state text,
  situs_zip text,
  situs_address text,                             -- composed, for display/search
  legal_description text,
  abstract_subdivision_code text,
  tract_or_lot text,
  block text,
  legal_acreage numeric(12,4),
  land_value numeric(14,2),
  improvement_value numeric(14,2),
  market_value numeric(14,2),
  tax_year int,
  school_code text,
  geojson jsonb,                                  -- GeoJSON geometry (Polygon/MultiPolygon)
  centroid_lat double precision,
  centroid_lng double precision,
  source_url text,
  ingested_at timestamptz not null default now(),
  unique (source, prop_id)
);

create index if not exists county_parcels_situs_idx
  on public.county_parcels (situs_zip, situs_num);
create index if not exists county_parcels_street_idx
  on public.county_parcels (lower(situs_street));
create index if not exists county_parcels_geoid_idx
  on public.county_parcels (geo_id);

-- Annual value history so the 3-year appraised-value view accrues over time.
create table if not exists public.county_parcel_values (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'polk_cad',
  prop_id text not null,
  tax_year int not null,
  land_value numeric(14,2),
  improvement_value numeric(14,2),
  market_value numeric(14,2),
  appraised_value numeric(14,2),
  assessed_value numeric(14,2),
  ingested_at timestamptz not null default now(),
  unique (source, prop_id, tax_year)
);

create index if not exists county_parcel_values_prop_idx
  on public.county_parcel_values (source, prop_id, tax_year);

-- Optional explicit links from an app record to a county parcel.
alter table public.homes    add column if not exists cad_prop_id text;
alter table public.listings add column if not exists cad_prop_id text;

-- ---------------------------------------------------------------------------
-- RLS: public read (public record), service-role-only writes
-- ---------------------------------------------------------------------------
alter table public.county_parcels        enable row level security;
alter table public.county_parcel_values  enable row level security;

drop policy if exists county_parcels_public_read on public.county_parcels;
create policy county_parcels_public_read on public.county_parcels
  for select to anon, authenticated using (true);

drop policy if exists county_parcel_values_public_read on public.county_parcel_values;
create policy county_parcel_values_public_read on public.county_parcel_values
  for select to anon, authenticated using (true);

-- No insert/update/delete policies: only the service role (bypassrls) writes.

grant select on public.county_parcels       to anon, authenticated;
grant select on public.county_parcel_values to anon, authenticated;
grant all    on public.county_parcels       to service_role;
grant all    on public.county_parcel_values to service_role;

-- ===== 0007_profiles_brokerage.sql =====
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

-- ===== 0008_broker_roster.sql =====
-- ---------------------------------------------------------------------------
-- Wave A — Brokerage Roster & Sponsorship
--
-- A broker manages their agent roster. Agents can only be attached when TREC
-- confirms the agent is actually SPONSORED by that broker (verified in the app
-- against the TREC dataset before an invite is created). Joining/removal is done
-- through SECURITY DEFINER functions so the rules can't be bypassed by editing
-- another user's profile directly.
-- ---------------------------------------------------------------------------

create table if not exists public.brokerage_invites (
  id uuid primary key default gen_random_uuid(),
  brokerage_id uuid not null references public.brokerages(id) on delete cascade,
  agent_license text not null,               -- canonical TREC license (e.g. 724479-SA)
  agent_name text,
  invited_by uuid references public.profiles(id) on delete set null,
  status text not null default 'active'
    check (status in ('active','accepted','removed')),
  created_at timestamptz not null default now(),
  unique (brokerage_id, agent_license)
);
create index if not exists brokerage_invites_license_idx
  on public.brokerage_invites (agent_license, status);

alter table public.brokerage_invites enable row level security;

-- Broker of record manages invites for their brokerage.
drop policy if exists invites_broker_all on public.brokerage_invites;
create policy invites_broker_all on public.brokerage_invites
  for all to authenticated
  using (public.is_broker_of(brokerage_id, auth.uid()))
  with check (public.is_broker_of(brokerage_id, auth.uid()));

-- An agent may read invites addressed to their own license.
drop policy if exists invites_agent_read on public.brokerage_invites;
create policy invites_agent_read on public.brokerage_invites
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.trec_license = brokerage_invites.agent_license
    )
  );

grant select, insert, update, delete on public.brokerage_invites to authenticated;

-- Agent accepts: link own profile to the brokerage only if an active invite
-- matches the caller's verified TREC license.
create or replace function public.accept_brokerage_invite(p_brokerage uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_lic text;
begin
  select trec_license into v_lic from public.profiles where id = auth.uid();
  if v_lic is null then return false; end if;
  if not exists (
    select 1 from public.brokerage_invites bi
    where bi.brokerage_id = p_brokerage
      and bi.agent_license = v_lic
      and bi.status = 'active'
  ) then
    return false;
  end if;
  update public.profiles set brokerage_id = p_brokerage where id = auth.uid();
  update public.brokerage_invites set status = 'accepted'
    where brokerage_id = p_brokerage and agent_license = v_lic;
  return true;
end;
$$;
grant execute on function public.accept_brokerage_invite(uuid) to authenticated;

-- Broker removes an agent from their brokerage.
create or replace function public.remove_agent_from_brokerage(p_agent uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_brok uuid; v_lic text;
begin
  select brokerage_id into v_brok from public.profiles where id = p_agent;
  if v_brok is null then return false; end if;
  if not public.is_broker_of(v_brok, auth.uid()) then return false; end if;
  select trec_license into v_lic from public.profiles where id = p_agent;
  update public.profiles set brokerage_id = null where id = p_agent;
  update public.brokerage_invites set status = 'removed'
    where brokerage_id = v_brok and agent_license = v_lic;
  return true;
end;
$$;
grant execute on function public.remove_agent_from_brokerage(uuid) to authenticated;

-- ===== 0009_roster_grants.sql =====
-- ---------------------------------------------------------------------------
-- Wave B — grants cleanup
--
-- Wave A granted the roster table to `authenticated` (the app) but not to the
-- admin service role, so server-side/admin tooling couldn't read it. This adds
-- the missing grant. No behavior change for end users.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.brokerage_invites to service_role;

-- ===== 0010_community_backend.sql =====
-- ---------------------------------------------------------------------------
-- Wave C — Community Backend
--
-- The community content tables (channels, threads, posts, questions, answers,
-- library_folders, teams, team_members) and their broker-authority RLS already
-- exist from 0001/0002. This wave only needs one privileged helper: a broker
-- authorizing an agent as a team leader means writing to ANOTHER profile row,
-- which the self-only profiles RLS forbids — so we do it through a SECURITY
-- DEFINER function gated to the brokerage's broker.
-- ---------------------------------------------------------------------------

create or replace function public.set_team_leader_authorized(
  p_agent uuid,
  p_authorized boolean
)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_brok uuid;
begin
  select brokerage_id into v_brok from public.profiles where id = p_agent;
  if v_brok is null then return false; end if;
  if not public.is_broker_of(v_brok, auth.uid()) then return false; end if;
  update public.profiles set team_leader_authorized = p_authorized where id = p_agent;
  return true;
end;
$$;
grant execute on function public.set_team_leader_authorized(uuid, boolean) to authenticated;

-- ===== 0011_crm.sql =====
-- ---------------------------------------------------------------------------
-- Wave D — CRM (Buyers/Sellers) + lead sources + activities + campaigns
--
-- Enriches the existing buyers/seller_clients tables for a real CRM (lead
-- source + contact info), and adds an activity log (notes/calls/tasks) and
-- trackable marketing campaigns (UTM link builder). All rows are owned by the
-- agent (agent_id = auth.uid()).
-- ---------------------------------------------------------------------------

alter table public.buyers add column if not exists source text;
alter table public.buyers add column if not exists source_campaign text;
alter table public.buyers add column if not exists email text;
alter table public.buyers add column if not exists phone text;
alter table public.buyers add column if not exists last_contacted_at timestamptz;

alter table public.seller_clients add column if not exists source text;
alter table public.seller_clients add column if not exists email text;
alter table public.seller_clients add column if not exists phone text;

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  subject_type text not null check (subject_type in ('buyer','seller')),
  subject_id uuid not null,
  kind text not null default 'note' check (kind in ('note','call','text','email','task')),
  body text not null default '',
  due_at timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists crm_activities_subject_idx
  on public.crm_activities (agent_id, subject_type, subject_id, created_at);

create table if not exists public.crm_campaigns (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  channel text not null default 'other'
    check (channel in ('google','facebook','instagram','zillow','referral','other')),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);
create index if not exists crm_campaigns_agent_idx on public.crm_campaigns (agent_id);

alter table public.crm_activities enable row level security;
alter table public.crm_campaigns  enable row level security;

drop policy if exists crm_activities_all_own on public.crm_activities;
create policy crm_activities_all_own on public.crm_activities
  for all to authenticated
  using (agent_id = auth.uid()) with check (agent_id = auth.uid());

drop policy if exists crm_campaigns_all_own on public.crm_campaigns;
create policy crm_campaigns_all_own on public.crm_campaigns
  for all to authenticated
  using (agent_id = auth.uid()) with check (agent_id = auth.uid());

grant select, insert, update, delete on public.crm_activities to authenticated;
grant select, insert, update, delete on public.crm_campaigns  to authenticated;
grant select, insert, update, delete on public.crm_activities to service_role;
grant select, insert, update, delete on public.crm_campaigns  to service_role;

-- ===== 0012_lead_routing.sql =====
-- ---------------------------------------------------------------------------
-- Wave E — Leads Inbox & 15-minute Claim Routing
--
-- Consumer inquiries + lead_claims tables and their RLS already exist
-- (0001/0002). RLS limits an agent to inquiries on their own listings, but fair
-- routing needs the consumer's FULL cross-agent inquiry order. Two SECURITY
-- DEFINER helpers bridge that safely:
--   * agent_lead_feed()  — returns the inquiries + claims for every consumer who
--     inquired on one of the calling agent's listings, so the client can run the
--     (pure, tested) routing algorithm and render each agent's own windows.
--   * claim_lead()       — enforces the 15-minute sequential-window rule server-
--     side so an agent can only claim during their active window, first-come.
-- No paid services; pure Postgres.
-- ---------------------------------------------------------------------------

create or replace function public.agent_lead_feed()
returns jsonb language sql stable security definer set search_path = public as $$
  with relevant as (
    select distinct consumer_id from public.inquiries where agent_id = auth.uid()
  )
  select jsonb_build_object(
    'inquiries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'consumerId', i.consumer_id,
        'consumerName', cp.full_name,
        'listingId', i.listing_id,
        'listingLabel', l.address_serif,
        'agentId', i.agent_id,
        'agentName', ap.full_name,
        'createdAt', (extract(epoch from i.created_at) * 1000)::bigint
      ))
      from public.inquiries i
      join public.profiles cp on cp.id = i.consumer_id
      join public.listings l on l.id = i.listing_id
      join public.profiles ap on ap.id = i.agent_id
      where i.consumer_id in (select consumer_id from relevant)
    ), '[]'::jsonb),
    'claims', coalesce((
      select jsonb_agg(jsonb_build_object(
        'consumerId', c.consumer_id,
        'listingId', c.listing_id,
        'agentId', c.agent_id,
        'claimedAt', (extract(epoch from c.claimed_at) * 1000)::bigint
      ))
      from public.lead_claims c
      where c.consumer_id in (select consumer_id from relevant)
    ), '[]'::jsonb)
  );
$$;
grant execute on function public.agent_lead_feed() to authenticated;

create or replace function public.claim_lead(p_consumer uuid, p_listing uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  rec record;
  v_agent uuid := auth.uid();
  v_now timestamptz := now();
  v_cursor timestamptz := null;
  v_opens timestamptz;
  v_expires timestamptz;
  v_window interval := interval '15 minutes';
begin
  if exists (select 1 from public.lead_claims where consumer_id = p_consumer) then
    return case
      when exists (select 1 from public.lead_claims where consumer_id = p_consumer and agent_id = v_agent)
      then 'already_yours' else 'taken' end;
  end if;

  for rec in
    with firsts as (
      select distinct on (listing_id) listing_id, agent_id, created_at
      from public.inquiries
      where consumer_id = p_consumer
      order by listing_id, created_at
    )
    select * from firsts order by created_at
  loop
    v_opens := greatest(coalesce(v_cursor, rec.created_at), rec.created_at);
    v_expires := v_opens + v_window;
    if rec.listing_id = p_listing and rec.agent_id = v_agent then
      if v_now >= v_opens and v_now < v_expires then
        insert into public.lead_claims (consumer_id, listing_id, agent_id)
          values (p_consumer, p_listing, v_agent)
          on conflict (consumer_id) do nothing;
        return case
          when exists (select 1 from public.lead_claims where consumer_id = p_consumer and agent_id = v_agent)
          then 'claimed' else 'taken' end;
      else
        return 'not_your_window';
      end if;
    end if;
    v_cursor := v_expires;
  end loop;
  return 'not_found';
end;
$$;
grant execute on function public.claim_lead(uuid, uuid) to authenticated;

-- ===== 0013_saved_searches.sql =====
-- ---------------------------------------------------------------------------
-- Wave F — Saved searches (marketplace)
--
-- Lets a signed-in user save their current marketplace filter set and re-apply
-- it later (the HAR "Save Search" button). Owner-only. In-app for now; email
-- alerts can layer on later without schema changes.
-- ---------------------------------------------------------------------------

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists saved_searches_user_idx on public.saved_searches (user_id, created_at);

alter table public.saved_searches enable row level security;

drop policy if exists saved_searches_all_own on public.saved_searches;
create policy saved_searches_all_own on public.saved_searches
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.saved_searches to authenticated;
grant select, insert, update, delete on public.saved_searches to service_role;

-- ===== 0014_seller_portal.sql =====
-- ---------------------------------------------------------------------------
-- Wave J — Seller Portal (real listing + real analytics, code-gated)
--
-- The seller portal is accessed by an access code in the URL (no login). Listing
-- rows are public-read, but listing_analytics is restricted to the owning agent.
-- So we expose analytics to the code-holder via a SECURITY DEFINER function
-- (the access code is the token). We also add a helper for an agent/broker to
-- generate a unique access code to share with their seller.
-- ---------------------------------------------------------------------------

-- Resolve a listing + its analytics by seller access code (code = the secret).
create or replace function public.seller_portal_by_code(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'listing', to_jsonb(l),
    'analytics', to_jsonb(a)
  )
  from public.listings l
  left join public.listing_analytics a on a.listing_id = l.id
  where l.seller_access_code is not null
    and upper(l.seller_access_code) = upper(trim(p_code))
  limit 1;
$$;
grant execute on function public.seller_portal_by_code(text) to anon, authenticated;

-- Generate (once) a unique, human-readable seller access code for a listing the
-- caller owns (agent) or oversees (broker). Returns the code.
create or replace function public.ensure_seller_access_code(p_listing uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_existing text;
  v_addr text;
  v_base text;
  v_code text;
begin
  select seller_access_code, address_serif into v_existing, v_addr
  from public.listings
  where id = p_listing
    and (agent_id = v_uid or public.is_broker_of(brokerage_id, v_uid));
  if not found then
    return null; -- not the caller's listing
  end if;
  if v_existing is not null then
    return v_existing;
  end if;

  v_base := coalesce((regexp_match(upper(coalesce(v_addr, 'HOME')), '[A-Z]{3,}'))[1], 'HOME');
  loop
    v_code := v_base || '-' || lpad((floor(random() * 900) + 100)::int::text, 3, '0');
    exit when not exists (select 1 from public.listings where seller_access_code = v_code);
  end loop;

  update public.listings set seller_access_code = v_code where id = p_listing;
  return v_code;
end;
$$;
grant execute on function public.ensure_seller_access_code(uuid) to authenticated;

-- ===== 0015_boost_enforcement.sql =====
-- ---------------------------------------------------------------------------
-- Wave J.1 — Per-county boost enforcement (all 254 TX counties)
--
-- Boost scarcity is defined PER COUNTY: each tier has a slots_per_county cap
-- (with optional per-county overrides). Everything keys on county FIPS, so the
-- cap applies uniformly to any Texas county, not just the launch footprint.
--
-- 0001 seeded the boost tables and 0002's RLS comment referenced
-- assert_boost_slot_available(), but that function was never defined. This adds
-- the real server-side enforcement plus a public per-county availability read.
-- ---------------------------------------------------------------------------

-- Effective slot cap for a county+tier: per-county override, else tier default.
create or replace function public.boost_slots_for_county(p_county_fips text, p_tier text)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(
    (select slots_per_county from public.boost_county_slot_overrides
      where county_fips = p_county_fips and tier_id = p_tier),
    (select slots_per_county from public.boost_tiers where id = p_tier),
    0
  );
$$;

-- Active boosts currently held in a county for a tier.
create or replace function public.count_active_boosts(p_county_fips text, p_tier text)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.listing_boosts
   where county_fips = p_county_fips and tier_id = p_tier and status = 'active';
$$;

-- Raise if the county+tier bucket is already at capacity.
create or replace function public.assert_boost_slot_available(p_county_fips text, p_tier text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_cap int := public.boost_slots_for_county(p_county_fips, p_tier);
  v_used int := public.count_active_boosts(p_county_fips, p_tier);
begin
  if v_cap <= 0 then
    raise exception 'Boost tier % is not offered in county %', p_tier, p_county_fips
      using errcode = 'check_violation';
  end if;
  if v_used >= v_cap then
    raise exception 'Boost tier % is full in county % (% of % slots used)',
      p_tier, p_county_fips, v_used, v_cap
      using errcode = 'check_violation';
  end if;
end;
$$;

-- Activate a boost for a listing the caller owns/oversees. Resolves the county
-- from the listing, takes a per-(county,tier) advisory lock to prevent oversell
-- under concurrency, enforces the cap, then records the boost. Payment wiring
-- (Stripe) attaches later; the scarcity guarantee lives here regardless.
create or replace function public.activate_boost(p_listing uuid, p_tier text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_fips text;
  v_id uuid;
begin
  select county_fips into v_fips
  from public.listings
  where id = p_listing
    and (agent_id = v_uid or public.is_broker_of(brokerage_id, v_uid));
  if not found then
    raise exception 'Not authorized for this listing' using errcode = 'insufficient_privilege';
  end if;
  if v_fips is null then
    raise exception 'Listing has no county assigned; cannot key a per-county boost'
      using errcode = 'not_null_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_fips || ':' || p_tier));
  perform public.assert_boost_slot_available(v_fips, p_tier);

  insert into public.listing_boosts (listing_id, county_fips, tier_id, status)
  values (p_listing, v_fips, p_tier, 'active')
  returning id into v_id;
  return v_id;
end;
$$;

-- Public, per-county availability for every tier (capacity/used/remaining).
-- SECURITY DEFINER so an unauthenticated seller portal can show real numbers
-- for a listing's county without exposing the underlying listing_boosts rows.
create or replace function public.county_boost_availability(p_county_fips text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'tier_id', t.id,
        'name', t.name,
        'price_monthly_cents', t.price_monthly_cents,
        'capacity', public.boost_slots_for_county(p_county_fips, t.id),
        'used', public.count_active_boosts(p_county_fips, t.id),
        'remaining', greatest(
          public.boost_slots_for_county(p_county_fips, t.id)
            - public.count_active_boosts(p_county_fips, t.id), 0)
      )
      order by t.price_monthly_cents
    ),
    '[]'::jsonb
  )
  from public.boost_tiers t;
$$;

grant execute on function public.boost_slots_for_county(text, text) to authenticated;
grant execute on function public.count_active_boosts(text, text) to authenticated;
grant execute on function public.assert_boost_slot_available(text, text) to authenticated;
grant execute on function public.activate_boost(uuid, text) to authenticated;
grant execute on function public.county_boost_availability(text) to anon, authenticated;

-- ===== 0016_parcels_postgis.sql =====
-- ---------------------------------------------------------------------------
-- Wave L — Statewide parcel foundation (PostGIS)
--
-- Turns the county_parcels store into a real spatial dataset so we can serve
-- parcel-grid vector tiles at zoom (like a CAD viewer) and derive listing
-- coordinates from parcel centroids. Keys on county FIPS, so it scales to all
-- 254 Texas counties. Geometry stays in sync automatically on every ingest,
-- so statewide auto-refresh needs no app changes.
-- ---------------------------------------------------------------------------

create extension if not exists postgis;

-- Real geometry column alongside the existing GeoJSON.
alter table public.county_parcels
  add column if not exists geom geometry(MultiPolygon, 4326);

-- Backfill geometry from any GeoJSON already ingested.
update public.county_parcels
   set geom = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(geojson::text), 4326))
 where geojson is not null and geom is null;

-- Spatial index for fast tile/bbox queries.
create index if not exists county_parcels_geom_gix
  on public.county_parcels using gist (geom);

-- Keep geom in sync whenever geojson is written (auto-sync for statewide loads).
create or replace function public.parcels_sync_geom()
returns trigger language plpgsql as $$
begin
  if new.geojson is not null then
    new.geom := ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(new.geojson::text), 4326));
  else
    new.geom := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_parcels_sync_geom on public.county_parcels;
create trigger trg_parcels_sync_geom
  before insert or update of geojson on public.county_parcels
  for each row execute function public.parcels_sync_geom();

-- ---------------------------------------------------------------------------
-- Parcel-grid vector tiles (Mapbox Vector Tile) — our own tile server.
-- Only serves at parcel-scale zoom (>= 13) so tiles stay small.
-- ---------------------------------------------------------------------------
create or replace function public.parcels_mvt(z int, x int, y int)
returns bytea
language plpgsql stable parallel safe security definer set search_path = public as $$
declare
  result bytea;
  env geometry := ST_TileEnvelope(z, x, y);   -- 3857
begin
  if z < 13 then
    return ''::bytea;
  end if;
  select ST_AsMVT(t, 'parcels', 4096, 'geom') into result
  from (
    select
      p.prop_id,
      p.owner_name,
      p.situs_address,
      p.legal_acreage,
      p.market_value,
      ST_AsMVTGeom(
        ST_Transform(p.geom, 3857),
        env,
        4096, 64, true
      ) as geom
    from public.county_parcels p
    where p.geom is not null
      and p.geom && ST_Transform(env, 4326)
  ) as t
  where t.geom is not null;
  return coalesce(result, ''::bytea);
end;
$$;
grant execute on function public.parcels_mvt(int, int, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Listing geocoding: derive lat/lng from a linked CAD parcel centroid so
-- listings drop a map pin without a paid geocoder. Fires when a listing is
-- linked to a parcel (cad_prop_id) and has no coordinates yet.
-- ---------------------------------------------------------------------------
create or replace function public.geocode_listing_from_parcel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c record;
begin
  if new.cad_prop_id is not null and (new.lat is null or new.lng is null) then
    select centroid_lat, centroid_lng into c
    from public.county_parcels
    where prop_id = new.cad_prop_id
    limit 1;
    if found and c.centroid_lat is not null then
      new.lat := c.centroid_lat;
      new.lng := c.centroid_lng;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_geocode_listing on public.listings;
create trigger trg_geocode_listing
  before insert or update of cad_prop_id, lat, lng on public.listings
  for each row execute function public.geocode_listing_from_parcel();

-- One-time backfill for any already-linked listings.
update public.listings l
   set lat = p.centroid_lat, lng = p.centroid_lng
  from public.county_parcels p
 where l.cad_prop_id = p.prop_id
   and (l.lat is null or l.lng is null)
   and p.centroid_lat is not null;

-- ===== 0017_geocode_county_disambig.sql =====
-- ---------------------------------------------------------------------------
-- Wave L (part 2) — statewide-safe listing geocoding
--
-- A CAD Property ID is only unique WITHIN a county appraisal district, so when
-- deriving a listing's coordinates from a linked parcel we must disambiguate by
-- the listing's county (county_fips). Prefer the parcel in the same county.
-- ---------------------------------------------------------------------------

create or replace function public.geocode_listing_from_parcel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c record;
begin
  if new.cad_prop_id is not null and (new.lat is null or new.lng is null) then
    select centroid_lat, centroid_lng into c
    from public.county_parcels
    where prop_id = new.cad_prop_id
      and (new.county_fips is null or county_fips = new.county_fips)
    order by (county_fips is not distinct from new.county_fips) desc
    limit 1;
    if found and c.centroid_lat is not null then
      new.lat := c.centroid_lat;
      new.lng := c.centroid_lng;
    end if;
  end if;
  return new;
end;
$$;

-- ===== 0018_listing_parcels.sql =====
-- ---------------------------------------------------------------------------
-- Wave L3 — Multi-parcel listings (a property can span several CAD tracts)
--
-- In Texas a single property often spans multiple parcel IDs (lots bought at
-- different times / parent-child accounts). This links one listing to many
-- county parcels, marks one primary (drives the map pin + address), and
-- aggregates land/values/legal across all tracts for MLS auto-fill.
-- ---------------------------------------------------------------------------

create table if not exists public.listing_parcels (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  source text not null,
  prop_id text not null,
  county_fips text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (listing_id, source, prop_id)
);
create index if not exists listing_parcels_listing_idx
  on public.listing_parcels (listing_id);

alter table public.listing_parcels enable row level security;

drop policy if exists listing_parcels_read on public.listing_parcels;
create policy listing_parcels_read on public.listing_parcels
  for select to anon, authenticated using (true);

drop policy if exists listing_parcels_write on public.listing_parcels;
create policy listing_parcels_write on public.listing_parcels
  for all to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.agent_id = auth.uid() or public.is_broker_of(l.brokerage_id, auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.agent_id = auth.uid() or public.is_broker_of(l.brokerage_id, auth.uid()))
    )
  );

grant select on public.listing_parcels to anon, authenticated;
grant all on public.listing_parcels to authenticated, service_role;

-- Keep the listing's primary link + coordinates + total acreage in sync with
-- its tracts. Primary = the is_primary row, else the earliest-added.
create or replace function public.sync_listing_primary_parcel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_listing uuid := coalesce(new.listing_id, old.listing_id);
  v_prop text;
  v_fips text;
  v_lat double precision;
  v_lng double precision;
  v_acres numeric;
begin
  select lp.prop_id, lp.county_fips
    into v_prop, v_fips
  from public.listing_parcels lp
  where lp.listing_id = v_listing
  order by lp.is_primary desc, lp.created_at asc
  limit 1;

  select coalesce(sum(p.legal_acreage), 0)
    into v_acres
  from public.listing_parcels lp
  join public.county_parcels p
    on p.prop_id = lp.prop_id
   and (lp.county_fips is null or p.county_fips = lp.county_fips)
  where lp.listing_id = v_listing;

  if v_prop is not null then
    select centroid_lat, centroid_lng
      into v_lat, v_lng
    from public.county_parcels
    where prop_id = v_prop
      and (v_fips is null or county_fips = v_fips)
    limit 1;

    update public.listings
       set cad_prop_id = v_prop,
           county_fips = coalesce(v_fips, county_fips),
           lat = coalesce(v_lat, lat),
           lng = coalesce(v_lng, lng),
           acres = case when v_acres > 0 then v_acres else acres end
     where id = v_listing;
  else
    update public.listings set cad_prop_id = null where id = v_listing;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_sync_listing_parcel on public.listing_parcels;
create trigger trg_sync_listing_parcel
  after insert or update or delete on public.listing_parcels
  for each row execute function public.sync_listing_primary_parcel();

-- Aggregated facts across a listing's tracts (for MLS detail + display).
create or replace function public.listing_parcel_facts(p_listing uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'tract_count', count(*),
    'total_acres', coalesce(sum(p.legal_acreage), 0),
    'improved_count', count(*) filter (where coalesce(p.improvement_value, 0) > 0),
    'land_only_count', count(*) filter (where coalesce(p.improvement_value, 0) = 0),
    'land_value', coalesce(sum(p.land_value), 0),
    'improvement_value', coalesce(sum(p.improvement_value), 0),
    'market_value', coalesce(sum(p.market_value), 0),
    'legal_combined', string_agg(nullif(p.legal_description, ''), ' + ' order by lp.is_primary desc),
    'prop_ids', jsonb_agg(lp.prop_id order by lp.is_primary desc)
  )
  from public.listing_parcels lp
  join public.county_parcels p
    on p.prop_id = lp.prop_id
   and (lp.county_fips is null or p.county_fips = lp.county_fips)
  where lp.listing_id = p_listing;
$$;
grant execute on function public.listing_parcel_facts(uuid) to anon, authenticated;

-- ===== 0019_home_parcels.sql =====
-- ---------------------------------------------------------------------------
-- Wave L3 (consumer) — Multi-parcel home profiles
--
-- Mirrors listing_parcels for the consumer "My Home" side: a home profile can
-- span several CAD tracts (lots bought over time). Links a home to many parcels,
-- marks one primary, and keeps the home's primary CAD id + total lot acreage in
-- sync. Private data — owner + consented realtor read, owner-only write.
-- ---------------------------------------------------------------------------

create table if not exists public.home_parcels (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  source text not null,
  prop_id text not null,
  county_fips text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (home_id, source, prop_id)
);
create index if not exists home_parcels_home_idx on public.home_parcels (home_id);

alter table public.home_parcels enable row level security;

drop policy if exists home_parcels_read on public.home_parcels;
create policy home_parcels_read on public.home_parcels
  for select to authenticated
  using (
    exists (
      select 1 from public.homes h
      where h.id = home_id
        and (h.owner_id = auth.uid() or public.has_home_access(h.id, auth.uid(), false))
    )
  );

drop policy if exists home_parcels_write on public.home_parcels;
create policy home_parcels_write on public.home_parcels
  for all to authenticated
  using (exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid()))
  with check (exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid()));

grant select, insert, update, delete on public.home_parcels to authenticated;
grant all on public.home_parcels to service_role;

-- Keep the home's primary CAD link + total lot acreage synced to its tracts.
create or replace function public.sync_home_primary_parcel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_home uuid := coalesce(new.home_id, old.home_id);
  v_prop text;
  v_fips text;
  v_acres numeric;
begin
  select hp.prop_id, hp.county_fips
    into v_prop, v_fips
  from public.home_parcels hp
  where hp.home_id = v_home
  order by hp.is_primary desc, hp.created_at asc
  limit 1;

  select coalesce(sum(p.legal_acreage), 0)
    into v_acres
  from public.home_parcels hp
  join public.county_parcels p
    on p.prop_id = hp.prop_id
   and (hp.county_fips is null or p.county_fips = hp.county_fips)
  where hp.home_id = v_home;

  if v_prop is not null then
    update public.homes
       set cad_prop_id = v_prop,
           lot_acres = case when v_acres > 0 then v_acres else lot_acres end
     where id = v_home;
  else
    update public.homes set cad_prop_id = null where id = v_home;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_sync_home_parcel on public.home_parcels;
create trigger trg_sync_home_parcel
  after insert or update or delete on public.home_parcels
  for each row execute function public.sync_home_primary_parcel();

-- Aggregated facts across a home's tracts.
create or replace function public.home_parcel_facts(p_home uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'tract_count', count(*),
    'total_acres', coalesce(sum(p.legal_acreage), 0),
    'improved_count', count(*) filter (where coalesce(p.improvement_value, 0) > 0),
    'land_only_count', count(*) filter (where coalesce(p.improvement_value, 0) = 0),
    'land_value', coalesce(sum(p.land_value), 0),
    'improvement_value', coalesce(sum(p.improvement_value), 0),
    'market_value', coalesce(sum(p.market_value), 0),
    'legal_combined', string_agg(nullif(p.legal_description, ''), ' + ' order by hp.is_primary desc),
    'prop_ids', jsonb_agg(hp.prop_id order by hp.is_primary desc)
  )
  from public.home_parcels hp
  join public.county_parcels p
    on p.prop_id = hp.prop_id
   and (hp.county_fips is null or p.county_fips = hp.county_fips)
  where hp.home_id = p_home;
$$;
grant execute on function public.home_parcel_facts(uuid) to authenticated;

-- ===== 0020_cad_l4.sql =====
-- ---------------------------------------------------------------------------
-- Wave L4: CAD ingestion for the 7 launch counties
--
-- Extends county_parcels with real/personal category, mobile-home serials,
-- detail-level (so Tyler geometry-only rows flag agent manual entry), and a
-- per-county refresh status table for the 72-hour auto-refresh loop.
-- Also expands listings for MH serials + Mobile/Manufactured property type.
-- ---------------------------------------------------------------------------

-- Parcel enrichment ----------------------------------------------------------
alter table public.county_parcels
  add column if not exists property_category text
    check (property_category is null or property_category in ('real', 'personal')),
  add column if not exists mh_serial_number text,
  add column if not exists mh_hud_label text,
  add column if not exists mh_make text,
  add column if not exists mh_model text,
  add column if not exists mh_year int,
  add column if not exists detail_level text not null default 'full'
    check (detail_level in ('full', 'partial', 'geometry_only')),
  add column if not exists needs_agent_detail boolean not null default false;

create index if not exists county_parcels_mh_serial_idx
  on public.county_parcels (mh_serial_number)
  where mh_serial_number is not null;

create index if not exists county_parcels_category_idx
  on public.county_parcels (property_category);

create index if not exists county_parcels_source_ingested_idx
  on public.county_parcels (source, ingested_at desc);

-- Per-county CAD refresh status (72-hour auto-refresh) -----------------------
create table if not exists public.cad_county_status (
  source text primary key,
  county_fips text not null,
  county_name text not null,
  ingest_mode text not null default 'arcgis'
    check (ingest_mode in ('arcgis', 'file', 'manual')),
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  parcel_count int not null default 0,
  real_count int not null default 0,
  personal_count int not null default 0,
  mh_serial_count int not null default 0,
  refresh_interval_hours int not null default 72,
  source_url text,
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.cad_county_status enable row level security;

drop policy if exists cad_county_status_public_read on public.cad_county_status;
create policy cad_county_status_public_read on public.cad_county_status
  for select to anon, authenticated using (true);

grant select on public.cad_county_status to anon, authenticated;
grant all    on public.cad_county_status to service_role;

-- Seed the 7 launch counties (+ optional Montgomery for Cleveland) ----------
insert into public.cad_county_status
  (source, county_fips, county_name, ingest_mode, source_url, notes)
values
  ('polk_cad',        '48373', 'Polk County',        'arcgis',
   'https://utility.arcgis.com/usrsvcs/servers/60f9b6d8a8c546b6b0aa1fb4999bee8e/rest/services/PolkCADWebService/FeatureServer/0',
   'Polk CAD BIS FeatureServer'),
  ('angelina_cad',    '48005', 'Angelina County',    'arcgis',
   'https://services6.arcgis.com/Cj2HGLAAprJTsy8b/ArcGIS/rest/services/AngelinaParcels/FeatureServer/0',
   'Angelina CAD parcels FeatureServer'),
  ('trinity_cad',     '48455', 'Trinity County',     'arcgis',
   'https://services6.arcgis.com/hLftBSoB3mrzkhE4/arcgis/rest/services/TrinityCADWebService/FeatureServer/0',
   'Trinity CAD BIS FeatureServer'),
  ('tyler_cad',       '48457', 'Tyler County',       'file',
   'https://tylercad.net/wp-content/uploads/2025/12/Parcels.zip',
   'Download-only CAD shapefile (geometry + prop_id); agent supplies ownership/legal/serial detail'),
  ('san_jacinto_cad', '48407', 'San Jacinto County', 'arcgis',
   'https://services8.arcgis.com/Cj28SFmpkCtGCeEQ/arcgis/rest/services/SanJacintoCADWebService/FeatureServer/0',
   'San Jacinto CAD BIS FeatureServer'),
  ('liberty_cad',     '48291', 'Liberty County',     'arcgis',
   'https://services3.arcgis.com/LbQai106UcFy2LlR/arcgis/rest/services/LibertyCADWebService/FeatureServer/0',
   'Liberty CAD BIS FeatureServer'),
  ('walker_cad',      '48471', 'Walker County',      'arcgis',
   'https://services6.arcgis.com/hEVWOxh6v1J8BInI/arcgis/rest/services/WalkerCADWebService/FeatureServer/0',
   'Walker CAD BIS FeatureServer'),
  ('montgomery_cad',  '48339', 'Montgomery County',  'arcgis',
   'https://services1.arcgis.com/PRoAPGnMSUqvTrzq/arcgis/rest/services/Tax_Parcel_view/FeatureServer/0',
   'Optional for Cleveland — Montgomery Tax_Parcel_view FeatureServer')
on conflict (source) do update set
  county_fips = excluded.county_fips,
  county_name = excluded.county_name,
  ingest_mode = excluded.ingest_mode,
  source_url  = excluded.source_url,
  notes       = excluded.notes,
  updated_at  = now();

-- Listings: mobile-home serial + Mobile/Manufactured type -------------------
alter table public.listings
  add column if not exists mh_serial_number text,
  add column if not exists mh_hud_label text;

-- Expand property_type check to include Mobile / Manufactured.
alter table public.listings drop constraint if exists listings_property_type_check;
alter table public.listings
  add constraint listings_property_type_check
  check (
    property_type is null
    or property_type in (
      'Single Family',
      'Farm and Ranch',
      'Condo',
      'Town Home',
      'Mobile / Manufactured'
    )
  );

create index if not exists listings_mh_serial_idx
  on public.listings (mh_serial_number)
  where mh_serial_number is not null;

-- Homes mirror (consumer My Home) -------------------------------------------
alter table public.homes
  add column if not exists mh_serial_number text,
  add column if not exists mh_hud_label text;

create index if not exists homes_mh_serial_idx
  on public.homes (mh_serial_number)
  where mh_serial_number is not null;

-- ===== 0021_cad_l6_search.sql =====
-- Wave L6: CAD advanced search fields (Owner ID) + indexes for facet search.
alter table public.county_parcels
  add column if not exists cad_owner_id text;

create index if not exists county_parcels_owner_id_idx
  on public.county_parcels (cad_owner_id)
  where cad_owner_id is not null;

create index if not exists county_parcels_tax_year_idx
  on public.county_parcels (tax_year)
  where tax_year is not null;

create index if not exists county_parcels_prop_category_tax_idx
  on public.county_parcels (property_category, tax_year);

-- ===== 0022_shi_parcels_mvt_source.sql =====
-- SHI map click disambiguation: include source + county_fips in MVT props.
-- Property IDs can collide across counties; tiles must carry county identity.

create or replace function public.parcels_mvt(z int, x int, y int)
returns bytea
language plpgsql stable parallel safe security definer set search_path = public as $$
declare
  result bytea;
  env geometry := ST_TileEnvelope(z, x, y);   -- 3857
begin
  if z < 13 then
    return ''::bytea;
  end if;
  select ST_AsMVT(t, 'parcels', 4096, 'geom') into result
  from (
    select
      p.prop_id,
      p.source,
      p.county_fips,
      p.owner_name,
      p.situs_address,
      p.legal_acreage,
      p.market_value,
      ST_AsMVTGeom(
        ST_Transform(p.geom, 3857),
        env,
        4096, 64, true
      ) as geom
    from public.county_parcels p
    where p.geom is not null
      and p.geom && ST_Transform(env, 4326)
  ) as t
  where t.geom is not null;
  return coalesce(result, ''::bytea);
end;
$$;

grant execute on function public.parcels_mvt(int, int, int) to anon, authenticated;

-- ===== 0023_shi_market_frames.sql =====
-- SHI Market Frames — private study folders + saved map frames + snapshots.
-- Never writes to county_parcels. Agent-owned only (RLS). Hard caps enforced in app.

create table if not exists public.shi_study_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  acronym text not null,
  county_source text not null,
  county_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shi_study_folders_owner_idx
  on public.shi_study_folders (owner_id, county_source, updated_at desc);

create table if not exists public.shi_market_frames (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.shi_study_folders(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  acronym text not null,
  color text not null default '#17335e',
  boundary jsonb not null,
  map_center_lat double precision,
  map_center_lng double precision,
  map_zoom double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shi_market_frames_folder_idx
  on public.shi_market_frames (folder_id, updated_at desc);

create index if not exists shi_market_frames_owner_idx
  on public.shi_market_frames (owner_id);

-- Frozen analysis + optional thumbnail path (storage). Append/update by owner only.
create table if not exists public.shi_frame_snapshots (
  id uuid primary key default gen_random_uuid(),
  frame_id uuid not null unique references public.shi_market_frames(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  metrics jsonb not null default '{}'::jsonb,
  parcels jsonb not null default '[]'::jsonb,
  thumbnail_path text,
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shi_study_folders enable row level security;
alter table public.shi_market_frames enable row level security;
alter table public.shi_frame_snapshots enable row level security;

drop policy if exists "shi folders owner all" on public.shi_study_folders;
create policy "shi folders owner all" on public.shi_study_folders
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "shi frames owner all" on public.shi_market_frames;
create policy "shi frames owner all" on public.shi_market_frames
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "shi snapshots owner all" on public.shi_frame_snapshots;
create policy "shi snapshots owner all" on public.shi_frame_snapshots
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on public.shi_study_folders to authenticated;
grant select, insert, update, delete on public.shi_market_frames to authenticated;
grant select, insert, update, delete on public.shi_frame_snapshots to authenticated;

-- Private thumbnails: shi-studies/{owner_id}/{frame_id}.jpg
insert into storage.buckets (id, name, public)
values ('shi-studies', 'shi-studies', false)
on conflict (id) do nothing;

drop policy if exists "shi studies owner read" on storage.objects;
create policy "shi studies owner read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'shi-studies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shi studies owner write" on storage.objects;
create policy "shi studies owner write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shi-studies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shi studies owner update" on storage.objects;
create policy "shi studies owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shi-studies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shi studies owner delete" on storage.objects;
create policy "shi studies owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shi-studies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===== 0024_shi_backlog_harden.sql =====
-- SHI backlog harden: owner consistency + search/analyze indexes.
-- Safe to re-run. Never writes CAD parcel values.

-- Frame owner must match its folder owner.
create or replace function public.shi_assert_frame_owner()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.shi_study_folders f
    where f.id = new.folder_id
      and f.owner_id = new.owner_id
  ) then
    raise exception 'shi_market_frames.owner_id must match folder owner';
  end if;
  return new;
end;
$$;

drop trigger if exists shi_market_frames_owner_check on public.shi_market_frames;
create trigger shi_market_frames_owner_check
  before insert or update of folder_id, owner_id
  on public.shi_market_frames
  for each row
  execute function public.shi_assert_frame_owner();

-- Snapshot owner must match its frame owner.
create or replace function public.shi_assert_snapshot_owner()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.shi_market_frames fr
    where fr.id = new.frame_id
      and fr.owner_id = new.owner_id
  ) then
    raise exception 'shi_frame_snapshots.owner_id must match frame owner';
  end if;
  return new;
end;
$$;

drop trigger if exists shi_frame_snapshots_owner_check on public.shi_frame_snapshots;
create trigger shi_frame_snapshots_owner_check
  before insert or update of frame_id, owner_id
  on public.shi_frame_snapshots
  for each row
  execute function public.shi_assert_snapshot_owner();

-- Search: trigram indexes (ILIKE / substring).
create extension if not exists pg_trgm;

create index if not exists county_parcels_owner_name_trgm_idx
  on public.county_parcels
  using gin (owner_name gin_trgm_ops)
  where owner_name is not null;

create index if not exists county_parcels_situs_trgm_idx
  on public.county_parcels
  using gin (situs_address gin_trgm_ops)
  where situs_address is not null;

create index if not exists county_parcels_legal_trgm_idx
  on public.county_parcels
  using gin (legal_description gin_trgm_ops)
  where legal_description is not null;

-- Analyze: county + centroid bbox scans.
create index if not exists county_parcels_source_centroid_idx
  on public.county_parcels (source, centroid_lat, centroid_lng)
  where centroid_lat is not null and centroid_lng is not null;

-- ===== 0025_shi_prospects.sql =====
-- SHI-3 Prospects — agent-private pipeline referencing public parcels.
-- Never writes county_parcels / CAD. Snapshot columns are display-only and may go stale.

create table if not exists public.shi_prospects (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  -- Canonical public-record reference
  source text not null,
  prop_id text not null,
  county_fips text,
  county_name text not null,
  -- Display snapshot at save time (re-fetch live detail via SHI APIs)
  label text,
  owner_name_snapshot text,
  situs_address_snapshot text,
  situs_city_snapshot text,
  legal_acreage_snapshot double precision,
  market_value_snapshot numeric,
  centroid_lat double precision,
  centroid_lng double precision,
  status text not null default 'Saved'
    check (
      status in (
        'Saved',
        'Researching',
        'Watching',
        'Contacted',
        'Qualified',
        'Opportunity',
        'Closed',
        'Archived'
      )
    ),
  tags text[] not null default '{}',
  seller_client_id uuid references public.seller_clients(id) on delete set null,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, source, prop_id)
);

create index if not exists shi_prospects_agent_activity_idx
  on public.shi_prospects (agent_id, last_activity_at desc);

create index if not exists shi_prospects_agent_status_idx
  on public.shi_prospects (agent_id, status);

create index if not exists shi_prospects_parcel_idx
  on public.shi_prospects (source, prop_id);

create table if not exists public.shi_prospect_notes (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.shi_prospects(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists shi_prospect_notes_prospect_idx
  on public.shi_prospect_notes (prospect_id, created_at desc);

alter table public.shi_prospects enable row level security;
alter table public.shi_prospect_notes enable row level security;

drop policy if exists "shi prospects agent all" on public.shi_prospects;
create policy "shi prospects agent all" on public.shi_prospects
  for all to authenticated
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

drop policy if exists "shi prospect notes agent all" on public.shi_prospect_notes;
create policy "shi prospect notes agent all" on public.shi_prospect_notes
  for all to authenticated
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

grant select, insert, update, delete on public.shi_prospects to authenticated;
grant select, insert, update, delete on public.shi_prospect_notes to authenticated;

-- ===== 0026_shi_farms.sql =====
-- SHI-4 Farms — agent territories + review baselines.
-- Membership is computed live via analyzeArea. Never writes county_parcels.
-- "What changed" in V1 = live CAD vs last review baseline (not full CAD event history).

create table if not exists public.shi_farms (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  county_source text not null,
  county_name text not null,
  boundary jsonb not null,
  map_center_lat double precision,
  map_center_lng double precision,
  map_zoom double precision,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shi_farms_agent_idx
  on public.shi_farms (agent_id, updated_at desc);

create index if not exists shi_farms_county_idx
  on public.shi_farms (agent_id, county_source);

-- Snapshot of parcels inside the farm at create / mark-reviewed time.
create table if not exists public.shi_farm_baselines (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null unique references public.shi_farms(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  parcels jsonb not null default '[]'::jsonb,
  parcel_count integer not null default 0,
  capped boolean not null default false,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shi_farm_baselines_agent_idx
  on public.shi_farm_baselines (agent_id);

alter table public.shi_farms enable row level security;
alter table public.shi_farm_baselines enable row level security;

drop policy if exists "shi farms agent all" on public.shi_farms;
create policy "shi farms agent all" on public.shi_farms
  for all to authenticated
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

drop policy if exists "shi farm baselines agent all" on public.shi_farm_baselines;
create policy "shi farm baselines agent all" on public.shi_farm_baselines
  for all to authenticated
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

grant select, insert, update, delete on public.shi_farms to authenticated;
grant select, insert, update, delete on public.shi_farm_baselines to authenticated;

-- ===== 0027_cad_observation_events.sql =====
-- Archie's Intelligence — CAD observation timeline (4.2 / thin 4.3)
-- Tracks when Archie first/last saw a parcel and owner-field changes between pulls.
-- This is NOT deed / sale history. No seller-probability scores live in SQL.

alter table public.county_parcels
  add column if not exists first_seen_at timestamptz,
  add column if not exists last_seen_at timestamptz;

-- Backfill from existing ingest timestamps (best available observation start).
update public.county_parcels
set
  first_seen_at = coalesce(first_seen_at, ingested_at, now()),
  last_seen_at = coalesce(last_seen_at, ingested_at, now())
where first_seen_at is null
   or last_seen_at is null;

create index if not exists county_parcels_source_last_seen_idx
  on public.county_parcels (source, last_seen_at desc);

-- Observed field changes between CAD pulls (owner first; more fields later).
create table if not exists public.county_parcel_change_events (
  id bigserial primary key,
  source text not null,
  prop_id text not null,
  field text not null,
  old_value text,
  new_value text,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists county_parcel_change_events_parcel_idx
  on public.county_parcel_change_events (source, prop_id, observed_at desc);

create index if not exists county_parcel_change_events_field_idx
  on public.county_parcel_change_events (source, field, observed_at desc);

alter table public.county_parcel_change_events enable row level security;

drop policy if exists county_parcel_change_events_public_read
  on public.county_parcel_change_events;
create policy county_parcel_change_events_public_read
  on public.county_parcel_change_events
  for select
  using (true);

comment on table public.county_parcel_change_events is
  'Archie-observed CAD field changes between pulls. Not county deed dates.';
comment on column public.county_parcels.first_seen_at is
  'First time Archie stored this parcel from a CAD pull.';
comment on column public.county_parcels.last_seen_at is
  'Most recent CAD pull where this parcel was present.';

-- ===== 0028_cad_absence_and_feed.sql =====
-- Archie's Intelligence — 4.3 full observation
-- Marks parcels missing from a full-county CAD pull (absent_at).
-- Lightweight: no backfill of 345k rows.

alter table public.county_parcels
  add column if not exists absent_at timestamptz;

create index if not exists county_parcels_source_absent_idx
  on public.county_parcels (source, absent_at)
  where absent_at is not null;

comment on column public.county_parcels.absent_at is
  'Set when Archie did not see this parcel in a full-county CAD pull; cleared when seen again. Not a deed/sale event.';

-- ===== 0029_product_analytics_events.sql =====
-- STORY-ANALYTICS-DESTINATION
-- First-party product usage events (Story OS catalog).
-- Privacy: scrubbed props only — no owner/address/passcode/message bodies.
-- Not seller listing_analytics_events. Not a dashboard product.

create table if not exists public.product_analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null,
  props jsonb not null default '{}'::jsonb,
  -- Optional actor when session present; never required for marketplace funnel.
  user_id uuid null references auth.users (id) on delete set null,
  client_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint product_analytics_events_name_len check (char_length(event_name) between 1 and 80)
);

create index if not exists product_analytics_events_name_created_idx
  on public.product_analytics_events (event_name, created_at desc);

create index if not exists product_analytics_events_created_idx
  on public.product_analytics_events (created_at desc);

comment on table public.product_analytics_events is
  'Story OS product usage events (catalog). Props are scrubbed enums/ids only — not CAD PII.';

alter table public.product_analytics_events enable row level security;

-- Insert: anon + authenticated may write (marketplace funnel includes logged-out).
-- No public SELECT — ops/service-role only. Prevents “who viewed what” theater.
drop policy if exists product_analytics_events_insert on public.product_analytics_events;
create policy product_analytics_events_insert
  on public.product_analytics_events
  for insert
  to anon, authenticated
  with check (true);

-- Authenticated users may read only their own rows (optional self-check; no cross-user).
drop policy if exists product_analytics_events_select_own on public.product_analytics_events;
create policy product_analytics_events_select_own
  on public.product_analytics_events
  for select
  to authenticated
  using (user_id is not null and user_id = auth.uid());

-- ===== 0030_product_analytics_grants.sql =====
-- Grants for product_analytics_events (0029 created the table; SQL editor
-- runs as postgres without default table grants to anon/authenticated).

grant usage on schema public to anon, authenticated, service_role;

grant insert on public.product_analytics_events to anon, authenticated, service_role;
grant select on public.product_analytics_events to authenticated, service_role;

-- Identity sequence used by bigint generated always as identity
do $$
declare
  seq_name text;
begin
  select pg_get_serial_sequence('public.product_analytics_events', 'id')
    into seq_name;
  if seq_name is not null then
    execute format(
      'grant usage, select on sequence %s to anon, authenticated, service_role',
      seq_name
    );
  end if;
end $$;

-- ===== 0031_cad_ops_scale.sql =====
-- ARCHIE-COUNTY-OPS-SCALE
-- Status honesty + feed index for multi-county expansion.
-- Does not invent per-county physical tables. Shared tables stay keyed by source.

-- Coverage fields (audit + post-ingest). Nullable until first audit/ingest writes them.
alter table public.cad_county_status
  add column if not exists db_parcel_count int null;

alter table public.cad_county_status
  add column if not exists source_unique_prop_ids int null;

alter table public.cad_county_status
  add column if not exists source_feature_count int null;

alter table public.cad_county_status
  add column if not exists last_audit_at timestamptz null;

alter table public.cad_county_status
  add column if not exists absence_cap_hit boolean not null default false;

alter table public.cad_county_status
  add column if not exists ingest_capped boolean not null default false;

comment on column public.cad_county_status.parcel_count is
  'Unique prop_ids mapped in the last successful ingest pull (post-dedupe). Not ArcGIS feature count.';
comment on column public.cad_county_status.db_parcel_count is
  'Live county_parcels row count for this source after last successful ingest/audit.';
comment on column public.cad_county_status.source_unique_prop_ids is
  'ArcGIS (or file) unique prop_id universe from last cad:audit — true searchable parcel set.';
comment on column public.cad_county_status.source_feature_count is
  'Raw CAD feature count from last audit (may include duplicate prop_ids).';
comment on column public.cad_county_status.absence_cap_hit is
  'True when last full pull hit MAX_ABSENCE_MARKS — remaining unmarked absences exist.';
comment on column public.cad_county_status.ingest_capped is
  'True when last ingest stopped early due to CAD_MAX_INGEST_ROWS / --limit soft cap.';

-- County observation feed orders by (source, observed_at desc).
create index if not exists county_parcel_change_events_source_observed_idx
  on public.county_parcel_change_events (source, observed_at desc);

-- Readiness samples parcels by first/last seen within a source.
create index if not exists county_parcels_source_first_seen_idx
  on public.county_parcels (source, first_seen_at)
  where first_seen_at is not null;

-- ===== 0032_living_marks.sql =====
-- STORY-WALK SW-2 — Living Mark media library
-- Public still/video URLs for Agent World circle. Apply on real Supabase.
-- Local plain-Postgres RLS tests may skip storage schema.

alter table public.profiles
  add column if not exists living_mark_video_url text;

comment on column public.profiles.living_mark_video_url is
  'Story Walk Living Mark welcome video URL (SW-2+). photo_url remains the still/poster.';

insert into storage.buckets (id, name, public)
values ('living-marks', 'living-marks', true)
on conflict (id) do nothing;

-- Owners write under {user_id}/… ; public read for Agent World.
drop policy if exists "living marks owner write" on storage.objects;
create policy "living marks owner write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'living-marks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "living marks owner update" on storage.objects;
create policy "living marks owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'living-marks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "living marks owner delete" on storage.objects;
create policy "living marks owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'living-marks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "living marks public read" on storage.objects;
create policy "living marks public read" on storage.objects
  for select to public
  using (bucket_id = 'living-marks');

-- ===== 0033_agent_world_engagement.sql =====
-- STORY-WALK SW-5 — Agent World engagement (agent-owned, honest)
-- Separate from product_analytics_events (ops catalog; no agent SELECT).
-- Guests: no visitor_user_id (session visits only — no permanent fingerprint).

create table if not exists public.agent_world_engagement (
  id bigint generated always as identity primary key,
  agent_id text not null,
  event_name text not null,
  audience text not null
    check (audience in ('guest', 'account', 'own')),
  -- Account visitors only. Never invent a guest fingerprint id.
  visitor_user_id text null,
  cta text null
    check (
      cta is null
      or cta in ('listings', 'inventory', 'find_agents')
    ),
  created_at timestamptz not null default now(),
  constraint agent_world_engagement_event_len
    check (char_length(event_name) between 1 and 64)
);

create index if not exists agent_world_engagement_agent_created_idx
  on public.agent_world_engagement (agent_id, created_at desc);

create index if not exists agent_world_engagement_agent_event_idx
  on public.agent_world_engagement (agent_id, event_name);

comment on table public.agent_world_engagement is
  'Story Walk Agent World engagement for the owning agent. Guest rows never carry a durable visitor id.';

alter table public.agent_world_engagement enable row level security;

drop policy if exists agent_world_engagement_insert on public.agent_world_engagement;
create policy agent_world_engagement_insert
  on public.agent_world_engagement
  for insert
  to anon, authenticated
  with check (
    audience in ('guest', 'account', 'own')
    and (
      (audience = 'guest' and visitor_user_id is null)
      or (audience in ('account', 'own'))
    )
  );

-- Owning agent reads their own world only.
drop policy if exists agent_world_engagement_select_owner on public.agent_world_engagement;
create policy agent_world_engagement_select_owner
  on public.agent_world_engagement
  for select
  to authenticated
  using (agent_id = auth.uid()::text);

-- ===== 0034_corridor_road_segments.sql =====
-- Corridors 2.0-C — road segment cache + approx parcel frontage (PostGIS).
-- Soft dependency: live TxDOT fetch still works when these tables are empty.
-- Rule version: corridor-frontage-v1 (see docs/shi/ARCHIE-CORRIDORS-2.md)

create table if not exists public.corridor_road_segments (
  id text primary key,
  county_fips text not null,
  route_id text not null,
  aadt integer,
  geom geometry(MultiLineString, 4326) not null,
  source text not null default 'txdot',
  updated_at timestamptz not null default now()
);

create index if not exists corridor_road_segments_fips_gix
  on public.corridor_road_segments using gist (geom);

create index if not exists corridor_road_segments_fips_idx
  on public.corridor_road_segments (county_fips);

create table if not exists public.corridor_traffic_observations (
  id bigserial primary key,
  county_fips text not null,
  station_id text not null,
  on_road text,
  year integer not null,
  aadt integer,
  lat double precision,
  lng double precision,
  geom geometry(Point, 4326),
  source text not null default 'txdot',
  updated_at timestamptz not null default now(),
  constraint corridor_traffic_obs_unique
    unique (county_fips, station_id, year)
);

create index if not exists corridor_traffic_obs_fips_idx
  on public.corridor_traffic_observations (county_fips);

create index if not exists corridor_traffic_obs_gix
  on public.corridor_traffic_observations using gist (geom);

comment on table public.corridor_road_segments is
  'Corridors 2.0-C cached TxDOT corridor linework for frontage / exposure. Not live congestion.';

comment on table public.corridor_traffic_observations is
  'Corridors 2.0-C cached TxDOT station-year AADT observations.';

-- Approx frontage: parcel boundary length within buffer of each nearby road segment.
-- Returns feet. Label UI as APPROX — not surveyed.
create or replace function public.corridor_parcel_frontage(
  p_prop_id text,
  p_source text,
  p_buffer_m double precision default 35
)
returns table (
  route_id text,
  approx_frontage_ft double precision,
  aadt integer,
  segment_id text
)
language sql
stable
parallel safe
security definer
set search_path = public
as $$
  with parcel as (
    select ST_Multi(geom) as geom
    from public.county_parcels
    where prop_id = p_prop_id
      and source = p_source
      and geom is not null
    limit 1
  ),
  roads as (
    select s.id, s.route_id, s.aadt, s.geom
    from public.corridor_road_segments s
    cross join parcel p
    where s.geom && ST_Expand(p.geom, 0.002)
  ),
  hits as (
    select
      r.route_id,
      r.aadt,
      r.id as segment_id,
      ST_Length(
        ST_Transform(
          ST_Intersection(
            ST_Boundary(p.geom),
            ST_Buffer(r.geom::geography, p_buffer_m)::geometry
          ),
          3857
        )
      ) * 3.28084 as ft
    from roads r
    cross join parcel p
    where ST_Intersects(
      ST_Boundary(p.geom),
      ST_Buffer(r.geom::geography, p_buffer_m)::geometry
    )
  )
  select
    h.route_id,
    round(sum(h.ft)::numeric, 1)::double precision as approx_frontage_ft,
    max(h.aadt)::integer as aadt,
    (array_agg(h.segment_id order by h.ft desc))[1] as segment_id
  from hits h
  group by h.route_id
  having sum(h.ft) >= 25;
$$;

grant execute on function public.corridor_parcel_frontage(text, text, double precision)
  to authenticated;

alter table public.corridor_road_segments enable row level security;
alter table public.corridor_traffic_observations enable row level security;

-- Pro read via authenticated; writes via service role / security definer upserts later.
drop policy if exists corridor_road_segments_select on public.corridor_road_segments;
create policy corridor_road_segments_select
  on public.corridor_road_segments for select
  to authenticated
  using (true);

drop policy if exists corridor_traffic_obs_select on public.corridor_traffic_observations;
create policy corridor_traffic_obs_select
  on public.corridor_traffic_observations for select
  to authenticated
  using (true);

-- ===== 0035_corridor_segment_grants.sql =====
-- C2.0-D companion: grants for corridor segment cache (tables created in 0034).
-- Owner may already have run 0034; this unlocks service_role soft-cache writes
-- and authenticated reads via PostgREST.

grant select on public.corridor_road_segments to authenticated, service_role;
grant select on public.corridor_traffic_observations to authenticated, service_role;
grant insert, update, delete on public.corridor_road_segments to service_role;
grant insert, update, delete on public.corridor_traffic_observations to service_role;
grant usage, select on sequence public.corridor_traffic_observations_id_seq to service_role;

-- ===== 0036_clerk_deeds_index.sql =====
-- DEEDS-1 — Owned clerk deed index (launch 7). Dark store until peer-grade reveal.
-- Not CAD observation. Not DataTree / ATTOM. Not deed dates invented from owner diffs.

create table if not exists public.clerk_deed_transfers (
  id bigserial primary key,
  county_fips text not null,
  prop_id text,
  recorded_date date,
  grantor text,
  grantee text,
  instrument text,
  volume_page text,
  doc_number text,
  source_note text not null default 'owned-clerk',
  ingested_at timestamptz not null default now()
);

create unique index if not exists clerk_deed_transfers_fips_doc_uidx
  on public.clerk_deed_transfers (county_fips, doc_number)
  where doc_number is not null;

create index if not exists clerk_deed_transfers_fips_prop_idx
  on public.clerk_deed_transfers (county_fips, prop_id);

create index if not exists clerk_deed_transfers_fips_date_idx
  on public.clerk_deed_transfers (county_fips, recorded_date desc nulls last);

comment on table public.clerk_deed_transfers is
  'DEEDS-1 owned clerk transfer index for launch 7. Never treat CAD owner diffs as deeds. User reveal stays closed until DEEDS-2 peer-grade gate.';

create table if not exists public.clerk_county_coverage (
  county_fips text primary key,
  ready boolean not null default false,
  peer_grade boolean not null default false,
  transfer_count integer not null default 0,
  notes text,
  updated_at timestamptz not null default now()
);

comment on table public.clerk_county_coverage is
  'DEEDS-1 per-county clerk coverage flags. ready=true means index rows exist; peer_grade / product reveal is DEEDS-2.';

grant select on public.clerk_deed_transfers to authenticated, service_role;
grant select on public.clerk_county_coverage to authenticated, service_role;
grant insert, update, delete on public.clerk_deed_transfers to service_role;
grant insert, update, delete on public.clerk_county_coverage to service_role;
grant usage, select on sequence public.clerk_deed_transfers_id_seq to service_role;

-- ===== 0037_corridor_intersection_distance.sql =====
-- IX-1 — approx meters to nearest mapped-road crossing (corridor-intersection-v1).
-- Not survey-grade. Null / empty when no crossing found — never invent.

create or replace function public.corridor_parcel_intersection_distance(
  p_prop_id text,
  p_source text,
  p_join_m double precision default 20,
  p_search_m double precision default 200
)
returns table (
  approx_distance_m double precision,
  route_a text,
  route_b text
)
language sql
stable
parallel safe
security definer
set search_path = public
as $$
  with parcel as (
    select
      ST_Multi(geom) as geom,
      ST_Centroid(geom) as c
    from public.county_parcels
    where prop_id = p_prop_id
      and source = p_source
      and geom is not null
    limit 1
  ),
  nearby as (
    select s.id, s.route_id, s.geom
    from public.corridor_road_segments s
    cross join parcel p
    where ST_DWithin(s.geom::geography, p.geom::geography, p_search_m)
  ),
  pairs as (
    select
      a.route_id as route_a,
      b.route_id as route_b,
      ST_ClosestPoint(a.geom, b.geom) as cross_pt
    from nearby a
    join nearby b
      on a.id < b.id
     and a.route_id is distinct from b.route_id
    where ST_DWithin(a.geom::geography, b.geom::geography, p_join_m)
  )
  select
    round(
      ST_Distance(pairs.cross_pt::geography, parcel.c::geography)::numeric,
      0
    )::double precision as approx_distance_m,
    pairs.route_a,
    pairs.route_b
  from pairs
  cross join parcel
  order by 1 asc
  limit 1;
$$;

comment on function public.corridor_parcel_intersection_distance(text, text, double precision, double precision) is
  'IX-1 corridor-intersection-v1 — approx meters from parcel centroid to nearest mapped-road crossing. Not survey-grade.';

grant execute on function public.corridor_parcel_intersection_distance(text, text, double precision, double precision)
  to authenticated, service_role;

-- ===== 0038_parcel_neighbors.sql =====
-- ARCHIE-NEIGHBORS N1 — thin CAD parcel neighbors (touches / near buffer).
-- Calculated from owned county_parcels.geom only. Not survey-grade.
-- Empty when subject geom missing or no neighbors — never invent.

create or replace function public.parcel_neighbors(
  p_prop_id text,
  p_source text,
  p_buffer_m double precision default 2,
  p_limit integer default 24
)
returns table (
  prop_id text,
  source text,
  county_fips text,
  owner_name text,
  cad_owner_id text,
  legal_acreage double precision,
  relation text,
  distance_m double precision
)
language sql
stable
parallel safe
security definer
set search_path = public
as $$
  with subject as (
    select
      geom,
      source,
      prop_id,
      county_fips
    from public.county_parcels
    where prop_id = p_prop_id
      and source = p_source
      and geom is not null
    limit 1
  ),
  /* ~degree expand for GiST prefilter (buffer meters → rough degrees) */
  box as (
    select
      s.*,
      ST_Expand(
        s.geom,
        greatest(coalesce(p_buffer_m, 2), 2) / 111320.0
      ) as search_geom
    from subject s
  )
  select
    n.prop_id,
    n.source,
    n.county_fips,
    n.owner_name,
    n.cad_owner_id,
    n.legal_acreage,
    case
      when ST_Touches(b.geom, n.geom) then 'touches'
      else 'near'
    end as relation,
    round(
      ST_Distance(b.geom::geography, n.geom::geography)::numeric,
      1
    )::double precision as distance_m
  from box b
  join public.county_parcels n
    on n.source = b.source
   and n.prop_id is distinct from b.prop_id
   and n.geom is not null
   and n.geom && b.search_geom
   and (
     ST_Touches(b.geom, n.geom)
     or ST_DWithin(
       b.geom::geography,
       n.geom::geography,
       greatest(coalesce(p_buffer_m, 2), 0)
     )
   )
  order by
    case when ST_Touches(b.geom, n.geom) then 0 else 1 end,
    ST_Distance(b.geom::geography, n.geom::geography),
    n.prop_id
  limit greatest(coalesce(p_limit, 24), 1);
$$;

comment on function public.parcel_neighbors(text, text, double precision, integer) is
  'ARCHIE-NEIGHBORS N1 — CAD parcels that touch or fall within buffer_m of subject. Not survey-grade.';

grant execute on function public.parcel_neighbors(text, text, double precision, integer)
  to authenticated, service_role;

-- ===== 0039_prelaunch_security.sql =====
-- Pre-launch security: lock privilege columns, close RLS gaps.
-- Does NOT delete users, listings, or county/CAD truth data.

-- 1) account_kind / TREC fields cannot be changed by the client.
create or replace function public.profiles_lock_privilege_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.account_kind is distinct from old.account_kind then
      raise exception 'account_kind cannot be changed by the client';
    end if;
    if new.trec_status is distinct from old.trec_status then
      raise exception 'trec_status cannot be changed by the client';
    end if;
    if new.trec_license is distinct from old.trec_license then
      raise exception 'trec_license cannot be changed by the client';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_privilege_columns on public.profiles;
create trigger profiles_lock_privilege_columns
  before update on public.profiles
  for each row
  execute function public.profiles_lock_privilege_columns();

-- 2) Tables that inherited table grants but never got RLS.
alter table if exists public.boost_county_slot_overrides enable row level security;
alter table if exists public.clerk_deed_transfers enable row level security;
alter table if exists public.clerk_county_coverage enable row level security;

-- No client policies: service_role (ingest / SHI server clients) still bypasses RLS.

-- 3) Analytics events: only the listing's agent (or a broker) may insert.
drop policy if exists listing_analytics_events_insert on public.listing_analytics_events;
create policy listing_analytics_events_insert
  on public.listing_analytics_events
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.agent_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.account_kind = 'broker'
    )
  );

-- 4) Column-only REVOKE is not enough against table-level GRANT SELECT.
-- Follow with 0040_listings_hide_seller_passcode.sql.

-- ===== 0040_listings_hide_seller_passcode.sql =====
-- Hide seller passcodes from public listing reads.
-- Does NOT delete users, listings, or county/CAD truth data.
--
-- Why this is a second file: REVOKE SELECT (one_column) does not override a
-- table-level GRANT SELECT. We revoke the table grant, then re-grant every
-- public column except seller_access_code.

revoke select on public.listings from anon, authenticated, public;

grant select (
  id,
  agent_id,
  brokerage_id,
  created_at,
  updated_at,
  mls_number,
  price,
  address_serif,
  city,
  county_name,
  county_fips,
  state,
  zip,
  beds,
  baths,
  sqft,
  acres,
  lot_size,
  year_built,
  description,
  property_type,
  status,
  has_office,
  has_garage,
  has_pool,
  has_hoa,
  photo_urls,
  lat,
  lng,
  listing_agent_name,
  listing_agent_license,
  brokerage_name,
  lead_paint_disclosure_provided,
  sellers_disclosure_provided,
  days_on_market,
  like_count,
  save_count,
  comment_count,
  cad_prop_id,
  mh_serial_number,
  mh_hud_label
) on public.listings to anon, authenticated;

-- ===== 0041_billing_boundary.sql =====
-- Payment / entitlement boundary. No card numbers. No live provider.
-- Payment failure must NOT cascade-delete Prospects, Farms, Studies,
-- CRM, My Home, or auth users.
-- Does NOT delete users, listings, or county/CAD truth data.

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  provider text not null default 'unset',
  provider_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_customer_id)
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  billing_customer_id uuid references public.billing_customers (id) on delete restrict,
  provider text not null default 'unset',
  provider_subscription_id text,
  plan text,
  status text not null default 'none',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_verified_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text,
  processed_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists billing_subscriptions_user_idx
  on public.billing_subscriptions (user_id);

alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_webhook_events enable row level security;

revoke all on public.billing_customers from anon, authenticated, public;
revoke all on public.billing_subscriptions from anon, authenticated, public;
revoke all on public.billing_webhook_events from anon, authenticated, public;

comment on table public.billing_customers is
  'Provider customer reference. Server-only. Failed payment must not delete user data.';
comment on table public.billing_subscriptions is
  'Trusted subscription/entitlement state. Client redirect is not proof of payment.';
comment on table public.billing_webhook_events is
  'Idempotency for provider webhook event IDs. Duplicates must not mutate entitlement twice.';

-- ===== 0042_seller_portal_rpc_lock.sql =====
-- Take seller_portal_by_code off the public PostgREST surface.
-- Callers must go through /api/seller/access (attempt-limited).
-- Apply after SUPABASE_SERVICE_ROLE_KEY is set on storyhome-1-eqmg.
-- Does NOT delete users, listings, or county/CAD truth data.

revoke execute on function public.seller_portal_by_code(text)
  from anon, authenticated, public;

grant execute on function public.seller_portal_by_code(text)
  to service_role;

comment on function public.seller_portal_by_code(text) is
  'Seller portal lookup. Execute revoked from anon/authenticated — use the rate-limited server route.';

-- ===== done =====
select
  'story labs tables ready' as status,
  (select count(*) from information_schema.tables where table_schema = 'public') as public_tables;
