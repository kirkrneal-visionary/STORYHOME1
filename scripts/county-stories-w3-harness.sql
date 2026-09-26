-- Isolated County Stories Wave 3 proofs. Not production.
select set_config('request.jwt.claim.role', 'service_role', false);

update public.county_story_launch set publish_enabled = false where id = 1;

create or replace function public.w3_valid_media(p_owner uuid, p_id uuid default gen_random_uuid())
returns uuid
language plpgsql
as $$
begin
  insert into public.county_story_media (
    id, professional_owner_id, purpose, state, storage_path, expires_at,
    container, codec_video, duration_ms
  ) values (
    p_id,
    p_owner,
    'original',
    'valid',
    p_owner::text || '/' || p_id::text || '/original.mp4',
    now() + interval '6 hours',
    'mp4',
    'avc1',
    15000
  );
  perform public.county_story_save_captions(
    p_owner,
    p_id,
    '[{"index":0,"start_ms":0,"end_ms":4000,"text":"Isolated test captions."},{"index":1,"start_ms":4000,"end_ms":8000,"text":"Spoken visual context."}]'::jsonb,
    0,
    'manual',
    now()
  );
  perform public.county_story_save_visual_access(
    p_owner, p_id, 'spoken_audio', null, 'local_knowledge', '48373', null, now()
  );
  return p_id;
end;
$$;

do $$
declare
  r jsonb;
  media uuid;
