-- Isolated County Stories Wave 5 proofs. Not production.
select set_config('request.jwt.claim.role', 'service_role', false);

update public.county_story_launch set publish_enabled = false where id = 1;

create or replace function public.w5_cues()
returns jsonb
language sql
immutable
as $$
  select '[{"index":0,"start_ms":0,"end_ms":4000,"text":"Isolated test captions."},{"index":1,"start_ms":4000,"end_ms":8000,"text":"Spoken visual context."}]'::jsonb;
$$;

create or replace function public.w5_valid_media(p_owner uuid, p_id uuid default gen_random_uuid())
returns uuid
language plpgsql
as $$
begin
  insert into public.county_story_media (
    id, professional_owner_id, purpose, state, storage_path, expires_at,
    container, codec_video, duration_ms
  ) values (
    p_id, p_owner, 'original', 'valid',
    p_owner::text || '/' || p_id::text || '/original.mp4',
    now() + interval '6 hours', 'mp4', 'avc1', 15000
  );
  return p_id;
end;
$$;

create or replace function public.w5_seed_pro(p_id uuid, p_name text)
returns void
language plpgsql
as $$
begin
  insert into public.profiles (
    id, account_kind, account_purpose, professional_role,
    legal_full_name, full_name, trec_license, verified_license, trec_status
  ) values (
    p_id, 'agent', 'individual_pro', 'realtor_broker',
    p_name, p_name, '654321', '654321', 'Active'
  )
  on conflict (id) do update
    set account_purpose = 'individual_pro',
        professional_role = 'realtor_broker',
        legal_full_name = excluded.legal_full_name,
        trec_license = '654321',
        verified_license = '654321';
end;
$$;

create or replace function public.w5_make_ready(p_owner uuid, p_media uuid)
returns void
language plpgsql
as $$
declare
  r jsonb;
begin
  r := public.county_story_save_captions(p_owner, p_media, public.w5_cues(), 0, 'manual', now());
  if r->>'code' is distinct from 'CAPTIONS_SAVED' then
    raise exception 'w5_make_ready_captions %', r;
  end if;
  r := public.county_story_save_visual_access(
    p_owner, p_media, 'spoken_audio', null, 'local_knowledge', '48373', null, now()
  );
  if r->>'code' is distinct from 'ACCESSIBILITY_SAVED' then
    raise exception 'w5_make_ready_visual %', r;
  end if;
end;
$$;

-- S first: gate stays off
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000001';
  media uuid;
  r jsonb;
begin
  perform public.w5_seed_pro(owner, 'Gate Cap');
  media := public.w5_valid_media(owner);
  perform public.w5_make_ready(owner, media);
  r := public.publish_county_story(
    owner, media, '48373', 'local_knowledge', null,
    'w5-gate-pub', true, timestamptz '2026-09-15 14:00:00-05'
  );
  if r->>'code' is distinct from 'FEATURE_DISABLED' then
    raise exception 'gate_should_block %', r;
  end if;
  raise notice 'feature_gate_remains_off';
end
$$;

update public.county_story_launch set publish_enabled = true where id = 1;

-- A valid cue set
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000010';
  media uuid;
  r jsonb;
begin
  perform public.w5_seed_pro(owner, 'Cue Valid');
  media := public.w5_valid_media(owner);
  r := public.county_story_save_captions(owner, media, public.w5_cues(), 0, 'manual', now());
  if r->>'code' is distinct from 'CAPTIONS_SAVED' then
    raise exception 'a_save %', r;
  end if;
  if (select count(*) from public.county_story_caption_cues where media_id = media) is distinct from 2 then
    raise exception 'a_cue_count';
  end if;
  raise notice 'valid_caption_cues_accepted';
end
$$;

-- B end beyond duration
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000011';
  media uuid;
  r jsonb;
begin
  perform public.w5_seed_pro(owner, 'Cue Long');
  media := public.w5_valid_media(owner);
  r := public.county_story_save_captions(
    owner, media,
    '[{"index":0,"start_ms":0,"end_ms":20000,"text":"Too long."}]'::jsonb,
    0, 'manual', now()
  );
  if r->>'code' is distinct from 'CAPTION_INVALID' then
    raise exception 'b_beyond %', r;
  end if;
  raise notice 'cue_beyond_duration_rejected';
