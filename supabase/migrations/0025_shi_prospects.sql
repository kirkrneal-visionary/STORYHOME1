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
