-- County Stories Wave 5 provider / prepared playback (Mux).
-- Canonical consumer playback is secured Mux HLS, not a static MP4 file.
-- 0085 remains caption / accessibility authority.
-- Public publishing stays disabled. No UI. No Wave 6.

-- ---------------------------------------------------------------------------
-- Source media stays source. These columns are prepared-playback facts only.
-- ---------------------------------------------------------------------------
alter table public.county_story_media
  add column if not exists provider text,
  add column if not exists provider_asset_id text,
  add column if not exists provider_playback_id text,
  add column if not exists provider_playback_policy text,
  add column if not exists provider_track_id text,
  add column if not exists provider_status text not null default 'not_sent',
  add column if not exists playback_kind text not null default 'hls',
  add column if not exists playback_ready_at timestamptz,
  add column if not exists playback_duration_ms integer,
  add column if not exists provider_deleted_at timestamptz,
  add column if not exists provider_delete_error text,
  add column if not exists provider_last_event_id text;

alter table public.county_story_media
  drop constraint if exists county_story_media_provider_status_check;
alter table public.county_story_media
  add constraint county_story_media_provider_status_check
  check (provider_status in (
    'not_sent', 'uploading', 'processing', 'ready', 'errored', 'deleting', 'deleted'
  ));

alter table public.county_story_media
  drop constraint if exists county_story_media_playback_kind_check;
alter table public.county_story_media
  add constraint county_story_media_playback_kind_check
  check (playback_kind = 'hls');

alter table public.county_story_media
  drop constraint if exists county_story_media_provider_playback_policy_check;
alter table public.county_story_media
  add constraint county_story_media_provider_playback_policy_check
  check (
    provider_playback_policy is null
    or provider_playback_policy = 'signed'
  );

alter table public.county_story_media
  drop constraint if exists county_story_media_provider_check;
alter table public.county_story_media
  add constraint county_story_media_provider_check
  check (provider is null or provider = 'mux');

create unique index if not exists county_story_media_provider_asset_uidx
  on public.county_story_media (provider_asset_id)
  where provider_asset_id is not null;

comment on column public.county_story_media.container is
  'Source container from Wave 2 probe. Not the consumer playback object.';
comment on column public.county_story_media.codec_video is
  'Source video codec from Wave 2 probe. Mux does not relabel this.';
comment on column public.county_story_media.provider_playback_id is
  'Signed/private Mux playback id for HLS. Public playback ids are rejected.';
comment on column public.county_story_media.playback_kind is
  'Prepared playback kind. Launch foundation is HLS, not a static MP4 rendition.';
comment on column public.county_story_media.playback_ready_at is
  'Set when the provider asset is processed, a signed playback id exists, and Story Home may use it. Does not mean a static MP4 exists.';

create table if not exists public.county_story_provider_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  media_id uuid references public.county_story_media (id) on delete set null,
  provider_asset_id text,
  payload_digest text,
  processed_at timestamptz not null default now()
);

alter table public.county_story_provider_events enable row level security;
alter table public.county_story_provider_events force row level security;
revoke all on table public.county_story_provider_events from public, anon, authenticated;
grant select, insert, update, delete on table public.county_story_provider_events to service_role;

comment on table public.county_story_provider_events is
  'Idempotent Mux webhook receipts. Events may update provider/caption processing only.';

-- ---------------------------------------------------------------------------
-- Prepared playback = processed Mux HLS + signed playback id. Not static MP4.
-- ---------------------------------------------------------------------------
create or replace function public.county_story_media_is_playback_ready(p_media uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.county_story_media m
     where m.id = p_media
       and m.provider_status = 'ready'
       and m.playback_kind = 'hls'
       and m.provider_playback_policy = 'signed'
       and nullif(m.provider_playback_id, '') is not null
       and m.playback_ready_at is not null
       and m.provider_deleted_at is null
       and m.media_deleted_at is null
  );
$$;

comment on function public.county_story_media_is_playback_ready(uuid) is
  'Prepared provider playback: Mux asset ready + signed HLS playback id. Does not require a static MP4 rendition.';

revoke all on function public.county_story_media_is_playback_ready(uuid)
  from public, anon, authenticated;
grant execute on function public.county_story_media_is_playback_ready(uuid)
  to service_role;

