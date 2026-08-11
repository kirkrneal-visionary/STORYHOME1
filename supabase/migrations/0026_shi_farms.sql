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
