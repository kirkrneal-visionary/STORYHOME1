-- County Stories Wave 2: private temporary media staging.
-- No publish RPC, no Story Slot writes, no consumer UI, no captions.
-- Durable object remains county_story_slots (Wave 1 / Wave 3). Media is temporary.

-- ---------------------------------------------------------------------------
-- Staged media (may exist without a slot)
-- ---------------------------------------------------------------------------
create table public.county_story_media (
  id uuid primary key default gen_random_uuid(),
  professional_owner_id uuid not null
    references public.profiles (id)
    on delete restrict
    on update restrict,
  purpose text not null,
  state text not null,
  storage_bucket text not null default 'county-story-media',
  storage_path text not null,
  poster_path text,
  byte_size bigint,
  mime_type text,
  container text,
  codec_video text,
  codec_audio text,
  duration_ms integer,
  width integer,
  height integer,
  validation_code text,
  validation_detail text,
  upload_key text,
  slot_id uuid
    references public.county_story_slots (id)
    on delete set null
    on update restrict,
  caption_state text,
  caption_cues_path text,
  accessible_description text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  media_deleted_at timestamptz,
  cleanup_attempted_at timestamptz,
  cleanup_error text,
  constraint county_story_media_purpose_check
    check (purpose in ('original', 'replacement')),
  constraint county_story_media_state_check
    check (state in (
      'created', 'uploaded', 'validating', 'valid',
      'needs_normalization', 'invalid', 'deleted'
    )),
  constraint county_story_media_deleted_requires_object_gone
    check (state <> 'deleted' or media_deleted_at is not null),
  constraint county_story_media_valid_is_playback_ready
    check (
      state <> 'valid'
      or (
        (container = 'mp4' and codec_video in ('avc1', 'avc3'))
        or (container = 'webm' and codec_video in ('vp08', 'vp09'))
      )
    ),
  constraint county_story_media_bucket_check
    check (storage_bucket = 'county-story-media'),
  constraint county_story_media_path_owner_check
    check (storage_path like professional_owner_id::text || '/%'),
  constraint county_story_media_caption_state_check
    check (
      caption_state is null
      or caption_state in ('none', 'pending', 'ready', 'needs_review')
    ),
  constraint county_story_media_owner_key_unique
    unique (professional_owner_id, upload_key)
);

comment on table public.county_story_media is
  'Temporary County Story video staging. state=valid is playback-ready only. needs_normalization is ingest-recognized but not publishable. slot_id stays null until Wave 3. Caption columns are reserved for Wave 5.';

comment on column public.county_story_media.state is
  'valid = launch playback-ready (MP4/AVC or WebM/VP8|VP9). needs_normalization is not Wave 3-publishable. deleted requires media_deleted_at.';

comment on column public.county_story_media.media_deleted_at is
  'Set only after the storage object is confirmed gone. deleted without this timestamp is forbidden.';

comment on column public.county_story_media.slot_id is
  'Null in Wave 2. Wave 3 may attach after accept. Cleanup never deletes rows with a slot.';

comment on column public.county_story_media.poster_path is
  'Optional temporary poster derived from the video. Same deletion lifecycle as the video.';

comment on column public.county_story_media.caption_cues_path is
  'Reserved for Wave 5 caption cues. Unused in Wave 2.';

create index county_story_media_owner_state_idx
  on public.county_story_media (professional_owner_id, state);

create index county_story_media_expires_idx
  on public.county_story_media (expires_at)
  where deleted_at is null and slot_id is null;

create or replace function public.county_story_media_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists county_story_media_touch on public.county_story_media;
create trigger county_story_media_touch
  before update on public.county_story_media
  for each row
  execute function public.county_story_media_touch();

-- ---------------------------------------------------------------------------
-- Write guard: service_role + eligible owner + owner-prefixed path.
-- Never writes county_story_slots or county_story_days.
-- ---------------------------------------------------------------------------
create or replace function public.county_story_media_authority_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'county stories media requires service_role'
      using errcode = '42501';
  end if;

  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    if not public.county_story_publisher_eligible(new.professional_owner_id) then
      raise exception 'county_story_publisher_ineligible'
        using errcode = '42501';
    end if;
    if new.storage_path is distinct from null
       and new.storage_path not like new.professional_owner_id::text || '/%' then
      raise exception 'county_story_media_owner_mismatch'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.county_story_media_authority_guard() is
  'Wave 2 media write guard. Service-role only. Does not create Story Slots or change capacity.';

