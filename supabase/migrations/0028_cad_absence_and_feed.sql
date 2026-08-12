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
