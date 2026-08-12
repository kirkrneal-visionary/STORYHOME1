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