drop trigger if exists county_story_media_authority on public.county_story_media;
create trigger county_story_media_authority
  before insert or update on public.county_story_media
  for each row
  execute function public.county_story_media_authority_guard();

revoke all on function public.county_story_media_authority_guard()
  from public, anon, authenticated;
grant execute on function public.county_story_media_authority_guard()
  to service_role;
revoke all on function public.county_story_media_touch()
  from public, anon, authenticated;
grant execute on function public.county_story_media_touch()
  to service_role;

-- ---------------------------------------------------------------------------
-- Orphan cleanup: list eligible rows. Mark deleted only after storage is gone.
-- Never slot-attached / current Story media.
-- ---------------------------------------------------------------------------
create or replace function public.county_story_media_list_expired(
  p_at timestamptz default now()
)
returns table (
  id uuid,
  storage_path text,
  poster_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.storage_path, m.poster_path
    from public.county_story_media m
   where m.media_deleted_at is null
     and m.slot_id is null
     and m.expires_at <= p_at
     and m.state in (
       'created', 'uploaded', 'validating', 'valid',
       'needs_normalization', 'invalid'
     );
$$;

comment on function public.county_story_media_list_expired(timestamptz) is
  'Eligible unpublished staged media for storage deletion. Never includes slot-attached rows.';

create or replace function public.county_story_media_mark_storage_deleted(
  p_id uuid,
  p_at timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'county stories media cleanup requires service_role'
      using errcode = '42501';
  end if;

  update public.county_story_media m
     set state = 'deleted',
         deleted_at = p_at,
         media_deleted_at = p_at,
         cleanup_error = null,
         cleanup_attempted_at = p_at
   where m.id = p_id
     and m.slot_id is null
     and m.media_deleted_at is null
     and m.state in (
       'created', 'uploaded', 'validating', 'valid',
       'needs_normalization', 'invalid', 'deleted'
     );
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

comment on function public.county_story_media_mark_storage_deleted(uuid, timestamptz) is
  'Records deleted only after the caller confirmed storage objects are gone. Idempotent. Never marks slot-attached media.';

create or replace function public.county_story_media_record_cleanup_failure(
  p_id uuid,
  p_error text,
  p_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'county stories media cleanup requires service_role'
      using errcode = '42501';
  end if;

  update public.county_story_media m
     set cleanup_attempted_at = p_at,
         cleanup_error = left(coalesce(p_error, 'storage_delete_failed'), 500)
   where m.id = p_id
     and m.slot_id is null
     and m.media_deleted_at is null
     and m.state <> 'deleted';
end;
$$;

revoke all on function public.county_story_media_list_expired(timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_media_list_expired(timestamptz)
  to service_role;
revoke all on function public.county_story_media_mark_storage_deleted(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_media_mark_storage_deleted(uuid, timestamptz)
  to service_role;
revoke all on function public.county_story_media_record_cleanup_failure(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_media_record_cleanup_failure(uuid, text, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- RLS: no client policies. Signed URLs are issued by service-role APIs.
-- ---------------------------------------------------------------------------
alter table public.county_story_media enable row level security;
alter table public.county_story_media force row level security;

revoke all on table public.county_story_media
  from public, anon, authenticated;
grant all on table public.county_story_media to service_role;

-- ---------------------------------------------------------------------------
-- Private storage bucket. Not living-marks, home-docs, or shi-studies.
-- Isolated Postgres without storage schema skips this block.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is null then
    return;
  end if;

  begin
    insert into storage.buckets (
      id, name, public, file_size_limit, allowed_mime_types
    )
    values (
      'county-story-media',
      'county-story-media',
      false,
      83886080,
      array['video/mp4', 'video/quicktime', 'video/webm']
    )
    on conflict (id) do update
      set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  exception
    when undefined_column then
      insert into storage.buckets (id, name, public)
      values ('county-story-media', 'county-story-media', false)
      on conflict (id) do update set public = false;
  end;
end
$$;
