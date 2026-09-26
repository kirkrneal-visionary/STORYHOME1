-- County Stories Wave 5: captions + accessibility infrastructure.
-- No consumer UI, composer, viewer, analytics, or share URLs.
-- Public publishing stays disabled. This migration does not enable the launch gate.
-- No paid transcription vendor is wired. Jobs record PROVIDER_UNAVAILABLE.

-- ---------------------------------------------------------------------------
-- Media accessibility columns. Captions belong to the media version.
-- ---------------------------------------------------------------------------
alter table public.county_story_media
  add column if not exists caption_revision integer not null default 0,
  add column if not exists caption_confirmed_at timestamptz,
  add column if not exists caption_confirmed_revision integer,
  add column if not exists accessible_description text,
  add column if not exists visual_info_basis text,
  add column if not exists visual_info_confirmed_at timestamptz,
  add column if not exists accessibility_context jsonb,
  add column if not exists accessibility_content_deleted_at timestamptz;

alter table public.county_story_media
  drop constraint if exists county_story_media_caption_state_check;
alter table public.county_story_media
  add constraint county_story_media_caption_state_check
    check (
      caption_state is null
      or caption_state in (
        'not_requested', 'processing', 'auto_ready', 'needs_review',
        'ready', 'failed', 'manual_ready', 'none', 'pending'
      )
    );
alter table public.county_story_media
  drop constraint if exists county_story_media_visual_basis_check;
alter table public.county_story_media
  add constraint county_story_media_visual_basis_check
    check (
      visual_info_basis is null
      or visual_info_basis in ('spoken_audio', 'supplied_description')
    );

comment on column public.county_story_media.caption_state is
  'Server caption readiness. ready/manual_ready require matching confirmed_revision. Browser flags are not authority.';
comment on column public.county_story_media.accessible_description is
  'Temporary media-version description. Grounded professional text only. Deleted with the media version.';
comment on column public.county_story_media.visual_info_basis is
  'spoken_audio or supplied_description. Set only with visual_info_confirmed_at.';
comment on column public.county_story_media.accessibility_context is
  'Snapshot of verified type/county/listing at description write. Not a live listing bind.';

-- ---------------------------------------------------------------------------
-- Caption sets + cues. Canonical representation: webvtt_cues.
-- ---------------------------------------------------------------------------
create table public.county_story_caption_sets (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null unique
    references public.county_story_media (id)
    on delete restrict
    on update restrict,
  professional_owner_id uuid not null
    references public.profiles (id)
    on delete restrict
    on update restrict,
  revision integer not null default 0,
  source text not null,
  language text not null default 'en',
  cue_format text not null default 'webvtt_cues',
  confirmed_at timestamptz,
  confirmed_revision integer,
  content_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint county_story_caption_source_check
    check (source in ('auto', 'manual', 'edited')),
  constraint county_story_caption_format_check
    check (cue_format = 'webvtt_cues'),
  constraint county_story_caption_revision_check
    check (revision >= 0)
);

comment on table public.county_story_caption_sets is
  'One caption set per media version. Revision is the concurrency token. Cue text is temporary.';

create table public.county_story_caption_cues (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null
    references public.county_story_caption_sets (id)
    on delete cascade
    on update restrict,
  media_id uuid not null
    references public.county_story_media (id)
    on delete restrict
    on update restrict,
  cue_index integer not null,
  start_ms integer not null,
  end_ms integer not null,
  text text not null,
  professionally_edited boolean not null default false,
  constraint county_story_caption_cue_index_check check (cue_index >= 0),
  constraint county_story_caption_cue_timing_check check (end_ms > start_ms and start_ms >= 0),
  constraint county_story_caption_cue_text_check check (char_length(btrim(text)) between 1 and 200),
  constraint county_story_caption_cue_unique unique (set_id, cue_index)
);

comment on table public.county_story_caption_cues is
  'Synchronized WebVTT-compatible cues. Deleted when the media version content is deleted. Not searchable.';

create index county_story_caption_cues_media_idx
  on public.county_story_caption_cues (media_id);