end
$$;

-- C negative start
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000012';
  media uuid;
  r jsonb;
begin
  perform public.w5_seed_pro(owner, 'Cue Neg');
  media := public.w5_valid_media(owner);
  r := public.county_story_save_captions(
    owner, media,
    '[{"index":0,"start_ms":-1,"end_ms":1000,"text":"Bad start."}]'::jsonb,
    0, 'manual', now()
  );
  if r->>'code' is distinct from 'CAPTION_INVALID' then
    raise exception 'c_neg %', r;
  end if;
  raise notice 'negative_start_rejected';
end
$$;

-- D end before start
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000013';
  media uuid;
  r jsonb;
begin
  perform public.w5_seed_pro(owner, 'Cue Flip');
  media := public.w5_valid_media(owner);
  r := public.county_story_save_captions(
    owner, media,
    '[{"index":0,"start_ms":4000,"end_ms":1000,"text":"Backwards."}]'::jsonb,
    0, 'manual', now()
  );
  if r->>'code' is distinct from 'CAPTION_INVALID' then
    raise exception 'd_flip %', r;
  end if;
  raise notice 'end_before_start_rejected';
end
$$;

-- E overlaps rejected
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000014';
  media uuid;
  r jsonb;
begin
  perform public.w5_seed_pro(owner, 'Cue Over');
  media := public.w5_valid_media(owner);
  r := public.county_story_save_captions(
    owner, media,
    '[{"index":0,"start_ms":0,"end_ms":4000,"text":"One."},{"index":1,"start_ms":3000,"end_ms":6000,"text":"Overlap."}]'::jsonb,
    0, 'manual', now()
  );
  if r->>'code' is distinct from 'CAPTION_INVALID' then
    raise exception 'e_overlap %', r;
  end if;
  raise notice 'overlapping_cues_rejected';
end
$$;

-- F professional A cannot edit B
do $$
declare
  a uuid := '20000000-0000-4000-8000-000000000015';
  b uuid := '20000000-0000-4000-8000-000000000016';
  media uuid;
  r jsonb;
begin
  perform public.w5_seed_pro(a, 'Owner A');
  perform public.w5_seed_pro(b, 'Owner B');
  media := public.w5_valid_media(a);
  r := public.county_story_save_captions(b, media, public.w5_cues(), 0, 'manual', now());
  if r->>'code' is distinct from 'MEDIA_NOT_OWNED' then
    raise exception 'f_cross %', r;
  end if;
  raise notice 'owner_a_cannot_edit_owner_b';
end
$$;

-- G consumer cannot edit
do $$
declare
  media uuid;
  r jsonb;
begin
  media := public.w5_valid_media('b2222222-2222-2222-2222-222222222222');
  r := public.county_story_save_captions(
    'a1111111-1111-1111-1111-111111111111', media, public.w5_cues(), 0, 'manual', now()
  );
  if r->>'code' is distinct from 'MEDIA_NOT_OWNED' then
    raise exception 'g_consumer %', r;
  end if;
  raise notice 'consumer_cannot_edit_captions';
end
$$;

-- H auto failure: no strike / slot / capacity
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000017';
  media uuid;
  r jsonb;
begin
  perform public.w5_seed_pro(owner, 'Job Fail');
  media := public.w5_valid_media(owner);
  r := public.county_story_request_caption_job(owner, media, 'w5-job-fail-1', now());
  if r->>'code' is distinct from 'PROVIDER_UNAVAILABLE' then
    raise exception 'h_job %', r;
  end if;
  if exists (select 1 from public.county_story_enforcement_events where professional_owner_id = owner) then
    raise exception 'h_strike';
  end if;
  if exists (select 1 from public.county_story_slots where professional_owner_id = owner) then
    raise exception 'h_slot';
  end if;
  if (public.county_story_capacity('48373', timestamptz '2026-09-16 14:00:00-05')->>'accepted')::int is distinct from 0 then
    raise exception 'h_capacity';
  end if;
  raise notice 'auto_failure_no_strike_slot_capacity';
