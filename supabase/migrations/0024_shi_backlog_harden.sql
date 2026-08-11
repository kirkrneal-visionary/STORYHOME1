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