begin
  media := public.w3_valid_media('b2222222-2222-2222-2222-222222222222');
  r := public.publish_county_story(
    'b2222222-2222-2222-2222-222222222222',
    media,
    '48373',
    'local_knowledge',
    null,
    'idemp-feature-1',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'FEATURE_DISABLED' then
    raise exception 'feature_gate_open %', r;
  end if;
  if exists (select 1 from public.county_story_slots) then
    raise exception 'feature_gate_created_slot';
  end if;
  if (select slot_id from public.county_story_media where id = media) is not null then
    raise exception 'feature_gate_attached_media';
  end if;
  if exists (select 1 from public.county_story_days where accepted_count > 0) then
    raise exception 'feature_gate_capacity';
  end if;
  if exists (
    select 1 from public.county_story_publish_intents
     where result_code in ('PUBLISHED', 'REPLACED')
  ) then
    raise exception 'feature_gate_stored_success';
  end if;
  raise notice 'feature_disabled';
end
$$;

update public.county_story_launch set publish_enabled = true where id = 1;

do $$
declare
  r jsonb;
  media uuid := public.w3_valid_media('b2222222-2222-2222-2222-222222222222');
begin
  r := public.publish_county_story(
    'a1111111-1111-1111-1111-111111111111',
    media,
    '48373',
    'local_knowledge',
    null,
    'idemp-consumer-1',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'STORY_PRO_REQUIRED' then
    raise exception 'consumer_published %', r;
  end if;
  raise notice 'consumer_denied';
end
$$;

do $$
declare
  r jsonb;
  media uuid := public.w3_valid_media('b2222222-2222-2222-2222-222222222222');
begin
  r := public.publish_county_story(
    'e5555555-5555-5555-5555-555555555555',
    media,
    '48373',
    'local_knowledge',
    null,
    'idemp-other-1',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' not in ('NOT_ELIGIBLE', 'STORY_PRO_REQUIRED') then
    raise exception 'other_pro_published %', r;
  end if;
  raise notice 'other_professional_denied';
end
$$;

do $$
declare
  r jsonb;
  media uuid := public.w3_valid_media('f6666666-6666-6666-6666-666666666666');
begin
  r := public.publish_county_story(
    'f6666666-6666-6666-6666-666666666666',
    media,
    '48373',
    'local_knowledge',
    null,
    'idemp-nolicense-1',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'NOT_ELIGIBLE' then
    raise exception 'no_license_published %', r;
  end if;
  raise notice 'no_license_denied';
end
$$;

do $$
declare
  r jsonb;
  media uuid;
  needs uuid;
begin
  needs := gen_random_uuid();
  insert into public.county_story_media (
    id, professional_owner_id, purpose, state, storage_path, expires_at,
    container, codec_video
  ) values (
    needs,
    'b2222222-2222-2222-2222-222222222222',
    'original',
    'needs_normalization',
    'b2222222-2222-2222-2222-222222222222/' || needs || '/original.mov',
    now() + interval '6 hours',
    'quicktime',
    'hvc1'
  );
  r := public.publish_county_story(
    'b2222222-2222-2222-2222-222222222222',
    needs,
    '48373',
    'local_knowledge',
    null,
    'idemp-hevc-1',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'MEDIA_NOT_VALID' then
    raise exception 'hevc_published %', r;
  end if;
  if exists (select 1 from public.county_story_slots) then
    raise exception 'invalid_media_created_slot';
  end if;
  raise notice 'needs_normalization_rejected';
end
$$;

do $$
declare
  r jsonb;
  media uuid := public.w3_valid_media('c3333333-3333-3333-3333-333333333333');
begin
  r := public.publish_county_story(
    'b2222222-2222-2222-2222-222222222222',
    media,
    '48373',
    'local_knowledge',
    null,
    'idemp-steal-1',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'MEDIA_NOT_OWNED' then
    raise exception 'stolen_media_published %', r;
  end if;
  raise notice 'media_owner_enforced';
end
$$;

do $$
declare
  r jsonb;
  media uuid := public.w3_valid_media('b2222222-2222-2222-2222-222222222222');
begin
  r := public.publish_county_story(
    'b2222222-2222-2222-2222-222222222222',
    media,
    '48005',
    'local_knowledge',
    '11111111-1111-1111-1111-111111111111',
    'idemp-list-mismatch',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'LISTING_COUNTY_MISMATCH' then
    raise exception 'listing_county_allowed %', r;
  end if;
  raise notice 'listing_county_mismatch';
end
$$;

do $$
declare
  r jsonb;
  media uuid := public.w3_valid_media('c3333333-3333-3333-3333-333333333333');
begin
  r := public.publish_county_story(
    'c3333333-3333-3333-3333-333333333333',
    media,
    '48373',
    'open_house_property',
    '11111111-1111-1111-1111-111111111111',
    'idemp-list-other',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'LISTING_NOT_AUTHORIZED' then
    raise exception 'foreign_listing_allowed %', r;
  end if;
  raise notice 'listing_not_authorized';
end
$$;

do $$
declare
  r jsonb;
  replay jsonb;
  media uuid := public.w3_valid_media('b2222222-2222-2222-2222-222222222222');
  slot uuid;
begin
  r := public.publish_county_story(
    'b2222222-2222-2222-2222-222222222222',
    media,
    '48373',
    'local_knowledge',
    '11111111-1111-1111-1111-111111111111',
    'idemp-publish-ok',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'PUBLISHED' then
    raise exception 'publish_failed %', r;
  end if;
  if (r->>'slot_number')::int <> 1 then
    raise exception 'slot_number %', r;
  end if;
  slot := (r->>'slot_id')::uuid;
  if (select slot_id from public.county_story_media where id = media) is distinct from slot then
    raise exception 'media_not_attached';
  end if;
  if exists (
    select 1 from public.county_story_media_list_expired(now() + interval '7 hours')
     where id = media
  ) then
    raise exception 'attached_media_listed_for_orphan';
  end if;
  replay := public.publish_county_story(
    'b2222222-2222-2222-2222-222222222222',
    media,
    '48373',
    'local_knowledge',
    '11111111-1111-1111-1111-111111111111',
    'idemp-publish-ok',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if replay->>'slot_id' is distinct from r->>'slot_id' then
    raise exception 'idempotent_new_slot %', replay;
  end if;
  if (select count(*) from public.county_story_slots) <> 1 then
    raise exception 'idempotent_extra_slot';
  end if;
  if (select accepted_count from public.county_story_days
        where county_fips = '48373' and story_day = date '2026-09-24') <> 1 then
    raise exception 'idempotent_capacity';
  end if;
  if (public.county_story_capacity('48373', timestamptz '2026-09-24 14:00:00-05')->>'accepted')::int <> 1 then
    raise exception 'capacity_read';
  end if;
  raise notice 'published_idempotent';
  raise notice 'capacity_read';
end
$$;

do $$
declare
  r jsonb;
  media uuid := public.w3_valid_media('b2222222-2222-2222-2222-222222222222');
begin
  r := public.publish_county_story(
    'b2222222-2222-2222-2222-222222222222',
    media,
    '48005',
    'local_knowledge',
    null,
    'idemp-second-key',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'ALREADY_POSTED' then
    raise exception 'second_story %', r;
  end if;
  if (select count(*) from public.county_story_slots) <> 1 then
    raise exception 'already_posted_created_slot';
  end if;
  raise notice 'already_posted';
end
$$;

do $$
declare
  r jsonb;
  media uuid := public.w3_valid_media('b2222222-2222-2222-2222-222222222222');
begin
  r := public.publish_county_story(
    'b2222222-2222-2222-2222-222222222222',
    media,
    '48005',
    'open_house_property',
    null,
    'idemp-publish-ok',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'IDEMPOTENCY_CONFLICT' then
    raise exception 'conflicting_key %', r;
  end if;
  raise notice 'idempotency_conflict';
end
$$;

do $$
declare
  r jsonb;
  media_b uuid := public.w3_valid_media('b2222222-2222-2222-2222-222222222222');
  slots_before int;
  accepted_before int;
begin
  select count(*) into slots_before from public.county_story_slots;
  select accepted_count into accepted_before
    from public.county_story_days
   where county_fips = '48373' and story_day = date '2026-09-24';
  r := public.publish_county_story(
    'b2222222-2222-2222-2222-222222222222',
    media_b,
    '48373',
    'local_knowledge',
    '11111111-1111-1111-1111-111111111111',
    'idemp-publish-ok',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'IDEMPOTENCY_CONFLICT' then
    raise exception 'publish_conflict_media %', r;
  end if;
  if (select slot_id from public.county_story_media where id = media_b) is not null then
    raise exception 'conflict_attached_media_b';
  end if;
  if (select count(*) from public.county_story_slots) <> slots_before then
    raise exception 'conflict_extra_slot';
  end if;
  if (select accepted_count from public.county_story_days
        where county_fips = '48373' and story_day = date '2026-09-24') <> accepted_before then
    raise exception 'conflict_capacity';
  end if;
  raise notice 'publish_idempotency_conflict';
end
$$;

do $$
declare
  r jsonb;
  media uuid := public.w3_valid_media('b2222222-2222-2222-2222-222222222222');
  slot uuid;
  original uuid;
  original_ack timestamptz;
begin
  select id, current_media_id, rules_acknowledged_at
    into slot, original, original_ack
    from public.county_story_slots
   where professional_owner_id = 'b2222222-2222-2222-2222-222222222222';
  r := public.replace_county_story_media(
    'b2222222-2222-2222-2222-222222222222',
    slot,
    media,
    'idemp-rep-noack',
    false,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'NOT_ELIGIBLE' then
    raise exception 'replace_without_ack %', r;
  end if;
  if (select current_media_id from public.county_story_slots where id = slot) is distinct from original then
    raise exception 'replace_noack_moved_pointer';
  end if;
  if (select replacement_used from public.county_story_slots where id = slot) is true then
    raise exception 'replace_noack_used';
  end if;
  if (select replacement_rules_acknowledged_at from public.county_story_slots where id = slot) is not null then
    raise exception 'replace_noack_wrote_ack';
  end if;
  if (select rules_acknowledged_at from public.county_story_slots where id = slot) is distinct from original_ack then
    raise exception 'replace_noack_clobbered_v1';
  end if;
  if (select slot_id from public.county_story_media where id = media) is not null then
    raise exception 'replace_noack_attached';
  end if;
  if (select accepted_count from public.county_story_days
        where county_fips = '48373' and story_day = date '2026-09-24') <> 1 then
    raise exception 'replace_noack_capacity';
  end if;
  raise notice 'replace_rules_required';
end
$$;

update public.county_story_launch set publish_enabled = false where id = 1;

do $$
declare
  r jsonb;
  media uuid := public.w3_valid_media('b2222222-2222-2222-2222-222222222222');
  slot uuid;
  original uuid;
begin
  select id, current_media_id into slot, original
    from public.county_story_slots
   where professional_owner_id = 'b2222222-2222-2222-2222-222222222222';
  r := public.replace_county_story_media(
    'b2222222-2222-2222-2222-222222222222',
    slot,
    media,
    'idemp-rep-gated',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'FEATURE_DISABLED' then
    raise exception 'replace_gate_open %', r;
  end if;
  if (select current_media_id from public.county_story_slots where id = slot) is distinct from original then
    raise exception 'replace_gate_moved_pointer';
  end if;
  if (select replacement_used from public.county_story_slots where id = slot) is true then
    raise exception 'replace_gate_used';
  end if;
  if exists (
    select 1 from public.county_story_publish_intents
     where idempotency_key = 'idemp-rep-gated' and result_code = 'REPLACED'
  ) then
    raise exception 'replace_gate_stored_success';
  end if;
  raise notice 'replace_feature_disabled';
end
$$;

update public.county_story_launch set publish_enabled = true where id = 1;

do $$
declare
  r jsonb;
  first uuid := public.w3_valid_media('c3333333-3333-3333-3333-333333333333');
  second uuid := public.w3_valid_media('c3333333-3333-3333-3333-333333333333');
  slot uuid;
  old uuid;
  original_ack timestamptz;
begin
  r := public.publish_county_story(
    'c3333333-3333-3333-3333-333333333333',
    first,
    '48005',
    'local_knowledge',
    null,
    'idemp-c-pub',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'PUBLISHED' then
    raise exception 'c_publish %', r;
  end if;
  slot := (r->>'slot_id')::uuid;
  select rules_acknowledged_at into original_ack
    from public.county_story_slots where id = slot;
  r := public.replace_county_story_media(
    'c3333333-3333-3333-3333-333333333333',
    slot,
    second,
    'idemp-c-rep',
    true,
    timestamptz '2026-09-24 15:00:00-05'
  );
  if r->>'code' is distinct from 'REPLACED' then
    raise exception 'replace_failed %', r;
  end if;
  if (select current_media_id from public.county_story_slots where id = slot) is distinct from second then
    raise exception 'replace_pointer';
  end if;
  if (select replacement_used from public.county_story_slots where id = slot) is not true then
    raise exception 'replace_flag';
  end if;
  if (select accepted_count from public.county_story_days
        where county_fips = '48005' and story_day = date '2026-09-24') <> 1 then
    raise exception 'replace_changed_capacity';
  end if;
  if (select rules_acknowledged_at from public.county_story_slots where id = slot)
       is distinct from original_ack then
    raise exception 'replace_clobbered_v1_ack';
  end if;
  if (select replacement_rules_acknowledged_at from public.county_story_slots where id = slot)
       is distinct from timestamptz '2026-09-24 15:00:00-05' then
    raise exception 'replace_ack_missing';
  end if;
  old := first;
  insert into storage.objects (bucket_id, name)
  values ('county-story-media', 'c3333333-3333-3333-3333-333333333333/' || old || '/original.mp4')
  on conflict do nothing;
  delete from storage.objects
   where name = 'c3333333-3333-3333-3333-333333333333/' || old || '/original.mp4';
  if not public.county_story_media_mark_retired(old, now()) then
    raise exception 'retire_failed';
  end if;
  if (select state from public.county_story_media where id = old) <> 'deleted' then
    raise exception 'retired_not_deleted';
  end if;
  if (select current_media_id from public.county_story_slots where id = slot) is distinct from second then
    raise exception 'retire_rolled_back';
  end if;
  r := public.replace_county_story_media(
    'c3333333-3333-3333-3333-333333333333',
    slot,
    public.w3_valid_media('c3333333-3333-3333-3333-333333333333'),
    'idemp-c-rep-2',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'REPLACEMENT_ALREADY_USED' then
    raise exception 'second_replace %', r;
  end if;
  r := public.replace_county_story_media(
    'c3333333-3333-3333-3333-333333333333',
    slot,
    second,
    'idemp-c-rep',
    true,
    timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'REPLACED' then
    raise exception 'replace_retry %', r;
  end if;
  r := public.replace_county_story_media(
    'c3333333-3333-3333-3333-333333333333',
    slot,
    public.w3_valid_media('c3333333-3333-3333-3333-333333333333'),
    'idemp-c-rep',
    true,
    timestamptz '2026-09-24 15:00:00-05'
  );
  if r->>'code' is distinct from 'IDEMPOTENCY_CONFLICT' then
    raise exception 'replace_conflict_media %', r;
  end if;
  if (select current_media_id from public.county_story_slots where id = slot) is distinct from second then
    raise exception 'replace_conflict_moved';
  end if;
  raise notice 'replaced_once';
  raise notice 'replace_idempotency_conflict';
end
$$;

do $$
declare
  r jsonb;
  media uuid := public.w3_valid_media('c3333333-3333-3333-3333-333333333333');
begin
  r := public.replace_county_story_media(
    'c3333333-3333-3333-3333-333333333333',
    (select id from public.county_story_slots where professional_owner_id = 'c3333333-3333-3333-3333-333333333333'),
    media,
    'idemp-stale-rep',
    true,
    timestamptz '2026-09-25 08:00:00-05'
  );
  if r->>'code' is distinct from 'STORY_DAY_ENDED' then
    raise exception 'stale_replace %', r;
  end if;
  raise notice 'story_day_ended';
end
$$;

select 'wave3_gates_ok'
where (select count(*) from public.county_story_slots) = 2
  and (select count(*) from public.county_story_slots where replacement_used) = 1
  and (select count(*) from public.county_story_slots
        where rules_acknowledged_at is not null) = 2
  and (select count(*) from public.county_story_slots
        where replacement_rules_acknowledged_at is not null) = 1
  and (select accepted_count from public.county_story_days
         where county_fips = '48373' and story_day = date '2026-09-24') = 1
  and not exists (
        select 1 from public.county_story_publish_intents i where i.slot_id is null
      )
  and not exists (
        select 1 from pg_proc p
         where p.proname in ('delete_county_story_slot', 'surrender_county_story_slot')
      );
