-- County Stories Camera V2: ordered clips and one composition revision.
-- A clip row is not a County Story slot and does not consume a County Story position.

alter table public.county_story_media
  add column if not exists compose_revision integer not null default 0,
  add column if not exists compose_manifest_hash text,
  add column if not exists compose_state text,
  add column if not exists compose_failure text,
  add column if not exists compose_attempt integer not null default 0,
  add column if not exists compose_lease_until timestamptz,
  add column if not exists composed_storage_path text,
  add column if not exists compose_validated_at timestamptz,
  add column if not exists compose_execution_id text,
  add column if not exists compose_background text,
  add column if not exists superseded_provider_asset_id text;

alter table public.county_story_media
  drop constraint if exists county_story_media_compose_state_check;
alter table public.county_story_media
  add constraint county_story_media_compose_state_check
  check (compose_state is null or compose_state in ('waiting', 'composing', 'ready', 'failed'));

alter table public.county_story_media
  drop constraint if exists county_story_media_compose_failure_check;
alter table public.county_story_media
  add constraint county_story_media_compose_failure_check
  check (compose_failure is null or compose_failure in ('retryable', 'stopped'));

alter table public.county_story_media
  drop constraint if exists county_story_media_compose_background_check;
alter table public.county_story_media
  add constraint county_story_media_compose_background_check
  check (compose_background is null or compose_background in ('blur', 'neutral'));

comment on column public.county_story_media.compose_state is
  'Composition of ordered clips. Null for a single uploaded file. Does not allocate a County Story slot.';

create table if not exists public.county_story_media_segments (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null
    references public.county_story_media (id)
    on delete cascade,
  professional_owner_id uuid not null
    references public.profiles (id)
    on delete restrict,
  position integer not null,
  storage_path text not null,
  byte_size bigint,
  mime_type text,
  duration_ms integer,
  facing text,
  upload_state text not null default 'created',
  locked_revision integer,
  created_at timestamptz not null default now(),
  constraint county_story_media_segments_position_unique unique (media_id, position),
  constraint county_story_media_segments_upload_state_check
    check (upload_state in ('created', 'uploading', 'stored', 'failed')),
  constraint county_story_media_segments_facing_check
    check (facing is null or facing in ('user', 'environment', 'upload')),
  constraint county_story_media_segments_path_owner_check
    check (storage_path like professional_owner_id::text || '/%'),
  constraint county_story_media_segments_position_check
    check (position >= 0 and position < 30)
);

comment on table public.county_story_media_segments is
  'Temporary ordered clips for one staged Story. Not a County Story slot.';

alter table public.county_story_media_segments enable row level security;
alter table public.county_story_media_segments force row level security;
revoke all on table public.county_story_media_segments from public, anon, authenticated;
grant all on table public.county_story_media_segments to service_role;

create or replace function public.county_story_media_segment_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'county story segments require service_role'
      using errcode = '42501';
  end if;
  select m.professional_owner_id into v_owner
    from public.county_story_media m
   where m.id = new.media_id;
  if v_owner is null or v_owner is distinct from new.professional_owner_id then
    raise exception 'county_story_segment_owner_mismatch'
      using errcode = '42501';
  end if;
  if new.storage_path not like new.professional_owner_id::text || '/%' then
    raise exception 'county_story_segment_owner_mismatch'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists county_story_media_segment_guard on public.county_story_media_segments;
create trigger county_story_media_segment_guard
  before insert or update on public.county_story_media_segments
  for each row
  execute function public.county_story_media_segment_guard();

revoke all on function public.county_story_media_segment_guard()
  from public, anon, authenticated;
grant execute on function public.county_story_media_segment_guard()
  to service_role;
