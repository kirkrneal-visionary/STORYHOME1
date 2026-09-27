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
  perform public.county_story_mark_provider_ready(
    p_id,
    'ast_' || replace(p_id::text, '-', ''),
    'pb_' || replace(p_id::text, '-', ''),
    'signed',
    15000,
    now()
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
  if r->>'code' is distinct from 'PLAYBACK_NOT_READY' then
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
    'local_knowledge',
    'keep',
    null,
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
    'local_knowledge',
    'keep',
    null,
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
    'local_knowledge',
    'keep',
    null,
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
    'local_knowledge',
    'keep',
    null,
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
    'local_knowledge',
    'keep',
    null,
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
    'local_knowledge',
    'keep',
    null,
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
    'local_knowledge',
    'keep',
    null,
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

-- Replacement may change Story type and property. County, day, owner, and slot number stay.
insert into public.listings (id, agent_id, county_fips) values
  ('a1000000-0000-4000-8000-000000000001', 'c3333333-3333-3333-3333-333333333333', '48005'),
  ('a1000000-0000-4000-8000-000000000002', 'b2222222-2222-2222-2222-222222222222', '48373'),
  ('a1000000-0000-4000-8000-000000000003', 'c3333333-3333-3333-3333-333333333333', '48005'),
  ('a1000000-0000-4000-8000-000000000004', 'b2222222-2222-2222-2222-222222222222', '48373'),
  ('a1000000-0000-4000-8000-000000000005', 'c3333333-3333-3333-3333-333333333333', '48373'),
  ('a1000000-0000-4000-8000-000000000006', 'b2222222-2222-2222-2222-222222222222', '48005'),
  ('a1000000-0000-4000-8000-000000000007', 'b2222222-2222-2222-2222-222222222222', '48373'),
  ('a1000000-0000-4000-8000-000000000008', 'b2222222-2222-2222-2222-222222222222', '48373'),
  ('a1000000-0000-4000-8000-000000000009', 'c3333333-3333-3333-3333-333333333333', '48005')
on conflict (id) do update
  set agent_id = excluded.agent_id,
      county_fips = excluded.county_fips;

do $$
declare
  owner uuid := 'c3333333-3333-3333-3333-333333333333';
  list_add uuid := 'a1000000-0000-4000-8000-000000000001';
  list_wrong uuid := 'a1000000-0000-4000-8000-000000000005';
  list_other uuid := 'a1000000-0000-4000-8000-000000000006';
  at timestamptz := timestamptz '2026-09-10 14:00:00-05';
  v1 uuid;
  v2 uuid;
  slot uuid;
  r jsonb;
  cap int;
  events_before int;
  v_slot_number int;
  v_county text;
  v_day date;
begin
  v1 := public.w3_valid_media(owner);
  r := public.publish_county_story(
    owner, v1, '48005', 'local_knowledge', null, 'ctx-a-pub', true, at
  );
  if r->>'code' is distinct from 'PUBLISHED' then
    raise exception 'ctx_a_pub %', r;
  end if;
  slot := (r->>'slot_id')::uuid;
  select s.slot_number, s.county_fips, s.story_day
    into v_slot_number, v_county, v_day
    from public.county_story_slots s where s.id = slot;
  select (public.county_story_capacity('48005', at)->>'accepted')::int into cap;
  select count(*) into events_before
    from public.county_story_enforcement_events where professional_owner_id = owner;

  v2 := public.w3_valid_media(owner);
  r := public.replace_county_story_media(owner, slot, v2, 'ctx-a-no-type', true, null, 'keep', null, at);
  if r->>'code' is distinct from 'NOT_ELIGIBLE' then
    raise exception 'ctx_missing_type %', r;
  end if;
  r := public.replace_county_story_media(owner, slot, v2, 'ctx-a-no-action', true, 'local_knowledge', null, null, at);
  if r->>'code' is distinct from 'NOT_ELIGIBLE' then
    raise exception 'ctx_missing_action %', r;
  end if;
  r := public.replace_county_story_media(owner, slot, v2, 'ctx-a-keep-id', true, 'local_knowledge', 'keep', list_add, at);
  if r->>'code' is distinct from 'NOT_ELIGIBLE' then
    raise exception 'ctx_keep_with_id %', r;
  end if;
  r := public.replace_county_story_media(owner, slot, v2, 'ctx-a-clear-id', true, 'local_knowledge', 'clear', list_add, at);
  if r->>'code' is distinct from 'NOT_ELIGIBLE' then
    raise exception 'ctx_clear_with_id %', r;
  end if;
  r := public.replace_county_story_media(owner, slot, v2, 'ctx-a-set-empty', true, 'open_house_property', 'set', null, at);
  if r->>'code' is distinct from 'NOT_ELIGIBLE' then
    raise exception 'ctx_set_without_id %', r;
  end if;
  r := public.replace_county_story_media(owner, slot, v2, 'ctx-a-wrong-county', true, 'open_house_property', 'set', list_wrong, at);
  if r->>'code' is distinct from 'LISTING_COUNTY_MISMATCH' then
    raise exception 'ctx_wrong_county %', r;
  end if;
  r := public.replace_county_story_media(owner, slot, v2, 'ctx-a-unauth', true, 'open_house_property', 'set', list_other, at);
  if r->>'code' is distinct from 'LISTING_NOT_AUTHORIZED' then
    raise exception 'ctx_unauth %', r;
  end if;
  if (select current_media_id from public.county_story_slots where id = slot) is distinct from v1 then
    raise exception 'ctx_a_failure_moved_media';
  end if;
  if (select story_type from public.county_story_slots where id = slot) is distinct from 'local_knowledge' then
    raise exception 'ctx_a_failure_changed_type';
  end if;
  if (select listing_id from public.county_story_slots where id = slot) is not null then
    raise exception 'ctx_a_failure_added_listing';
  end if;
  if (select replacement_used from public.county_story_slots where id = slot) is not false then
    raise exception 'ctx_a_failure_used_replacement';
  end if;
  if (select s.county_fips from public.county_story_slots s where s.id = slot) is distinct from v_county
     or (select s.story_day from public.county_story_slots s where s.id = slot) is distinct from v_day
     or (select s.professional_owner_id from public.county_story_slots s where s.id = slot) is distinct from owner
     or (select s.slot_number from public.county_story_slots s where s.id = slot) is distinct from v_slot_number then
    raise exception 'ctx_a_failure_moved_identity';
  end if;
  if (public.county_story_capacity('48005', at)->>'accepted')::int is distinct from cap then
    raise exception 'ctx_a_failure_capacity';
  end if;
  if (select count(*) from public.county_story_enforcement_events where professional_owner_id = owner)
       is distinct from events_before then
    raise exception 'ctx_a_failure_strike';
  end if;
  raise notice 'replace_context_missing_rejected';
  raise notice 'replace_set_wrong_county';
  raise notice 'replace_set_unauthorized';

  r := public.replace_county_story_media(
    owner, slot, v2, 'ctx-a-rep', true, 'open_house_property', 'set', list_add, at
  );
  if r->>'code' is distinct from 'REPLACED' then
    raise exception 'ctx_a_rep %', r;
  end if;
  if (select story_type from public.county_story_slots where id = slot) is distinct from 'open_house_property' then
    raise exception 'ctx_a_type';
  end if;
  if (select listing_id from public.county_story_slots where id = slot) is distinct from list_add then
    raise exception 'ctx_a_listing';
  end if;
  if (select current_media_id from public.county_story_slots where id = slot) is distinct from v2 then
    raise exception 'ctx_a_media';
  end if;
  if (select s.county_fips from public.county_story_slots s where s.id = slot) is distinct from '48005'
     or (select s.story_day from public.county_story_slots s where s.id = slot) is distinct from date '2026-09-10'
     or (select s.professional_owner_id from public.county_story_slots s where s.id = slot) is distinct from owner
     or (select s.slot_number from public.county_story_slots s where s.id = slot) is distinct from v_slot_number
     or (select s.replacement_used from public.county_story_slots s where s.id = slot) is not true then
    raise exception 'ctx_a_identity';
  end if;
  if (select count(*) from public.county_story_slots
       where professional_owner_id = owner and story_day = date '2026-09-10') is distinct from 1 then
    raise exception 'ctx_a_second_slot';
  end if;
  if (public.county_story_capacity('48005', at)->>'accepted')::int is distinct from cap then
    raise exception 'ctx_a_capacity %', cap;
  end if;
  raise notice 'replace_type_local_to_open_house';
  raise notice 'replace_set_adds_property';
  raise notice 'replace_context_identity_unchanged';
  raise notice 'replace_context_capacity_unchanged';

  r := public.replace_county_story_media(
    owner, slot, v2, 'ctx-a-rep', true, 'open_house_property', 'set', list_add, at
  );
  if r->>'code' is distinct from 'REPLACED' then
    raise exception 'ctx_a_replay %', r;
  end if;
  r := public.replace_county_story_media(
    owner, slot, v2, 'ctx-a-rep', true, 'local_knowledge', 'set', list_add, at
  );
  if r->>'code' is distinct from 'IDEMPOTENCY_CONFLICT' then
    raise exception 'ctx_a_type_conflict %', r;
  end if;
  r := public.replace_county_story_media(
    owner, slot, v2, 'ctx-a-rep', true, 'open_house_property', 'clear', null, at
  );
  if r->>'code' is distinct from 'IDEMPOTENCY_CONFLICT' then
    raise exception 'ctx_a_action_conflict %', r;
  end if;
  r := public.replace_county_story_media(
    owner, slot, v2, 'ctx-a-rep', true, 'open_house_property', 'set', list_wrong, at
  );
  if r->>'code' is distinct from 'IDEMPOTENCY_CONFLICT' then
    raise exception 'ctx_a_listing_conflict %', r;
  end if;
  if (select story_type from public.county_story_slots where id = slot) is distinct from 'open_house_property'
     or (select listing_id from public.county_story_slots where id = slot) is distinct from list_add
     or (select current_media_id from public.county_story_slots where id = slot) is distinct from v2 then
    raise exception 'ctx_a_conflict_mutated';
  end if;
  r := public.replace_county_story_media(
    owner, slot, public.w3_valid_media(owner), 'ctx-a-rep-2', true,
    'local_knowledge', 'clear', null, at
  );
  if r->>'code' is distinct from 'REPLACEMENT_ALREADY_USED' then
    raise exception 'ctx_a_second %', r;
  end if;
  raise notice 'replace_context_idempotency';
  raise notice 'replace_one_maximum';
end
$$;

do $$
declare
  owner uuid := 'b2222222-2222-2222-2222-222222222222';
  list_keep uuid := 'a1000000-0000-4000-8000-000000000002';
  at timestamptz := timestamptz '2026-09-11 14:00:00-05';
  v1 uuid;
  v2 uuid;
  slot uuid;
  r jsonb;
  cap int;
  v_slot_number int;
begin
  v1 := public.w3_valid_media(owner);
  r := public.publish_county_story(
    owner, v1, '48373', 'open_house_property', list_keep, 'ctx-b-pub', true, at
  );
  if r->>'code' is distinct from 'PUBLISHED' then
    raise exception 'ctx_b_pub %', r;
  end if;
  slot := (r->>'slot_id')::uuid;
  select s.slot_number into v_slot_number from public.county_story_slots s where s.id = slot;
  select (public.county_story_capacity('48373', at)->>'accepted')::int into cap;
  v2 := public.w3_valid_media(owner);
  r := public.replace_county_story_media(
    owner, slot, v2, 'ctx-b-rep', true, 'local_knowledge', 'keep', null, at
  );
  if r->>'code' is distinct from 'REPLACED' then
    raise exception 'ctx_b_rep %', r;
  end if;
  if (select story_type from public.county_story_slots where id = slot) is distinct from 'local_knowledge' then
    raise exception 'ctx_b_type';
  end if;
  if (select listing_id from public.county_story_slots where id = slot) is distinct from list_keep then
    raise exception 'ctx_b_listing';
  end if;
  if (select s.county_fips from public.county_story_slots s where s.id = slot) is distinct from '48373'
     or (select s.story_day from public.county_story_slots s where s.id = slot) is distinct from date '2026-09-11'
     or (select s.professional_owner_id from public.county_story_slots s where s.id = slot) is distinct from owner
     or (select s.slot_number from public.county_story_slots s where s.id = slot) is distinct from v_slot_number then
    raise exception 'ctx_b_identity';
  end if;
  if (public.county_story_capacity('48373', at)->>'accepted')::int is distinct from cap then
    raise exception 'ctx_b_capacity';
  end if;
  if (select count(*) from public.county_story_slots
       where professional_owner_id = owner and story_day = date '2026-09-11') is distinct from 1 then
    raise exception 'ctx_b_second_slot';
  end if;
  raise notice 'replace_type_open_house_to_local';
  raise notice 'replace_keep_preserves_property';
end
$$;

do $$
declare
  owner uuid := 'c3333333-3333-3333-3333-333333333333';
  list_from uuid := 'a1000000-0000-4000-8000-000000000003';
  at timestamptz := timestamptz '2026-09-12 14:00:00-05';
  slot uuid;
  r jsonb;
  cap int;
begin
  r := public.publish_county_story(
    owner, public.w3_valid_media(owner), '48005', 'local_knowledge', list_from,
    'ctx-c-pub', true, at
  );
  if r->>'code' is distinct from 'PUBLISHED' then
    raise exception 'ctx_c_pub %', r;
  end if;
  slot := (r->>'slot_id')::uuid;
  select (public.county_story_capacity('48005', at)->>'accepted')::int into cap;
  r := public.replace_county_story_media(
    owner, slot, public.w3_valid_media(owner), 'ctx-c-rep', true,
    'local_knowledge', 'clear', null, at
  );
  if r->>'code' is distinct from 'REPLACED' then
    raise exception 'ctx_c_rep %', r;
  end if;
  if (select listing_id from public.county_story_slots where id = slot) is not null then
    raise exception 'ctx_c_listing';
  end if;
  if (select story_type from public.county_story_slots where id = slot) is distinct from 'local_knowledge' then
    raise exception 'ctx_c_type';
  end if;
  if (public.county_story_capacity('48005', at)->>'accepted')::int is distinct from cap then
    raise exception 'ctx_c_capacity';
  end if;
  raise notice 'replace_clear_local_knowledge';
end
$$;

do $$
declare
  owner uuid := 'b2222222-2222-2222-2222-222222222222';
  list_from uuid := 'a1000000-0000-4000-8000-000000000004';
  at timestamptz := timestamptz '2026-09-13 14:00:00-05';
  slot uuid;
  r jsonb;
begin
  r := public.publish_county_story(
    owner, public.w3_valid_media(owner), '48373', 'open_house_property', list_from,
    'ctx-d-pub', true, at
  );
  if r->>'code' is distinct from 'PUBLISHED' then
    raise exception 'ctx_d_pub %', r;
  end if;
  slot := (r->>'slot_id')::uuid;
  r := public.replace_county_story_media(
    owner, slot, public.w3_valid_media(owner), 'ctx-d-rep', true,
    'open_house_property', 'clear', null, at
  );
  if r->>'code' is distinct from 'REPLACED' then
    raise exception 'ctx_d_rep %', r;
  end if;
  if (select listing_id from public.county_story_slots where id = slot) is not null then
    raise exception 'ctx_d_listing';
  end if;
  if (select story_type from public.county_story_slots where id = slot) is distinct from 'open_house_property' then
    raise exception 'ctx_d_type';
  end if;
  raise notice 'replace_clear_open_house';
end
$$;

do $$
declare
  owner uuid := 'b2222222-2222-2222-2222-222222222222';
  list_from uuid := 'a1000000-0000-4000-8000-000000000007';
  list_to uuid := 'a1000000-0000-4000-8000-000000000008';
  at timestamptz := timestamptz '2026-09-17 14:00:00-05';
  slot uuid;
  r jsonb;
  cap int;
begin
  r := public.publish_county_story(
    owner, public.w3_valid_media(owner), '48373', 'open_house_property', list_from,
    'ctx-f-pub', true, at
  );
  if r->>'code' is distinct from 'PUBLISHED' then
    raise exception 'ctx_f_pub %', r;
  end if;
  slot := (r->>'slot_id')::uuid;
  select (public.county_story_capacity('48373', at)->>'accepted')::int into cap;
  r := public.replace_county_story_media(
    owner, slot, public.w3_valid_media(owner), 'ctx-f-rep', true,
    'open_house_property', 'set', list_to, at
  );
  if r->>'code' is distinct from 'REPLACED' then
    raise exception 'ctx_f_rep %', r;
  end if;
  if (select listing_id from public.county_story_slots where id = slot) is distinct from list_to then
    raise exception 'ctx_f_listing';
  end if;
  if (public.county_story_capacity('48373', at)->>'accepted')::int is distinct from cap then
    raise exception 'ctx_f_capacity';
  end if;
  if (select count(*) from public.county_story_slots
       where professional_owner_id = owner and story_day = date '2026-09-17') is distinct from 1 then
    raise exception 'ctx_f_second_slot';
  end if;
  raise notice 'replace_set_changes_property';
end
$$;

do $$
declare
  owner uuid := 'c3333333-3333-3333-3333-333333333333';
  list_banned uuid := 'a1000000-0000-4000-8000-000000000009';
  at timestamptz := timestamptz '2026-09-18 14:00:00-05';
  v1 uuid;
  slot uuid;
  r jsonb;
  cap int;
begin
  v1 := public.w3_valid_media(owner);
  r := public.publish_county_story(
    owner, v1, '48005', 'open_house_property', list_banned, 'ctx-g-pub', true, at
  );
  if r->>'code' is distinct from 'PUBLISHED' then
    raise exception 'ctx_g_pub %', r;
  end if;
  slot := (r->>'slot_id')::uuid;
  r := public.hide_county_story_for_policy(
    slot, 'unauthorized_property', null, 'ctx-g-hide', 'admin', 'admin-ctx', at + interval '10 minutes'
  );
  if r->>'code' is distinct from 'POLICY_HIDDEN' then
    raise exception 'ctx_g_hide %', r;
  end if;
  select (public.county_story_capacity('48005', at)->>'accepted')::int into cap;
  r := public.replace_county_story_media(
    owner, slot, public.w3_valid_media(owner), 'ctx-g-rep', true,
    'local_knowledge', 'set', list_banned, at + interval '20 minutes'
  );
  if r->>'code' is distinct from 'LISTING_NOT_AUTHORIZED' then
    raise exception 'ctx_g_rep %', r;
  end if;
  if (select listing_id from public.county_story_slots where id = slot) is not null then
    raise exception 'ctx_g_restored';
  end if;
  if (select story_type from public.county_story_slots where id = slot) is distinct from 'open_house_property' then
    raise exception 'ctx_g_type';
  end if;
  if (select current_media_id from public.county_story_slots where id = slot) is distinct from v1 then
    raise exception 'ctx_g_media';
  end if;
  if (select replacement_used from public.county_story_slots where id = slot) is not false then
    raise exception 'ctx_g_used';
  end if;
  if (select state from public.county_story_slots where id = slot) is distinct from 'hidden' then
    raise exception 'ctx_g_state';
  end if;
  if (public.county_story_capacity('48005', at)->>'accepted')::int is distinct from cap then
    raise exception 'ctx_g_capacity';
  end if;
  raise notice 'replace_set_blocked_prior_listing';
end
$$;