create or replace function public.county_story_media_revoke_playback(
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
    raise exception 'county stories provider cleanup requires service_role'
      using errcode = '42501';
  end if;
  update public.county_story_media m
     set playback_ready_at = null,
         provider_status = case
           when m.provider_status in ('ready', 'processing', 'uploading') then 'deleting'
           else m.provider_status
         end,
         cleanup_attempted_at = p_at
   where m.id = p_id
     and m.provider_deleted_at is null;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

comment on function public.county_story_media_revoke_playback(uuid, timestamptz) is
  'Turns off Story Home playback authority before provider deletion. Does not publish, hide, strike, or allocate.';

revoke all on function public.county_story_media_revoke_playback(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_media_revoke_playback(uuid, timestamptz)
  to service_role;

create or replace function public.county_story_mark_provider_processing(
  p_media uuid,
  p_asset_id text,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_media public.county_story_media%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  if char_length(coalesce(p_asset_id, '')) < 4 then
    return public.county_story_result(false, 'INVALID_MEDIA');
  end if;
  perform pg_advisory_xact_lock(hashtext('county_story_media'), hashtext(p_media::text));
  select * into v_media from public.county_story_media m where m.id = p_media for update;
  if not found then
    return public.county_story_result(false, 'MEDIA_NOT_OWNED');
  end if;
  if v_media.media_deleted_at is not null
     or v_media.state not in ('valid', 'needs_normalization') then
    return public.county_story_result(false, 'MEDIA_NOT_VALID');
  end if;
  if v_media.provider_status = 'ready'
     and v_media.playback_ready_at is not null then
    return public.county_story_result(true, 'PLAYBACK_READY', jsonb_build_object(
      'media_id', p_media,
      'provider_asset_id', v_media.provider_asset_id
    ));
  end if;

  update public.county_story_media
     set provider = 'mux',
         provider_asset_id = p_asset_id,
         provider_status = 'processing',
         provider_delete_error = null,
         updated_at = p_at
   where id = p_media
     and state in ('valid', 'needs_normalization');

  return public.county_story_result(true, 'PROVIDER_PROCESSING', jsonb_build_object(
    'media_id', p_media,
    'provider_asset_id', p_asset_id,
    'source_state', v_media.state,
    'source_container', v_media.container,
    'source_codec', v_media.codec_video
  ));
end;
$$;

comment on function public.county_story_mark_provider_processing(uuid, text, timestamptz) is
  'Records Mux asset processing. Never relabels source container/codec/state.';

revoke all on function public.county_story_mark_provider_processing(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_mark_provider_processing(uuid, text, timestamptz)
  to service_role;

create or replace function public.county_story_mark_provider_ready(
  p_media uuid,
  p_asset_id text,
  p_playback_id text,
  p_playback_policy text,
  p_duration_ms integer,
  p_at timestamptz default now(),
  p_track_id text default null,
  p_event_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_media public.county_story_media%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  perform pg_advisory_xact_lock(hashtext('county_story_media'), hashtext(p_media::text));
  select * into v_media from public.county_story_media m where m.id = p_media for update;
  if not found then
    return public.county_story_result(false, 'MEDIA_NOT_OWNED');
  end if;
  if v_media.media_deleted_at is not null then
    return public.county_story_result(false, 'MEDIA_NOT_VALID');
  end if;
  if p_playback_policy is distinct from 'signed'
     or char_length(coalesce(p_playback_id, '')) < 4 then
    update public.county_story_media
       set provider_status = 'errored',
           validation_detail = coalesce(validation_detail, 'Provider returned no signed playback id'),
           provider_last_event_id = coalesce(p_event_id, provider_last_event_id),
           updated_at = p_at
     where id = p_media;
    return public.county_story_result(false, 'PLAYBACK_POLICY_INVALID', jsonb_build_object(
      'media_id', p_media
    ));
  end if;
  if p_asset_id is not null
     and v_media.provider_asset_id is not null
     and v_media.provider_asset_id is distinct from p_asset_id then
    return public.county_story_result(false, 'MEDIA_NOT_VALID');
  end if;

  update public.county_story_media
     set provider = 'mux',
         provider_asset_id = coalesce(p_asset_id, provider_asset_id),
         provider_playback_id = p_playback_id,
         provider_playback_policy = 'signed',
         provider_track_id = coalesce(p_track_id, provider_track_id),
         provider_status = 'ready',
         playback_kind = 'hls',
         playback_ready_at = coalesce(playback_ready_at, p_at),
         playback_duration_ms = coalesce(p_duration_ms, playback_duration_ms),
         provider_last_event_id = coalesce(p_event_id, provider_last_event_id),
         provider_delete_error = null,
         updated_at = p_at
   where id = p_media;

  return public.county_story_result(true, 'PLAYBACK_READY', jsonb_build_object(
    'media_id', p_media,
    'playback_kind', 'hls',
    'provider_playback_policy', 'signed',
    'source_state', v_media.state,
    'source_container', v_media.container,
    'source_codec', v_media.codec_video
  ));
end;
$$;

comment on function public.county_story_mark_provider_ready(uuid, text, text, text, integer, timestamptz, text, text) is
  'Marks prepared signed HLS playback. Rejects public playback ids. Does not require static MP4. Does not relabel source media.';

revoke all on function public.county_story_mark_provider_ready(uuid, text, text, text, integer, timestamptz, text, text)
  from public, anon, authenticated;
grant execute on function public.county_story_mark_provider_ready(uuid, text, text, text, integer, timestamptz, text, text)
  to service_role;

create or replace function public.county_story_mark_provider_errored(
  p_media uuid,
  p_error text,
  p_at timestamptz default now(),
  p_event_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  update public.county_story_media
     set provider_status = 'errored',
         playback_ready_at = null,
         provider_last_event_id = coalesce(p_event_id, provider_last_event_id),
         validation_detail = left(coalesce(p_error, 'provider_errored'), 500),
         updated_at = p_at
   where id = p_media
     and media_deleted_at is null;
  if not found then
    return public.county_story_result(false, 'MEDIA_NOT_OWNED');
  end if;
  return public.county_story_result(true, 'PROVIDER_ERRORED', jsonb_build_object(
    'media_id', p_media
  ));
end;
$$;

comment on function public.county_story_mark_provider_errored(uuid, text, timestamptz, text) is
  'Records provider processing failure. Never creates a slot, strike, hide, or capacity change.';

revoke all on function public.county_story_mark_provider_errored(uuid, text, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.county_story_mark_provider_errored(uuid, text, timestamptz, text)
  to service_role;

create or replace function public.county_story_mark_provider_deleted(
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
    raise exception 'county stories provider cleanup requires service_role'
      using errcode = '42501';
  end if;
  update public.county_story_media m
     set provider_status = 'deleted',
         provider_deleted_at = p_at,
         provider_delete_error = null,
         playback_ready_at = null,
         cleanup_attempted_at = p_at
   where m.id = p_id
     and m.provider_deleted_at is null;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

comment on function public.county_story_mark_provider_deleted(uuid, timestamptz) is
  'Records provider deletion only after Mux confirmed the asset is gone (204/404).';

revoke all on function public.county_story_mark_provider_deleted(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_mark_provider_deleted(uuid, timestamptz)
  to service_role;

create or replace function public.county_story_record_provider_delete_error(
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
    raise exception 'county stories provider cleanup requires service_role'
      using errcode = '42501';
  end if;
  update public.county_story_media
     set provider_delete_error = left(coalesce(p_error, 'provider_delete_failed'), 500),
         provider_status = 'deleting',
         cleanup_error = left(coalesce(p_error, 'provider_delete_failed'), 500),
         cleanup_attempted_at = p_at
   where id = p_id
     and provider_deleted_at is null;
end;
$$;

comment on function public.county_story_record_provider_delete_error(uuid, text, timestamptz) is
  'Keeps provider deletion retryable. Does not mark provider content deleted.';

revoke all on function public.county_story_record_provider_delete_error(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_record_provider_delete_error(uuid, text, timestamptz)
  to service_role;

create or replace function public.county_story_claim_provider_event(
  p_event_id text,
  p_event_type text,
  p_media uuid,
  p_asset_id text,
  p_digest text default null,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.county_story_provider_events%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  if char_length(coalesce(p_event_id, '')) < 8 then
    return public.county_story_result(false, 'INVALID_MEDIA');
  end if;
  select * into v_existing
    from public.county_story_provider_events e
   where e.event_id = p_event_id;
  if found then
    return public.county_story_result(true, 'PROVIDER_EVENT_REPLAY', jsonb_build_object(
      'event_id', p_event_id,
      'media_id', v_existing.media_id
    ));
  end if;
  insert into public.county_story_provider_events (
    event_id, event_type, media_id, provider_asset_id, payload_digest, processed_at
  ) values (
    p_event_id, p_event_type, p_media, p_asset_id, p_digest, p_at
  );
  return public.county_story_result(true, 'PROVIDER_EVENT_ACCEPTED', jsonb_build_object(
    'event_id', p_event_id,
    'media_id', p_media
  ));
end;
$$;

comment on function public.county_story_claim_provider_event(text, text, uuid, text, text, timestamptz) is
  'Idempotent webhook receipt. Replay does not re-apply business effects beyond the first write.';

revoke all on function public.county_story_claim_provider_event(text, text, uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_claim_provider_event(text, text, uuid, text, text, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Cleanup lists include provider asset ids so abandoned Mux objects are removed.
-- ---------------------------------------------------------------------------
create or replace function public.county_story_media_list_expired(
  p_at timestamptz default now()
)
returns table (
  id uuid,
  storage_path text,
  poster_path text,
  provider_asset_id text,
  provider_status text,
  provider_deleted_at timestamptz,
  playback_ready_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.storage_path, m.poster_path,
         m.provider_asset_id, m.provider_status, m.provider_deleted_at,
         m.playback_ready_at
    from public.county_story_media m
   where m.media_deleted_at is null
     and m.slot_id is null
     and m.expires_at <= p_at
     and m.state in (
       'created', 'uploaded', 'validating', 'valid',
       'needs_normalization', 'invalid'
     );
$$;

create or replace function public.county_story_media_list_superseded(
  p_at timestamptz default now()
)
returns table (
  id uuid,
  storage_path text,
  poster_path text,
  provider_asset_id text,
  provider_status text,
  provider_deleted_at timestamptz,
  playback_ready_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.storage_path, m.poster_path,
         m.provider_asset_id, m.provider_status, m.provider_deleted_at,
         m.playback_ready_at
    from public.county_story_media m
   where m.media_deleted_at is null
     and m.superseded_at is not null
     and m.superseded_at <= p_at
     and m.state <> 'deleted'
     and not exists (
       select 1 from public.county_story_slots s where s.current_media_id = m.id
     );
$$;

create or replace function public.county_story_media_list_policy_removed(
  p_at timestamptz default now()
)
returns table (
  id uuid,
  storage_path text,
  poster_path text,
  provider_asset_id text,
  provider_status text,
  provider_deleted_at timestamptz,
  playback_ready_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.storage_path, m.poster_path,
         m.provider_asset_id, m.provider_status, m.provider_deleted_at,
         m.playback_ready_at
    from public.county_story_media m
   where m.policy_removed_at is not null
     and m.policy_removed_at <= p_at
     and m.media_deleted_at is null
     and m.state <> 'deleted'
     and not exists (
       select 1
         from public.county_story_slots s
        where s.current_media_id = m.id
          and s.state = 'accepted'
     );
$$;

create or replace function public.county_story_media_list_provider_delete_retry(
  p_at timestamptz default now()
)
returns table (
  id uuid,
  storage_path text,
  poster_path text,
  provider_asset_id text,
  provider_status text,
  provider_deleted_at timestamptz,
  playback_ready_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.storage_path, m.poster_path,
         m.provider_asset_id, m.provider_status, m.provider_deleted_at,
         m.playback_ready_at
    from public.county_story_media m
   where m.provider_asset_id is not null
     and m.provider_deleted_at is null
     and m.provider_delete_error is not null
     and m.cleanup_attempted_at <= p_at;
$$;

revoke all on function public.county_story_media_list_expired(timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_media_list_expired(timestamptz)
  to service_role;
revoke all on function public.county_story_media_list_superseded(timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_media_list_superseded(timestamptz)
  to service_role;
revoke all on function public.county_story_media_list_policy_removed(timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_media_list_policy_removed(timestamptz)
  to service_role;
revoke all on function public.county_story_media_list_provider_delete_retry(timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_media_list_provider_delete_retry(timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Caption jobs may start from a recognized source (valid or needs_normalization).
-- SQL still records unconfigured when the application has no Mux credentials.
-- ---------------------------------------------------------------------------
create or replace function public.county_story_request_caption_job(
  p_owner uuid,
  p_media uuid,
  p_idempotency_key text,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_media public.county_story_media%rowtype;
  v_job public.county_story_caption_jobs%rowtype;
  v_hash text;
begin
  if auth.role() is distinct from 'service_role' then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  if char_length(coalesce(p_idempotency_key, '')) < 8
     or char_length(p_idempotency_key) > 128 then
    return public.county_story_result(false, 'IDEMPOTENCY_CONFLICT');
  end if;
  perform pg_advisory_xact_lock(hashtext('county_story_media'), hashtext(p_media::text));
  select * into v_media from public.county_story_media m where m.id = p_media for update;
  if not found or v_media.professional_owner_id is distinct from p_owner then
    return public.county_story_result(false, 'MEDIA_NOT_OWNED');
  end if;
  if v_media.media_deleted_at is not null
     or nullif(v_media.storage_path, '') is null then
    return public.county_story_result(false, 'MEDIA_NOT_VALID');
  end if;
  if v_media.state not in ('valid', 'needs_normalization') then
    return public.county_story_result(false, 'MEDIA_NOT_VALID');
  end if;

  v_hash := public.county_story_request_hash(
    'caption_job', p_media, v_media.storage_path, null, null, null
  );

  select * into v_job
    from public.county_story_caption_jobs j
   where j.professional_owner_id = p_owner
     and j.idempotency_key = p_idempotency_key
   for update;
  if found then
    if v_job.request_hash is distinct from v_hash
       or v_job.media_id is distinct from p_media then
      return public.county_story_result(false, 'IDEMPOTENCY_CONFLICT');
    end if;
    update public.county_story_caption_jobs
       set attempt_count = attempt_count + 1,
           updated_at = p_at
     where id = v_job.id
    returning * into v_job;
    return public.county_story_result(true, 'CAPTION_JOB_REPLAY', jsonb_build_object(
      'job_id', v_job.id,
      'status', v_job.status,
      'provider_id', v_job.provider_id,
      'attempt_count', v_job.attempt_count
    ));
  end if;

  if exists (select 1 from public.county_story_caption_jobs j where j.media_id = p_media) then
    select * into v_job from public.county_story_caption_jobs j where j.media_id = p_media;
    return public.county_story_result(true, 'CAPTION_JOB_REPLAY', jsonb_build_object(
      'job_id', v_job.id,
      'status', v_job.status,
      'provider_id', v_job.provider_id,
      'attempt_count', v_job.attempt_count
    ));
  end if;

  insert into public.county_story_caption_jobs (
    media_id, professional_owner_id, idempotency_key, request_hash,
    provider_id, status, error_code, result_payload, updated_at
  ) values (
    p_media, p_owner, p_idempotency_key, v_hash,
    'unconfigured', 'unavailable', 'PROVIDER_UNAVAILABLE',
    jsonb_build_object('provider_id', 'unconfigured'),
    p_at
  )
  returning * into v_job;

  update public.county_story_media
     set caption_state = 'failed'
   where id = p_media
     and (
       caption_state is null
       or caption_state in ('not_requested', 'processing', 'failed', 'none', 'pending')
     );

  return public.county_story_result(true, 'PROVIDER_UNAVAILABLE', jsonb_build_object(
    'job_id', v_job.id,
    'status', v_job.status,
    'provider_id', v_job.provider_id,
    'media_id', p_media
  ));
end;
$$;

revoke all on function public.county_story_request_caption_job(uuid, uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_request_caption_job(uuid, uuid, text, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Publish / replace require prepared provider playback + accessibility.
-- Source valid (MP4/H.264 probe) is not enough. HEVC/MOV may publish after Mux.
-- ---------------------------------------------------------------------------
create or replace function public.publish_county_story(
  p_owner uuid,
  p_media uuid,
  p_county_fips text,
  p_story_type text,
  p_listing_id uuid,
  p_idempotency_key text,
  p_rules_acknowledged boolean,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date;
  v_hash text;
  v_replay jsonb;
  v_block jsonb;
  v_media public.county_story_media%rowtype;
  v_profile public.profiles%rowtype;
  v_listing_agent uuid;
  v_listing_brokerage uuid;
  v_listing_fips text;
  v_brokerage_name text;
  v_next int;
  v_slot uuid;
  v_payload jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  if char_length(coalesce(p_idempotency_key, '')) < 8
     or char_length(p_idempotency_key) > 128 then
    return public.county_story_result(false, 'IDEMPOTENCY_CONFLICT');
  end if;

  v_day := public.county_story_day(p_at);
  v_hash := public.county_story_request_hash(
    'publish', p_media, p_county_fips, p_story_type, p_listing_id, null
  );

  perform pg_advisory_xact_lock(
    hashtext('county_story_pro'),
    hashtext(p_owner::text || ':' || v_day::text)
  );

  v_replay := public.county_story_replay_or_conflict(p_owner, p_idempotency_key, 'publish', v_hash);
  if v_replay is not null then
    return v_replay;
  end if;

  if not public.county_story_publish_enabled() then
    return public.county_story_result(false, 'FEATURE_DISABLED');
  end if;

  if exists (
    select 1 from public.county_story_slots s
     where s.professional_owner_id = p_owner
       and s.story_day = v_day
  ) then
    select s.id into v_slot
      from public.county_story_slots s
     where s.professional_owner_id = p_owner
       and s.story_day = v_day;
    return public.county_story_result(false, 'ALREADY_POSTED', jsonb_build_object(
      'slot_id', v_slot, 'story_day', v_day
    ));
  end if;

  v_block := public.county_story_suspension_block(p_owner, p_at);
  if v_block is not null then
    return v_block;
  end if;

  if not public.county_story_publisher_eligible(p_owner) then
    return public.county_story_result(false, 'STORY_PRO_REQUIRED');
  end if;
  if not public.county_story_publish_eligible(p_owner) then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  if not public.county_story_county_is_active(p_county_fips) then
    return public.county_story_result(false, 'COUNTY_INACTIVE');
  end if;
  if p_story_type is null
     or p_story_type not in ('local_knowledge', 'open_house_property') then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  if p_rules_acknowledged is not true then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;

  select * into v_profile from public.profiles where id = p_owner;
  if p_listing_id is not null then
    select l.agent_id, l.brokerage_id, l.county_fips
      into v_listing_agent, v_listing_brokerage, v_listing_fips
      from public.listings l
     where l.id = p_listing_id;
    if not found then
      return public.county_story_result(false, 'LISTING_NOT_AUTHORIZED');
    end if;
    if v_listing_fips is distinct from p_county_fips then
      return public.county_story_result(false, 'LISTING_COUNTY_MISMATCH');
    end if;
    if v_listing_agent is distinct from p_owner
       and not (
         v_profile.account_purpose = 'managing_broker'
         and v_listing_brokerage is not null
         and v_listing_brokerage is not distinct from v_profile.brokerage_id
       ) then
      return public.county_story_result(false, 'LISTING_NOT_AUTHORIZED');
    end if;
  end if;

  perform pg_advisory_xact_lock(
    hashtext('county_story_county'),
    hashtext(p_county_fips || ':' || v_day::text)
  );
  insert into public.county_story_days (county_fips, story_day, accepted_count)
  values (p_county_fips, v_day, 0)
  on conflict (county_fips, story_day) do nothing;
  perform 1
    from public.county_story_days d
   where d.county_fips = p_county_fips
     and d.story_day = v_day
   for update;

  select coalesce(max(s.slot_number), 0) + 1 into v_next
    from public.county_story_slots s
   where s.county_fips = p_county_fips
     and s.story_day = v_day;
  if v_next > 30 then
    return public.county_story_result(false, 'COUNTY_FULL', jsonb_build_object(
      'county_fips', p_county_fips,
      'story_day', v_day,
      'accepted', 30,
      'max', 30
    ));
  end if;

  perform pg_advisory_xact_lock(hashtext('county_story_media'), hashtext(p_media::text));
  select * into v_media
    from public.county_story_media m
   where m.id = p_media
   for update;
  if not found
     or v_media.professional_owner_id is distinct from p_owner then
    return public.county_story_result(false, 'MEDIA_NOT_OWNED');
  end if;
  if v_media.state not in ('valid', 'needs_normalization')
     or v_media.media_deleted_at is not null then
    return public.county_story_result(false, 'MEDIA_NOT_VALID');
  end if;
  if not public.county_story_media_is_playback_ready(p_media) then
    return public.county_story_result(false, 'PLAYBACK_NOT_READY', jsonb_build_object(
      'media_id', p_media
    ));
  end if;
  if v_media.slot_id is not null
     or exists (
       select 1 from public.county_story_slots s where s.current_media_id = p_media
     ) then
    return public.county_story_result(false, 'MEDIA_ALREADY_ATTACHED');
  end if;

  if not public.county_story_media_is_accessibility_ready(p_media) then
    return public.county_story_result(false, 'ACCESSIBILITY_NOT_READY', jsonb_build_object(
      'media_id', p_media
    ));
  end if;

  if v_profile.brokerage_id is not null then
    select b.name into v_brokerage_name
      from public.brokerages b
     where b.id = v_profile.brokerage_id;
  end if;

  insert into public.county_story_slots (
    professional_owner_id, county_fips, story_day, slot_number, state,
    story_type, listing_id, brokerage_id, current_media_id,
    replacement_used, rules_acknowledged_at, accepted_at,
    snapshot_legal_name, snapshot_license, snapshot_trec_status,
    snapshot_professional_type, snapshot_purpose, snapshot_account_kind,
    snapshot_brokerage_id, snapshot_brokerage_name,
    snapshot_sponsor_name, snapshot_sponsor_license, snapshot_story_pro
  ) values (
    p_owner, p_county_fips, v_day, v_next, 'accepted',
    p_story_type, p_listing_id, v_profile.brokerage_id, p_media,
    false, p_at, p_at,
    nullif(btrim(coalesce(v_profile.legal_full_name, v_profile.full_name, '')), ''),
    nullif(btrim(coalesce(v_profile.verified_license, v_profile.trec_license, '')), ''),
    v_profile.trec_status,
    v_profile.professional_role,
    v_profile.account_purpose,
    v_profile.account_kind,
    v_profile.brokerage_id,
    v_brokerage_name,
    v_profile.sponsor_name,
    v_profile.sponsor_license_number,
    true
  )
  returning id into v_slot;

  update public.county_story_media
     set slot_id = v_slot
   where id = p_media
     and slot_id is null
     and state in ('valid', 'needs_normalization')
     and public.county_story_media_is_playback_ready(p_media);
  if not found then
    raise exception 'county_story_media_attach_failed';
  end if;

  update public.county_story_days
     set accepted_count = (
       select count(*) from public.county_story_slots s
        where s.county_fips = p_county_fips and s.story_day = v_day
     )
   where county_fips = p_county_fips
     and story_day = v_day;

  v_payload := public.county_story_result(true, 'PUBLISHED', jsonb_build_object(
    'slot_id', v_slot,
    'slot_number', v_next,
    'county_fips', p_county_fips,
    'story_day', v_day,
    'media_id', p_media,
    'accepted', v_next,
    'max', 30
  ));
  perform public.county_story_store_intent(
    p_owner, p_idempotency_key, 'publish', v_hash, v_slot, v_payload
  );
  return v_payload;
end;
$$;

comment on function public.publish_county_story(uuid, uuid, text, text, uuid, text, boolean, timestamptz) is
  'Atomic County Story accept. Requires prepared signed HLS playback plus accessibility readiness. Feature-gated. Source MP4/H.264 probe is not sufficient.';

revoke all on function public.publish_county_story(uuid, uuid, text, text, uuid, text, boolean, timestamptz)
  from public, anon, authenticated;
grant execute on function public.publish_county_story(uuid, uuid, text, text, uuid, text, boolean, timestamptz)
  to service_role;

drop function if exists public.replace_county_story_media(uuid, uuid, uuid, text, boolean, timestamptz);

create or replace function public.replace_county_story_media(
  p_owner uuid,
  p_slot uuid,
  p_media uuid,
  p_idempotency_key text,
  p_rules_acknowledged boolean,
  p_at timestamptz default now(),
  p_listing_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date;
  v_hash text;
  v_replay jsonb;
  v_block jsonb;
  v_slot public.county_story_slots%rowtype;
  v_media public.county_story_media%rowtype;
  v_old uuid;
  v_payload jsonb;
  v_profile public.profiles%rowtype;
  v_listing_agent uuid;
  v_listing_brokerage uuid;
  v_listing_fips text;
  v_next_listing uuid;
begin
  if auth.role() is distinct from 'service_role' then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  if char_length(coalesce(p_idempotency_key, '')) < 8
     or char_length(p_idempotency_key) > 128 then
    return public.county_story_result(false, 'IDEMPOTENCY_CONFLICT');
  end if;

  v_day := public.county_story_day(p_at);
  v_hash := public.county_story_request_hash(
    'replace', p_media, null, null, p_listing_id, p_slot
  );

  perform pg_advisory_xact_lock(
    hashtext('county_story_pro'),
    hashtext(p_owner::text || ':' || v_day::text)
  );

  v_replay := public.county_story_replay_or_conflict(p_owner, p_idempotency_key, 'replace', v_hash);
  if v_replay is not null then
    return v_replay;
  end if;

  if not public.county_story_publish_enabled() then
    return public.county_story_result(false, 'FEATURE_DISABLED');
  end if;
  if p_rules_acknowledged is not true then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;

  select * into v_slot
    from public.county_story_slots s
   where s.id = p_slot
   for update;
  if not found or v_slot.professional_owner_id is distinct from p_owner then
    return public.county_story_result(false, 'NOT_SLOT_OWNER');
  end if;
  if v_slot.story_day is distinct from v_day then
    return public.county_story_result(false, 'STORY_DAY_ENDED');
  end if;

  v_block := public.county_story_suspension_block(p_owner, p_at);
  if v_block is not null then
    return v_block;
  end if;

  if v_slot.replacement_used then
    return public.county_story_result(false, 'REPLACEMENT_ALREADY_USED', jsonb_build_object(
      'slot_id', v_slot.id,
      'media_id', v_slot.current_media_id
    ));
  end if;

  v_next_listing := v_slot.listing_id;
  if p_listing_id is not null then
    if exists (
      select 1
        from public.county_story_enforcement_events e
       where e.slot_id = v_slot.id
         and e.reason_code = 'unauthorized_property'
         and e.prior_listing_id is not distinct from p_listing_id
    ) then
      return public.county_story_result(false, 'LISTING_NOT_AUTHORIZED', jsonb_build_object(
        'slot_id', v_slot.id
      ));
    end if;
    select * into v_profile from public.profiles where id = p_owner;
    select l.agent_id, l.brokerage_id, l.county_fips
      into v_listing_agent, v_listing_brokerage, v_listing_fips
      from public.listings l
     where l.id = p_listing_id;
    if not found then
      return public.county_story_result(false, 'LISTING_NOT_AUTHORIZED');
    end if;
    if v_listing_fips is distinct from v_slot.county_fips then
      return public.county_story_result(false, 'LISTING_COUNTY_MISMATCH');
    end if;
    if v_listing_agent is distinct from p_owner
       and not (
         v_profile.account_purpose = 'managing_broker'
         and v_listing_brokerage is not null
         and v_listing_brokerage is not distinct from v_profile.brokerage_id
       ) then
      return public.county_story_result(false, 'LISTING_NOT_AUTHORIZED');
    end if;
    v_next_listing := p_listing_id;
  end if;

  perform pg_advisory_xact_lock(hashtext('county_story_media'), hashtext(p_media::text));
  select * into v_media
    from public.county_story_media m
   where m.id = p_media
   for update;
  if not found or v_media.professional_owner_id is distinct from p_owner then
    return public.county_story_result(false, 'MEDIA_NOT_OWNED');
  end if;
  if v_media.state not in ('valid', 'needs_normalization')
     or v_media.media_deleted_at is not null then
    return public.county_story_result(false, 'MEDIA_NOT_VALID');
  end if;
  if not public.county_story_media_is_playback_ready(p_media) then
    return public.county_story_result(false, 'PLAYBACK_NOT_READY', jsonb_build_object(
      'media_id', p_media
    ));
  end if;
  if v_media.slot_id is not null
     or exists (
       select 1 from public.county_story_slots s where s.current_media_id = p_media
     ) then
    return public.county_story_result(false, 'MEDIA_ALREADY_ATTACHED');
  end if;

  if not public.county_story_media_is_accessibility_ready(p_media) then
    return public.county_story_result(false, 'ACCESSIBILITY_NOT_READY', jsonb_build_object(
      'media_id', p_media
    ));
  end if;

  v_old := v_slot.current_media_id;

  update public.county_story_slots
     set current_media_id = p_media,
         state = 'accepted',
         listing_id = v_next_listing,
         replacement_used = true,
         replaced_at = p_at,
         replacement_rules_acknowledged_at = p_at
   where id = v_slot.id
     and replacement_used = false
     and current_media_id is not distinct from v_old
     and rules_acknowledged_at is not distinct from v_slot.rules_acknowledged_at;
  if not found then
    return public.county_story_result(false, 'REPLACEMENT_ALREADY_USED', jsonb_build_object(
      'slot_id', v_slot.id
    ));
  end if;

  update public.county_story_media
     set slot_id = v_slot.id
   where id = p_media
     and slot_id is null
     and state in ('valid', 'needs_normalization')
     and public.county_story_media_is_playback_ready(p_media);
  if not found then
    raise exception 'county_story_replace_attach_failed';
  end if;

  if v_old is not null then
    update public.county_story_media
       set superseded_at = p_at
     where id = v_old;
  end if;

  v_payload := public.county_story_result(true, 'REPLACED', jsonb_build_object(
    'slot_id', v_slot.id,
    'slot_number', v_slot.slot_number,
    'county_fips', v_slot.county_fips,
    'story_day', v_slot.story_day,
    'media_id', p_media,
    'superseded_media_id', v_old
  ));
  perform public.county_story_store_intent(
    p_owner, p_idempotency_key, 'replace', v_hash, v_slot.id, v_payload
  );
  return v_payload;
end;
$$;

comment on function public.replace_county_story_media(uuid, uuid, uuid, text, boolean, timestamptz, uuid) is
  'Atomic one-time media replacement. Requires prepared signed HLS playback plus accessibility readiness on the replacement. Does not change capacity.';

revoke all on function public.replace_county_story_media(uuid, uuid, uuid, text, boolean, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.replace_county_story_media(uuid, uuid, uuid, text, boolean, timestamptz, uuid)
  to service_role;