create table public.county_story_caption_jobs (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null
    references public.county_story_media (id)
    on delete restrict
    on update restrict,
  professional_owner_id uuid not null
    references public.profiles (id)
    on delete restrict
    on update restrict,
  idempotency_key text not null,
  request_hash text not null,
  provider_id text not null,
  status text not null,
  attempt_count integer not null default 1,
  error_code text,
  result_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint county_story_caption_job_status_check
    check (status in ('queued', 'processing', 'succeeded', 'failed', 'unavailable')),
  constraint county_story_caption_job_owner_key_unique
    unique (professional_owner_id, idempotency_key),
  constraint county_story_caption_job_media_unique
    unique (media_id)
);

comment on table public.county_story_caption_jobs is
  'Retry-safe caption job identity. result_payload is operational only. Spoken text is never stored here.';

alter table public.county_story_caption_sets enable row level security;
alter table public.county_story_caption_sets force row level security;
alter table public.county_story_caption_cues enable row level security;
alter table public.county_story_caption_cues force row level security;
alter table public.county_story_caption_jobs enable row level security;
alter table public.county_story_caption_jobs force row level security;

revoke all on table public.county_story_caption_sets from public, anon, authenticated;
revoke all on table public.county_story_caption_cues from public, anon, authenticated;
revoke all on table public.county_story_caption_jobs from public, anon, authenticated;
grant all on table public.county_story_caption_sets to service_role;
grant all on table public.county_story_caption_cues to service_role;
grant all on table public.county_story_caption_jobs to service_role;

-- ---------------------------------------------------------------------------
-- Cue validation. Overlaps are rejected. Adjacent end==next start is allowed.
-- ---------------------------------------------------------------------------
create or replace function public.county_story_validate_caption_cues(
  p_cues jsonb,
  p_duration_ms integer
)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_n int;
  v_i int;
  v_cue jsonb;
  v_start int;
  v_end int;
  v_prev_end int := null;
  v_text text;
begin
  if p_duration_ms is null or p_duration_ms <= 0 then
    return 'CAPTION_DURATION_UNKNOWN';
  end if;
  if p_cues is null or jsonb_typeof(p_cues) is distinct from 'array' then
    return 'CAPTION_INVALID';
  end if;
  v_n := jsonb_array_length(p_cues);
  if v_n < 1 or v_n > 60 then
    return 'CAPTION_INVALID';
  end if;
  for v_i in 0 .. v_n - 1 loop
    v_cue := p_cues -> v_i;
    if coalesce((v_cue ->> 'index')::int, -1) is distinct from v_i then
      return 'CAPTION_INVALID';
    end if;
    begin
      v_start := (v_cue ->> 'start_ms')::int;
      v_end := (v_cue ->> 'end_ms')::int;
    exception when others then
      return 'CAPTION_INVALID';
    end;
    if v_start is null or v_end is null or v_start < 0 or v_end <= v_start then
      return 'CAPTION_INVALID';
    end if;
    if v_end > p_duration_ms then
      return 'CAPTION_INVALID';
    end if;
    if v_prev_end is not null and v_start < v_prev_end then
      return 'CAPTION_INVALID';
    end if;
    v_text := btrim(coalesce(v_cue ->> 'text', ''));
    if char_length(v_text) < 1 or char_length(v_text) > 200 then
      return 'CAPTION_INVALID';
    end if;
    v_prev_end := v_end;
  end loop;
  return null;
end;
$$;

create or replace function public.county_story_media_is_accessibility_ready(
  p_media uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.county_story_media m
      join public.county_story_caption_sets s on s.media_id = m.id
     where m.id = p_media
       and m.media_deleted_at is null
       and m.accessibility_content_deleted_at is null
       and m.caption_confirmed_at is not null
       and m.caption_confirmed_revision is not distinct from m.caption_revision
       and s.confirmed_at is not null
       and s.confirmed_revision is not distinct from s.revision
       and s.content_deleted_at is null
       and m.caption_state in ('ready', 'manual_ready')
       and exists (
         select 1 from public.county_story_caption_cues c where c.media_id = m.id
       )
       and m.visual_info_confirmed_at is not null
       and (
         m.visual_info_basis = 'spoken_audio'
         or (
           m.visual_info_basis = 'supplied_description'
           and nullif(btrim(coalesce(m.accessible_description, '')), '') is not null
         )
       )
  );
$$;

