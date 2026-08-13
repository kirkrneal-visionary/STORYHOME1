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
