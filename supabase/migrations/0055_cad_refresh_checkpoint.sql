-- Wave 5 — CAD refresh checkpoint.
-- Additive. Does not delete parcels, users, or CAD.
-- Optional. Ingest still page-commits if this column is missing.

alter table public.cad_county_status
  add column if not exists ingest_checkpoint_offset int null;

alter table public.cad_county_status
  add column if not exists ingest_checkpoint_at timestamptz null;

comment on column public.cad_county_status.ingest_checkpoint_offset is
  'Last successful ArcGIS resultOffset. Incomplete pull resumes here. Never means parcels were wiped.';
comment on column public.cad_county_status.ingest_checkpoint_at is
  'When the last page checkpoint was written.';
