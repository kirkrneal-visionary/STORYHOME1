-- Isolated County Stories Wave 5 Mux / prepared-playback proofs. Not production.
select set_config('request.jwt.claim.role', 'service_role', false);

update public.county_story_launch set publish_enabled = false where id = 1;

create or replace function public.w5_mux_cues()
returns jsonb
language sql
immutable
as $$
  select '[{"index":0,"start_ms":0,"end_ms":4000,"text":"Isolated mux captions."},{"index":1,"start_ms":4000,"end_ms":8000,"text":"Spoken visual context."}]'::jsonb;
$$;

create or replace function public.w5_mux_seed_pro(p_id uuid, p_name text)
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

create or replace function public.w5_mux_source(
  p_owner uuid,
  p_state text,
  p_container text,
  p_codec text,
  p_id uuid default gen_random_uuid()
)
returns uuid
language plpgsql
as $$
begin
  insert into public.county_story_media (
    id, professional_owner_id, purpose, state, storage_path, expires_at,
    container, codec_video, duration_ms
  ) values (
    p_id, p_owner, 'original', p_state,
    p_owner::text || '/' || p_id::text || '/original.' ||
      case when p_container = 'quicktime' then 'mov' else 'mp4' end,
    now() + interval '6 hours', p_container, p_codec, 15000
  );
  return p_id;
end;
$$;

-- Gate stays off
do $$
declare
  owner uuid := '30000000-0000-4000-8000-000000000001';
  media uuid;
  r jsonb;
begin
  perform public.w5_mux_seed_pro(owner, 'Mux Gate');
  media := public.w5_mux_source(owner, 'needs_normalization', 'quicktime', 'hvc1');
  perform public.county_story_mark_provider_ready(
    media, 'ast_gate', 'pb_gate', 'signed', 15000, now()
  );
  perform public.county_story_save_captions(owner, media, public.w5_mux_cues(), 0, 'manual', now());
  perform public.county_story_save_visual_access(
    owner, media, 'spoken_audio', null, 'local_knowledge', '48373', null, now()
  );
  r := public.publish_county_story(
    owner, media, '48373', 'local_knowledge', null, 'mux-gate-1', true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'FEATURE_DISABLED' then
    raise exception 'mux_gate %', r;
  end if;
  if exists (select 1 from public.county_story_slots) then
    raise exception 'mux_gate_slot';
  end if;
  raise notice 'mux_feature_gate_remains_off';
end
$$;

update public.county_story_launch set publish_enabled = true where id = 1;

-- HEVC source stays source after prepared playback
do $$
declare
  owner uuid := '30000000-0000-4000-8000-000000000002';
  media uuid;
  r jsonb;
  st text;
  cont text;
  codec text;
begin
  perform public.w5_mux_seed_pro(owner, 'Mux Hevc');
  media := public.w5_mux_source(owner, 'needs_normalization', 'quicktime', 'hvc1');
  r := public.county_story_mark_provider_processing(media, 'ast_hevc', now());
  if r->>'code' is distinct from 'PROVIDER_PROCESSING' then
    raise exception 'hevc_processing %', r;
  end if;
  r := public.county_story_mark_provider_ready(
    media, 'ast_hevc', 'pb_hevc', 'signed', 15000, now()
  );
  if r->>'code' is distinct from 'PLAYBACK_READY' then
    raise exception 'hevc_ready %', r;
  end if;
  if not public.county_story_media_is_playback_ready(media) then
    raise exception 'hevc_playback_not_ready';
  end if;
  select state, container, codec_video into st, cont, codec
    from public.county_story_media where id = media;
  if st is distinct from 'needs_normalization' or cont is distinct from 'quicktime' or codec is distinct from 'hvc1' then
    raise exception 'hevc_relabeled % % %', st, cont, codec;
  end if;
  raise notice 'hevc_source_unchanged';
end
$$;

-- Already-good MP4 also enters provider path and stays source-valid
do $$
declare
  owner uuid := '30000000-0000-4000-8000-000000000003';
  media uuid;
  r jsonb;
  st text;
begin
  perform public.w5_mux_seed_pro(owner, 'Mux Mp4');
  media := public.w5_mux_source(owner, 'valid', 'mp4', 'avc1');
  r := public.county_story_mark_provider_processing(media, 'ast_mp4', now());
  r := public.county_story_mark_provider_ready(
    media, 'ast_mp4', 'pb_mp4', 'signed', 15000, now()
  );
  if r->>'code' is distinct from 'PLAYBACK_READY' then
    raise exception 'mp4_ready %', r;
  end if;
  select state into st from public.county_story_media where id = media;
  if st is distinct from 'valid' then
    raise exception 'mp4_relabeled %', st;
  end if;
  if not public.county_story_media_is_playback_ready(media) then
    raise exception 'mp4_playback_missing';
  end if;
  raise notice 'mp4_enters_provider_path';
end
$$;

-- Public playback id is rejected. Ready does not require a static MP4 column.
do $$
declare
  owner uuid := '30000000-0000-4000-8000-000000000004';
  media uuid;
  r jsonb;
begin
  perform public.w5_mux_seed_pro(owner, 'Mux Public');
  media := public.w5_mux_source(owner, 'valid', 'mp4', 'avc1');
  r := public.county_story_mark_provider_ready(
    media, 'ast_pub', 'pb_pub', 'public', 15000, now()
  );
  if r->>'code' is distinct from 'PLAYBACK_POLICY_INVALID' then
    raise exception 'public_accepted %', r;
  end if;
  if public.county_story_media_is_playback_ready(media) then
    raise exception 'public_marked_ready';
  end if;
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'county_story_media'
       and column_name in ('playback_container', 'mp4_support', 'static_mp4')
  ) then
    raise exception 'static_mp4_field_present';
  end if;
  raise notice 'signed_playback_only';