end
$$;

-- I auto transcript without confirm → publish denied
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000018';
  media uuid;
  r jsonb;
begin
  perform public.w5_seed_pro(owner, 'Auto Only');
  media := public.w5_valid_media(owner);
  r := public.county_story_apply_auto_captions(owner, media, public.w5_cues(), now());
  if r->>'code' is distinct from 'CAPTIONS_SAVED' then
    raise exception 'i_auto %', r;
  end if;
  r := public.county_story_save_visual_access(
    owner, media, 'spoken_audio', null, 'local_knowledge', '48373', null, now()
  );
  r := public.publish_county_story(
    owner, media, '48373', 'local_knowledge', null,
    'w5-unconfirmed', true, timestamptz '2026-09-16 14:00:00-05'
  );
  if r->>'code' is distinct from 'ACCESSIBILITY_NOT_READY' then
    raise exception 'i_publish %', r;
  end if;
  if exists (select 1 from public.county_story_slots where professional_owner_id = owner) then
    raise exception 'i_slot';
  end if;
  raise notice 'unconfirmed_auto_captions_block_publish';
end
$$;

-- J confirmed + visual → ready
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000019';
  media uuid;
  r jsonb;
begin
  perform public.w5_seed_pro(owner, 'Ready');
  media := public.w5_valid_media(owner);
  perform public.w5_make_ready(owner, media);
  r := public.county_story_accessibility_status(owner, media);
  if r->>'code' is distinct from 'ACCESSIBILITY_READY' then
    raise exception 'j_ready %', r;
  end if;
  if public.county_story_media_is_accessibility_ready(media) is not true then
    raise exception 'j_fn';
  end if;
  raise notice 'confirmed_captions_accessibility_ready';
end
$$;

-- K unready publish creates no slot / capacity
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000020';
  media uuid;
  r jsonb;
  before int;
  after int;
begin
  perform public.w5_seed_pro(owner, 'Unready Pub');
  media := public.w5_valid_media(owner);
  before := (public.county_story_capacity('48373', timestamptz '2026-09-17 14:00:00-05')->>'accepted')::int;
  r := public.publish_county_story(
    owner, media, '48373', 'local_knowledge', null,
    'w5-unready-pub', true, timestamptz '2026-09-17 14:00:00-05'
  );
  if r->>'code' is distinct from 'ACCESSIBILITY_NOT_READY' then
    raise exception 'k_code %', r;
  end if;
  after := (public.county_story_capacity('48373', timestamptz '2026-09-17 14:00:00-05')->>'accepted')::int;
  if after is distinct from before then
    raise exception 'k_capacity % %', before, after;
  end if;
  if exists (select 1 from public.county_story_slots where professional_owner_id = owner) then
    raise exception 'k_slot';
  end if;
  raise notice 'unready_publish_no_slot';
end
$$;

-- L replacement unready keeps original
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000021';
  v1 uuid;
  v2 uuid;
  slot uuid;
  r jsonb;
begin
  perform public.w5_seed_pro(owner, 'Replace Keep');
  v1 := public.w5_valid_media(owner);
  perform public.w5_make_ready(owner, v1);
  r := public.publish_county_story(
    owner, v1, '48373', 'local_knowledge', null,
    'w5-rep-pub', true, timestamptz '2026-09-18 14:00:00-05'
  );
  if r->>'code' is distinct from 'PUBLISHED' then
    raise exception 'l_pub %', r;
  end if;
  slot := (r->>'slot_id')::uuid;
  v2 := public.w5_valid_media(owner);
  r := public.replace_county_story_media(
    owner, slot, v2, 'w5-rep-bad', true, timestamptz '2026-09-18 14:10:00-05', null
  );
  if r->>'code' is distinct from 'ACCESSIBILITY_NOT_READY' then
    raise exception 'l_rep %', r;
  end if;
  if (select current_media_id from public.county_story_slots where id = slot) is distinct from v1 then
    raise exception 'l_current';
  end if;
  if (select replacement_used from public.county_story_slots where id = slot) is not false then
    raise exception 'l_used';
  end if;
  raise notice 'unready_replace_keeps_original';