comment on function public.county_story_media_is_accessibility_ready(uuid) is
  'Server publish fact. Confirmed synchronized captions plus visual-information confirmation. Not a client boolean.';

create or replace function public.county_story_purge_accessibility_content(
  p_id uuid,
  p_at timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'county stories accessibility purge requires service_role'
      using errcode = '42501';
  end if;
  delete from public.county_story_caption_cues where media_id = p_id;
  update public.county_story_caption_sets
     set content_deleted_at = coalesce(content_deleted_at, p_at),
         updated_at = p_at
   where media_id = p_id
     and content_deleted_at is null;
  update public.county_story_caption_jobs
     set result_payload = coalesce(result_payload, '{}'::jsonb) - 'transcript',
         updated_at = p_at
   where media_id = p_id;
  update public.county_story_media
     set accessible_description = null,
         accessibility_content_deleted_at = coalesce(accessibility_content_deleted_at, p_at)
   where id = p_id
     and accessibility_content_deleted_at is null;
  return true;
end;
$$;

comment on function public.county_story_purge_accessibility_content(uuid, timestamptz) is
  'Deletes temporary cue text and video-specific description. Keeps job/revision/confirmation operational facts.';

revoke all on function public.county_story_validate_caption_cues(jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.county_story_validate_caption_cues(jsonb, integer)
  to service_role;
revoke all on function public.county_story_media_is_accessibility_ready(uuid)
  from public, anon, authenticated;
grant execute on function public.county_story_media_is_accessibility_ready(uuid)
  to service_role;
revoke all on function public.county_story_purge_accessibility_content(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_purge_accessibility_content(uuid, timestamptz)
  to service_role;

create or replace function public.county_story_save_captions(
  p_owner uuid,
  p_media uuid,
  p_cues jsonb,
  p_expected_revision integer,
  p_source text,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_media public.county_story_media%rowtype;
  v_set public.county_story_caption_sets%rowtype;
  v_err text;
  v_next int;
  v_i int;
  v_cue jsonb;
  v_confirm boolean;
begin
  if auth.role() is distinct from 'service_role' then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  if p_source is null or p_source not in ('manual', 'edited') then
    return public.county_story_result(false, 'CAPTION_INVALID');
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    return public.county_story_result(false, 'CAPTION_REVISION_CONFLICT');
  end if;

  perform pg_advisory_xact_lock(hashtext('county_story_media'), hashtext(p_media::text));
  select * into v_media from public.county_story_media m where m.id = p_media for update;
  if not found or v_media.professional_owner_id is distinct from p_owner then
    return public.county_story_result(false, 'MEDIA_NOT_OWNED');
  end if;
  if v_media.media_deleted_at is not null or v_media.accessibility_content_deleted_at is not null then
    return public.county_story_result(false, 'MEDIA_NOT_VALID');
  end if;

  v_err := public.county_story_validate_caption_cues(p_cues, v_media.duration_ms);
  if v_err is not null then
    return public.county_story_result(false, v_err);
  end if;

  select * into v_set
    from public.county_story_caption_sets s
   where s.media_id = p_media
   for update;
  if found then
    if v_set.revision is distinct from p_expected_revision then
      return public.county_story_result(false, 'CAPTION_REVISION_CONFLICT', jsonb_build_object(
        'revision', v_set.revision
      ));
    end if;
    v_next := v_set.revision + 1;
  else
    if p_expected_revision is distinct from 0 then
      return public.county_story_result(false, 'CAPTION_REVISION_CONFLICT', jsonb_build_object(
        'revision', 0
      ));
    end if;
    v_next := 1;
  end if;

  v_confirm := p_source = 'manual';

  insert into public.county_story_caption_sets (
    media_id, professional_owner_id, revision, source, language, cue_format,
    confirmed_at, confirmed_revision, updated_at
  ) values (
    p_media, p_owner, v_next, p_source, 'en', 'webvtt_cues',
    case when v_confirm then p_at else null end,
    case when v_confirm then v_next else null end,
    p_at
  )
  on conflict (media_id) do update
    set revision = excluded.revision,
        source = excluded.source,
        confirmed_at = excluded.confirmed_at,
        confirmed_revision = excluded.confirmed_revision,
        content_deleted_at = null,
        updated_at = excluded.updated_at
  returning * into v_set;

  delete from public.county_story_caption_cues where set_id = v_set.id;
  for v_i in 0 .. jsonb_array_length(p_cues) - 1 loop
    v_cue := p_cues -> v_i;
    insert into public.county_story_caption_cues (
      set_id, media_id, cue_index, start_ms, end_ms, text, professionally_edited
    ) values (
      v_set.id, p_media, v_i,
      (v_cue ->> 'start_ms')::int,
      (v_cue ->> 'end_ms')::int,
      btrim(v_cue ->> 'text'),
      true
    );
  end loop;

  update public.county_story_media
     set caption_state = case when v_confirm then 'manual_ready' else 'needs_review' end,
         caption_revision = v_next,
         caption_confirmed_at = case when v_confirm then p_at else null end,
         caption_confirmed_revision = case when v_confirm then v_next else null end
   where id = p_media;

  return public.county_story_result(true, 'CAPTIONS_SAVED', jsonb_build_object(
    'media_id', p_media,
    'revision', v_next,
    'caption_state', case when v_confirm then 'manual_ready' else 'needs_review' end,
    'confirmed', v_confirm
  ));
end;
$$;

create or replace function public.county_story_confirm_captions(
  p_owner uuid,
  p_media uuid,
  p_expected_revision integer,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_media public.county_story_media%rowtype;
  v_set public.county_story_caption_sets%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  perform pg_advisory_xact_lock(hashtext('county_story_media'), hashtext(p_media::text));
  select * into v_media from public.county_story_media m where m.id = p_media for update;
  if not found or v_media.professional_owner_id is distinct from p_owner then
    return public.county_story_result(false, 'MEDIA_NOT_OWNED');
  end if;
  if v_media.media_deleted_at is not null or v_media.accessibility_content_deleted_at is not null then
    return public.county_story_result(false, 'MEDIA_NOT_VALID');
  end if;
  select * into v_set from public.county_story_caption_sets s where s.media_id = p_media for update;
  if not found or v_set.revision is distinct from p_expected_revision then
    return public.county_story_result(false, 'CAPTION_REVISION_CONFLICT', jsonb_build_object(
      'revision', coalesce(v_set.revision, 0)
    ));
  end if;
  if not exists (select 1 from public.county_story_caption_cues c where c.set_id = v_set.id) then
    return public.county_story_result(false, 'CAPTIONS_REQUIRED');
  end if;

  update public.county_story_caption_sets
     set confirmed_at = p_at,
         confirmed_revision = revision,
         updated_at = p_at
   where id = v_set.id;
  update public.county_story_media
     set caption_state = case
           when v_set.source = 'manual' then 'manual_ready'
           else 'ready'
         end,
         caption_confirmed_at = p_at,
         caption_confirmed_revision = v_set.revision
   where id = p_media;

  return public.county_story_result(true, 'CAPTIONS_CONFIRMED', jsonb_build_object(
    'media_id', p_media,
    'revision', v_set.revision
  ));
end;
$$;

create or replace function public.county_story_save_visual_access(
  p_owner uuid,
  p_media uuid,
  p_basis text,
  p_description text,
  p_story_type text,
  p_county_fips text,
  p_listing_id uuid,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_media public.county_story_media%rowtype;
  v_desc text;
begin
  if auth.role() is distinct from 'service_role' then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  if p_basis is null or p_basis not in ('spoken_audio', 'supplied_description') then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  perform pg_advisory_xact_lock(hashtext('county_story_media'), hashtext(p_media::text));
  select * into v_media from public.county_story_media m where m.id = p_media for update;
  if not found or v_media.professional_owner_id is distinct from p_owner then
    return public.county_story_result(false, 'MEDIA_NOT_OWNED');
  end if;
  if v_media.media_deleted_at is not null or v_media.accessibility_content_deleted_at is not null then
    return public.county_story_result(false, 'MEDIA_NOT_VALID');
  end if;
  v_desc := nullif(btrim(coalesce(p_description, '')), '');
  if p_basis = 'supplied_description' and v_desc is null then
    return public.county_story_result(false, 'ACCESSIBILITY_NOT_READY');
  end if;

  update public.county_story_media
     set visual_info_basis = p_basis,
         visual_info_confirmed_at = p_at,
         accessible_description = case
           when p_basis = 'supplied_description' then v_desc
           else v_desc
         end,
         accessibility_context = jsonb_strip_nulls(jsonb_build_object(
           'story_type', nullif(p_story_type, ''),
           'county_fips', nullif(p_county_fips, ''),
           'listing_id', p_listing_id
         ))
   where id = p_media;

  return public.county_story_result(true, 'ACCESSIBILITY_SAVED', jsonb_build_object(
    'media_id', p_media,
    'visual_info_basis', p_basis
  ));
end;
$$;

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
  if v_media.state is distinct from 'valid' then
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

create or replace function public.county_story_apply_auto_captions(
  p_owner uuid,
  p_media uuid,
  p_cues jsonb,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_media public.county_story_media%rowtype;
  v_set public.county_story_caption_sets%rowtype;
  v_err text;
  v_i int;
  v_cue jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  perform pg_advisory_xact_lock(hashtext('county_story_media'), hashtext(p_media::text));
  select * into v_media from public.county_story_media m where m.id = p_media for update;
  if not found or v_media.professional_owner_id is distinct from p_owner then
    return public.county_story_result(false, 'MEDIA_NOT_OWNED');
  end if;
  v_err := public.county_story_validate_caption_cues(p_cues, v_media.duration_ms);
  if v_err is not null then
    return public.county_story_result(false, v_err);
  end if;

  insert into public.county_story_caption_sets (
    media_id, professional_owner_id, revision, source, language, cue_format, updated_at
  ) values (
    p_media, p_owner, 1, 'auto', 'en', 'webvtt_cues', p_at
  )
  on conflict (media_id) do update
    set revision = public.county_story_caption_sets.revision + 1,
        source = 'auto',
        confirmed_at = null,
        confirmed_revision = null,
        content_deleted_at = null,
        updated_at = p_at
  returning * into v_set;

  delete from public.county_story_caption_cues where set_id = v_set.id;
  for v_i in 0 .. jsonb_array_length(p_cues) - 1 loop
    v_cue := p_cues -> v_i;
    insert into public.county_story_caption_cues (
      set_id, media_id, cue_index, start_ms, end_ms, text, professionally_edited
    ) values (
      v_set.id, p_media, v_i,
      (v_cue ->> 'start_ms')::int,
      (v_cue ->> 'end_ms')::int,
      btrim(v_cue ->> 'text'),
      false
    );
  end loop;

  update public.county_story_media
     set caption_state = 'auto_ready',
         caption_revision = v_set.revision,
         caption_confirmed_at = null,
         caption_confirmed_revision = null
   where id = p_media;

  return public.county_story_result(true, 'CAPTIONS_SAVED', jsonb_build_object(
    'media_id', p_media,
    'revision', v_set.revision,
    'caption_state', 'auto_ready',
    'confirmed', false
  ));
end;
$$;

create or replace function public.county_story_accessibility_status(
  p_owner uuid,
  p_media uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_media public.county_story_media%rowtype;
  v_ready boolean;
begin
  if auth.role() is distinct from 'service_role' then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  select * into v_media from public.county_story_media m where m.id = p_media;
  if not found or v_media.professional_owner_id is distinct from p_owner then
    return public.county_story_result(false, 'MEDIA_NOT_OWNED');
  end if;
  v_ready := public.county_story_media_is_accessibility_ready(p_media);
  return public.county_story_result(true, case when v_ready then 'ACCESSIBILITY_READY' else 'ACCESSIBILITY_NOT_READY' end, jsonb_build_object(
    'media_id', p_media,
    'ready', v_ready,
    'caption_state', v_media.caption_state,
    'caption_revision', v_media.caption_revision,
    'caption_confirmed', v_media.caption_confirmed_at is not null
      and v_media.caption_confirmed_revision is not distinct from v_media.caption_revision,
    'visual_info_basis', v_media.visual_info_basis
  ));
end;
$$;

revoke all on function public.county_story_save_captions(uuid, uuid, jsonb, integer, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_save_captions(uuid, uuid, jsonb, integer, text, timestamptz)
  to service_role;
revoke all on function public.county_story_confirm_captions(uuid, uuid, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_confirm_captions(uuid, uuid, integer, timestamptz)
  to service_role;
revoke all on function public.county_story_save_visual_access(uuid, uuid, text, text, text, text, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_save_visual_access(uuid, uuid, text, text, text, text, uuid, timestamptz)
  to service_role;
revoke all on function public.county_story_request_caption_job(uuid, uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_request_caption_job(uuid, uuid, text, timestamptz)
  to service_role;
revoke all on function public.county_story_apply_auto_captions(uuid, uuid, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_apply_auto_captions(uuid, uuid, jsonb, timestamptz)
  to service_role;
revoke all on function public.county_story_accessibility_status(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.county_story_accessibility_status(uuid, uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- Publish/replace consume server accessibility readiness.
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
  if v_media.state is distinct from 'valid'
     or v_media.media_deleted_at is not null then
    return public.county_story_result(false, 'MEDIA_NOT_VALID');
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
     and state = 'valid';
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
  'Atomic County Story accept. Service-role only. Feature-gated. Requires server accessibility readiness. Blocks POSTING_SUSPENDED. Stores idempotency only on PUBLISHED. No slot-delete path.';

revoke all on function public.publish_county_story(uuid, uuid, text, text, uuid, text, boolean, timestamptz)
  from public, anon, authenticated;
grant execute on function public.publish_county_story(uuid, uuid, text, text, uuid, text, boolean, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Replace: suspension blocks unused replacement. Hidden slots reactivate.
-- Optional listing update is validated. A listing detached for
-- unauthorized_property cannot be silently reattached.
-- ---------------------------------------------------------------------------
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
  if v_media.state is distinct from 'valid' or v_media.media_deleted_at is not null then
    return public.county_story_result(false, 'MEDIA_NOT_VALID');
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
     and state = 'valid';
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
  'Atomic one-time media replacement. Blocks POSTING_SUSPENDED. Reactivates a policy-hidden slot on success. Optional listing must pass authority checks and cannot restore a listing detached for unauthorized_property. Requires server accessibility readiness on the replacement media. Does not change capacity or erase enforcement history.';

revoke all on function public.replace_county_story_media(uuid, uuid, uuid, text, boolean, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.replace_county_story_media(uuid, uuid, uuid, text, boolean, timestamptz, uuid)
  to service_role;


-- ---------------------------------------------------------------------------
-- Cleanup: purge temporary caption/description content with the media version.
-- ---------------------------------------------------------------------------
create or replace function public.county_story_media_mark_retired(
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
  if exists (
    select 1 from public.county_story_slots s where s.current_media_id = p_id
  ) then
    return false;
  end if;
  update public.county_story_media m
     set state = 'deleted',
         deleted_at = p_at,
         media_deleted_at = p_at,
         cleanup_error = null,
         cleanup_attempted_at = p_at
   where m.id = p_id
     and m.media_deleted_at is null
     and m.superseded_at is not null
     and m.state <> 'deleted';
  get diagnostics n = row_count;
  if n > 0 then
    perform public.county_story_purge_accessibility_content(p_id, p_at);
  end if;
  return n > 0;
end;
$$;

create or replace function public.county_story_media_mark_policy_deleted(
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
  if exists (
    select 1
      from public.county_story_slots s
     where s.current_media_id = p_id
       and s.state = 'accepted'
  ) then
    return false;
  end if;
  update public.county_story_media m
     set state = 'deleted',
         deleted_at = p_at,
         media_deleted_at = p_at,
         cleanup_error = null,
         cleanup_attempted_at = p_at
   where m.id = p_id
     and m.media_deleted_at is null
     and m.policy_removed_at is not null
     and m.state <> 'deleted';
  get diagnostics n = row_count;
  if n > 0 then
    perform public.county_story_purge_accessibility_content(p_id, p_at);
  end if;
  return n > 0;
end;
$$;

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
  if n > 0 then
    perform public.county_story_purge_accessibility_content(p_id, p_at);
  end if;
  return n > 0;
end;
$$;

revoke all on function public.county_story_media_mark_retired(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_media_mark_retired(uuid, timestamptz)
  to service_role;
revoke all on function public.county_story_media_mark_policy_deleted(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_media_mark_policy_deleted(uuid, timestamptz)
  to service_role;
revoke all on function public.county_story_media_mark_storage_deleted(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_media_mark_storage_deleted(uuid, timestamptz)
  to service_role;