end
$$;

-- Source MP4 without prepared playback cannot publish
do $$
declare
  owner uuid := '30000000-0000-4000-8000-000000000005';
  media uuid;
  r jsonb;
begin
  perform public.w5_mux_seed_pro(owner, 'Mux Probe');
  media := public.w5_mux_source(owner, 'valid', 'mp4', 'avc1');
  perform public.county_story_save_captions(owner, media, public.w5_mux_cues(), 0, 'manual', now());
  perform public.county_story_save_visual_access(
    owner, media, 'spoken_audio', null, 'local_knowledge', '48373', null, now()
  );
  r := public.publish_county_story(
    owner, media, '48373', 'local_knowledge', null, 'mux-probe-1', true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'PLAYBACK_NOT_READY' then
    raise exception 'probe_published %', r;
  end if;
  if exists (select 1 from public.county_story_slots where professional_owner_id = owner) then
    raise exception 'probe_created_slot';
  end if;
  raise notice 'source_probe_not_enough';
end
$$;

-- HEVC + signed HLS + confirmed captions can publish
do $$
declare
  owner uuid := '30000000-0000-4000-8000-000000000006';
  media uuid;
  r jsonb;
begin
  perform public.w5_mux_seed_pro(owner, 'Mux Publish');
  media := public.w5_mux_source(owner, 'needs_normalization', 'quicktime', 'hvc1');
  perform public.county_story_mark_provider_ready(
    media, 'ast_pubhevc', 'pb_pubhevc', 'signed', 15000, now()
  );
  perform public.county_story_save_captions(owner, media, public.w5_mux_cues(), 0, 'manual', now());
  perform public.county_story_save_visual_access(
    owner, media, 'spoken_audio', null, 'local_knowledge', '48373', null, now()
  );
  r := public.publish_county_story(
    owner, media, '48373', 'local_knowledge', null, 'mux-hevc-pub', true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'PUBLISHED' then
    raise exception 'hevc_publish %', r;
  end if;
  raise notice 'hevc_prepared_can_publish';
end
$$;

-- Auto captions stay unconfirmed; manual fallback still works
do $$
declare
  owner uuid := '30000000-0000-4000-8000-000000000007';
  media uuid;
  r jsonb;
begin
  perform public.w5_mux_seed_pro(owner, 'Mux Caps');
  media := public.w5_mux_source(owner, 'valid', 'mp4', 'avc1');
  perform public.county_story_mark_provider_ready(
    media, 'ast_caps', 'pb_caps', 'signed', 15000, now()
  );
  r := public.county_story_apply_auto_captions(owner, media, public.w5_mux_cues(), now());
  if r->>'code' is distinct from 'CAPTIONS_SAVED' then
    raise exception 'auto_import %', r;
  end if;
  if (select caption_state from public.county_story_media where id = media) is distinct from 'auto_ready' then
    raise exception 'auto_not_auto_ready';
  end if;
  if public.county_story_media_is_accessibility_ready(media) then
    raise exception 'auto_confirmed_too_soon';
  end if;
  r := public.county_story_confirm_captions(owner, media, 1, now());
  if r->>'code' is distinct from 'CAPTIONS_CONFIRMED' then
    raise exception 'auto_confirm %', r;
  end if;
  r := public.county_story_save_captions(owner, media, public.w5_mux_cues(), 1, 'manual', now());
  if r->>'code' is distinct from 'CAPTIONS_SAVED' then
    raise exception 'manual_fallback %', r;
  end if;
  raise notice 'auto_unconfirmed_manual_works';
end
$$;

-- Webhook replay is idempotent
do $$
declare
  owner uuid := '30000000-0000-4000-8000-000000000008';
  media uuid;
  a jsonb;
  b jsonb;
begin
  perform public.w5_mux_seed_pro(owner, 'Mux Replay');
  media := public.w5_mux_source(owner, 'valid', 'mp4', 'avc1');
  a := public.county_story_claim_provider_event(
    'evt_replay_1xxxxxxxx', 'video.asset.ready', media, 'ast_rep', 'abc', now()
  );
  b := public.county_story_claim_provider_event(
    'evt_replay_1xxxxxxxx', 'video.asset.ready', media, 'ast_rep', 'abc', now()
  );
  if a->>'code' is distinct from 'PROVIDER_EVENT_ACCEPTED' then
    raise exception 'claim_first %', a;
  end if;
  if b->>'code' is distinct from 'PROVIDER_EVENT_REPLAY' then
    raise exception 'claim_replay %', b;
  end if;
  raise notice 'webhook_replay_idempotent';
end
$$;

-- Provider processing failure creates no slot / strike / capacity
do $$
declare
  owner uuid := '30000000-0000-4000-8000-000000000009';
  media uuid;
  r jsonb;
begin
  perform public.w5_mux_seed_pro(owner, 'Mux Fail');
  media := public.w5_mux_source(owner, 'valid', 'mp4', 'avc1');
  r := public.county_story_mark_provider_errored(media, 'mux_failed', now(), 'evt_err');
  if r->>'code' is distinct from 'PROVIDER_ERRORED' then
    raise exception 'errored %', r;
  end if;
  if exists (select 1 from public.county_story_slots where professional_owner_id = owner) then
    raise exception 'error_created_slot';
  end if;
  if exists (select 1 from public.county_story_enforcement_events) then
    raise exception 'error_created_strike';
  end if;
  if exists (select 1 from public.county_story_days where accepted_count > 0 and county_fips = '48471') then
    raise exception 'error_capacity';
  end if;
  raise notice 'provider_failure_no_enforcement';
end
$$;

-- Provider delete failure stays retryable
do $$
declare
  owner uuid := '30000000-0000-4000-8000-000000000010';
  media uuid;
begin
  perform public.w5_mux_seed_pro(owner, 'Mux Del');
  media := public.w5_mux_source(owner, 'valid', 'mp4', 'avc1');
  perform public.county_story_mark_provider_ready(
    media, 'ast_del', 'pb_del', 'signed', 15000, now()
  );
  perform public.county_story_media_revoke_playback(media, now());
  perform public.county_story_record_provider_delete_error(media, 'mux_delete_failed', now());
  if (select provider_deleted_at from public.county_story_media where id = media) is not null then
    raise exception 'falsely_deleted';
  end if;
  if (select provider_delete_error from public.county_story_media where id = media) is null then
    raise exception 'delete_error_missing';
  end if;
  if not exists (
    select 1 from public.county_story_media_list_provider_delete_retry(now() + interval '1 minute')
     where id = media
  ) then
    raise exception 'retry_list_missing';
  end if;
  if not public.county_story_mark_provider_deleted(media, now()) then
    raise exception 'delete_mark_failed';
  end if;
  if (select provider_deleted_at from public.county_story_media where id = media) is null then
    raise exception 'delete_not_recorded';
  end if;
  raise notice 'provider_delete_retry';
end
$$;

-- Abandoned staging list includes provider asset
do $$
declare
  owner uuid := '30000000-0000-4000-8000-000000000011';
  media uuid;
begin
  perform public.w5_mux_seed_pro(owner, 'Mux Abandon');
  media := public.w5_mux_source(owner, 'needs_normalization', 'quicktime', 'hvc1');
  perform public.county_story_mark_provider_processing(media, 'ast_abn', now());
  update public.county_story_media set expires_at = now() - interval '1 minute' where id = media;
  if not exists (
    select 1 from public.county_story_media_list_expired(now())
     where id = media and provider_asset_id = 'ast_abn'
  ) then
    raise exception 'abandoned_missing';
  end if;
  raise notice 'abandoned_provider_listed';
end
$$;

-- Cross-owner processing denied by publish / caption job
do $$
declare
  a uuid := '30000000-0000-4000-8000-000000000012';
  b uuid := '30000000-0000-4000-8000-000000000013';
  media uuid;
  r jsonb;
begin
  perform public.w5_mux_seed_pro(a, 'Mux A');
  perform public.w5_mux_seed_pro(b, 'Mux B');
  media := public.w5_mux_source(a, 'valid', 'mp4', 'avc1');
  perform public.county_story_mark_provider_ready(
    media, 'ast_own', 'pb_own', 'signed', 15000, now()
  );
  r := public.county_story_request_caption_job(b, media, 'mux-cross-1', now());
  if r->>'code' is distinct from 'MEDIA_NOT_OWNED' then
    raise exception 'cross_job %', r;
  end if;
  r := public.publish_county_story(
    b, media, '48373', 'local_knowledge', null, 'mux-cross-pub', true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'MEDIA_NOT_OWNED' then
    raise exception 'cross_pub %', r;
  end if;
  raise notice 'cross_owner_denied';
end
$$;

-- Replacement cleanup lists the superseded Mux asset
do $$
declare
  owner uuid := '30000000-0000-4000-8000-000000000014';
  v1 uuid;
  v2 uuid;
  r jsonb;
begin
  perform public.w5_mux_seed_pro(owner, 'Mux Replace');
  v1 := public.w5_mux_source(owner, 'valid', 'mp4', 'avc1');
  perform public.county_story_mark_provider_ready(v1, 'ast_rep1', 'pb_rep1', 'signed', 15000, now());
  perform public.county_story_save_captions(owner, v1, public.w5_mux_cues(), 0, 'manual', now());
  perform public.county_story_save_visual_access(
    owner, v1, 'spoken_audio', null, 'local_knowledge', '48407', null, now()
  );
  r := public.publish_county_story(
    owner, v1, '48407', 'local_knowledge', null, 'mux-rep-pub', true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  v2 := public.w5_mux_source(owner, 'needs_normalization', 'quicktime', 'hvc1');
  perform public.county_story_mark_provider_ready(v2, 'ast_rep2', 'pb_rep2', 'signed', 15000, now());
  perform public.county_story_save_captions(owner, v2, public.w5_mux_cues(), 0, 'manual', now());
  perform public.county_story_save_visual_access(
    owner, v2, 'spoken_audio', null, 'local_knowledge', '48407', null, now()
  );
  r := public.replace_county_story_media(
    owner, (r->>'slot_id')::uuid, v2, 'mux-rep-1', true,
    timestamptz '2026-09-24 15:00:00-05', null
  );
  if r->>'code' is distinct from 'REPLACED' then
    raise exception 'mux_replace %', r;
  end if;
  if not exists (
    select 1 from public.county_story_media_list_superseded(now() + interval '1 minute')
     where id = v1 and provider_asset_id = 'ast_rep1'
  ) then
    raise exception 'replace_cleanup_missing';
  end if;
  raise notice 'replacement_provider_cleanup';
end
$$;

-- Policy-hide cleanup lists the removed Mux asset
do $$
declare
  owner uuid := '30000000-0000-4000-8000-000000000015';
  media uuid;
  r jsonb;
begin
  perform public.w5_mux_seed_pro(owner, 'Mux Hide');
  media := public.w5_mux_source(owner, 'valid', 'mp4', 'avc1');
  perform public.county_story_mark_provider_ready(media, 'ast_hide', 'pb_hide', 'signed', 15000, now());
  perform public.county_story_save_captions(owner, media, public.w5_mux_cues(), 0, 'manual', now());
  perform public.county_story_save_visual_access(
    owner, media, 'spoken_audio', null, 'local_knowledge', '48455', null, now()
  );
  r := public.publish_county_story(
    owner, media, '48455', 'local_knowledge', null, 'mux-hide-pub', true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  r := public.hide_county_story_for_policy(
    (r->>'slot_id')::uuid, 'generic_solicitation', 'mux test',
    'mux-hide-1', 'system', null, timestamptz '2026-09-24 16:00:00-05'
  );
  if r->>'code' is distinct from 'POLICY_HIDDEN' then
    raise exception 'mux_hide %', r;
  end if;
  if not exists (
    select 1 from public.county_story_media_list_policy_removed(now() + interval '1 minute')
     where id = media and provider_asset_id = 'ast_hide'
  ) then
    raise exception 'policy_cleanup_missing';
  end if;
  raise notice 'policy_hide_provider_cleanup';
end
$$;

-- Future-expiry contract remains 6 hours
do $$
declare
  owner uuid := '30000000-0000-4000-8000-000000000016';
  media uuid;
  life interval;
begin
  perform public.w5_mux_seed_pro(owner, 'Mux Expiry');
  media := public.w5_mux_source(owner, 'valid', 'mp4', 'avc1');
  select expires_at - created_at into life from public.county_story_media where id = media;
  if life < interval '5 hours 59 minutes' or life > interval '6 hours 1 minute' then
    raise exception 'expiry_contract %', life;
  end if;
  raise notice 'expiry_and_cleanup_contract';
end
$$;

do $$
begin
  if (select publish_enabled from public.county_story_launch where id = 1) is not true then
    raise exception 'isolated_gate_should_be_on';
  end if;
  update public.county_story_launch set publish_enabled = false where id = 1;
  if (select publish_enabled from public.county_story_launch where id = 1) is not false then
    raise exception 'gate_not_restored';
  end if;
  raise notice 'mux_gates_ok';
end
$$;