end
$$;

-- M version captions stay separate + ready replace
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000022';
  v1 uuid;
  v2 uuid;
  slot uuid;
  r jsonb;
begin
  perform public.w5_seed_pro(owner, 'Separate Caps');
  v1 := public.w5_valid_media(owner);
  perform public.w5_make_ready(owner, v1);
  r := public.publish_county_story(
    owner, v1, '48005', 'local_knowledge', null,
    'w5-sep-pub', true, timestamptz '2026-09-19 14:00:00-05'
  );
  slot := (r->>'slot_id')::uuid;
  v2 := public.w5_valid_media(owner);
  r := public.county_story_save_captions(
    owner, v2,
    '[{"index":0,"start_ms":0,"end_ms":5000,"text":"Version two captions only."}]'::jsonb,
    0, 'manual', now()
  );
  r := public.county_story_save_visual_access(
    owner, v2, 'spoken_audio', null, 'local_knowledge', '48005', null, now()
  );
  r := public.replace_county_story_media(
    owner, slot, v2, 'w5-sep-rep', true, timestamptz '2026-09-19 14:10:00-05', null
  );
  if r->>'code' is distinct from 'REPLACED' then
    raise exception 'm_rep %', r;
  end if;
  if (select count(*) from public.county_story_caption_cues where media_id = v1) is distinct from 2 then
    raise exception 'm_v1';
  end if;
  if (select count(*) from public.county_story_caption_cues where media_id = v2) is distinct from 1 then
    raise exception 'm_v2';
  end if;
  raise notice 'version_captions_remain_separate';
end
$$;

-- N superseded content delete
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000022';
  v1 uuid;
  ok boolean;
begin
  select id into v1
    from public.county_story_media
   where professional_owner_id = owner
     and superseded_at is not null
   order by created_at
   limit 1;
  ok := public.county_story_media_mark_retired(v1, now());
  if ok is not true then
    raise exception 'n_mark';
  end if;
  if exists (select 1 from public.county_story_caption_cues where media_id = v1) then
    raise exception 'n_cues';
  end if;
  if (select accessible_description from public.county_story_media where id = v1) is not null then
    raise exception 'n_desc';
  end if;
  if (select accessibility_content_deleted_at from public.county_story_media where id = v1) is null then
    raise exception 'n_flag';
  end if;
  raise notice 'superseded_captions_deleted';
end
$$;

-- O policy-removed accessibility delete
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000023';
  media uuid;
  slot uuid;
  r jsonb;
  ok boolean;
begin
  perform public.w5_seed_pro(owner, 'Policy Caps');
  media := public.w5_valid_media(owner);
  perform public.w5_make_ready(owner, media);
  r := public.publish_county_story(
    owner, media, '48455', 'local_knowledge', null,
    'w5-pol-pub', true, timestamptz '2026-09-20 14:00:00-05'
  );
  slot := (r->>'slot_id')::uuid;
  r := public.hide_county_story_for_policy(
    slot, 'other_policy', null, 'w5-pol-hide', 'admin', 'admin',
    timestamptz '2026-09-20 14:05:00-05'
  );
  if r->>'code' is distinct from 'POLICY_HIDDEN' then
    raise exception 'o_hide %', r;
  end if;
  ok := public.county_story_media_mark_policy_deleted(media, now());
  if ok is not true then
    raise exception 'o_mark';
  end if;
  if exists (select 1 from public.county_story_caption_cues where media_id = media) then
    raise exception 'o_cues';
  end if;
  if not exists (select 1 from public.county_story_enforcement_events where slot_id = slot) then
    raise exception 'o_event';
  end if;
  raise notice 'policy_removed_captions_deleted';
end
$$;

-- P expired unpublished purge keeps job facts
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000024';
  media uuid;
  r jsonb;
  ok boolean;
  jobs int;
begin
  perform public.w5_seed_pro(owner, 'Expire Caps');
  media := public.w5_valid_media(owner);
  r := public.county_story_request_caption_job(owner, media, 'w5-job-exp-1', now());
  r := public.county_story_save_captions(owner, media, public.w5_cues(), 0, 'manual', now());
  update public.county_story_media set expires_at = now() - interval '1 hour' where id = media;
  ok := public.county_story_media_mark_storage_deleted(media, now());
  if ok is not true then
    raise exception 'p_mark';
  end if;
  if exists (select 1 from public.county_story_caption_cues where media_id = media) then
    raise exception 'p_cues';
  end if;
  select count(*) into jobs from public.county_story_caption_jobs where media_id = media;
  if jobs is distinct from 1 then
    raise exception 'p_job %', jobs;
  end if;
  raise notice 'expired_captions_deleted_job_kept';
end
$$;

-- Q job retry idempotent
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000025';
  media uuid;
  a jsonb;
  b jsonb;
begin
  perform public.w5_seed_pro(owner, 'Job Idem');
  media := public.w5_valid_media(owner);
  a := public.county_story_request_caption_job(owner, media, 'w5-job-idemp-1', now());
  b := public.county_story_request_caption_job(owner, media, 'w5-job-idemp-1', now());
  if a->>'job_id' is distinct from b->>'job_id' then
    raise exception 'q_job % %', a, b;
  end if;
  if (b->>'attempt_count')::int < 2 then
    raise exception 'q_attempts %', b;
  end if;
  if (select count(*) from public.county_story_caption_jobs where professional_owner_id = owner) is distinct from 1 then
    raise exception 'q_count';
  end if;
  raise notice 'caption_job_retry_idempotent';
end
$$;

-- R stale edit
do $$
declare
  owner uuid := '20000000-0000-4000-8000-000000000026';
  media uuid;
  r jsonb;
begin
  perform public.w5_seed_pro(owner, 'Stale Edit');
  media := public.w5_valid_media(owner);
  r := public.county_story_save_captions(owner, media, public.w5_cues(), 0, 'manual', now());
  r := public.county_story_save_captions(
    owner, media,
    '[{"index":0,"start_ms":0,"end_ms":3000,"text":"Second revision."}]'::jsonb,
    1, 'edited', now()
  );
  if r->>'code' is distinct from 'CAPTIONS_SAVED' then
    raise exception 'r_second %', r;
  end if;
  r := public.county_story_save_captions(
    owner, media,
    '[{"index":0,"start_ms":0,"end_ms":3000,"text":"Stale overwrite."}]'::jsonb,
    1, 'edited', now()
  );
  if r->>'code' is distinct from 'CAPTION_REVISION_CONFLICT' then
    raise exception 'r_stale %', r;
  end if;
  if (select text from public.county_story_caption_cues where media_id = media and cue_index = 0) is distinct from 'Second revision.' then
    raise exception 'r_kept';
  end if;
  raise notice 'stale_edit_does_not_overwrite';
end
$$;

-- anonymous / authenticated cannot call caption RPCs
do $$
declare
  r jsonb;
begin
  perform set_config('request.jwt.claim.role', 'anon', false);
  r := public.county_story_save_captions(
    '20000000-0000-4000-8000-000000000010',
    '20000000-0000-4000-8000-000000000010',
    public.w5_cues(), 0, 'manual', now()
  );
  if r->>'code' is distinct from 'NOT_ELIGIBLE' then
    raise exception 'anon_save %', r;
  end if;
  perform set_config('request.jwt.claim.role', 'authenticated', false);
  r := public.county_story_confirm_captions(
    '20000000-0000-4000-8000-000000000010',
    '20000000-0000-4000-8000-000000000010',
    1, now()
  );
  if r->>'code' is distinct from 'NOT_ELIGIBLE' then
    raise exception 'auth_confirm %', r;
  end if;
  perform set_config('request.jwt.claim.role', 'service_role', false);
  raise notice 'client_roles_cannot_write_captions';
end
$$;

update public.county_story_launch set publish_enabled = false where id = 1;

do $$
begin
  if (select publish_enabled from public.county_story_launch where id = 1) is not false then
    raise exception 'gate_left_on';
  end if;
  raise notice 'wave5_gates_ok';
end
$$;
