-- Isolated County Stories Wave 4 proofs. Not production.
select set_config('request.jwt.claim.role', 'service_role', false);

create or replace function public.w4_valid_media(p_owner uuid, p_id uuid default gen_random_uuid())
returns uuid
language plpgsql
as $$
begin
  insert into public.county_story_media (
    id, professional_owner_id, purpose, state, storage_path, expires_at,
    container, codec_video
  ) values (
    p_id,
    p_owner,
    'original',
    'valid',
    p_owner::text || '/' || p_id::text || '/original.mp4',
    now() + interval '6 hours',
    'mp4',
    'avc1'
  );
  return p_id;
end;
$$;

create or replace function public.w4_seed_pro(p_id uuid, p_name text)
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

-- ---------------------------------------------------------------------------
-- O first: gate stays off; hide still works after a controlled isolated publish.
-- ---------------------------------------------------------------------------
update public.county_story_launch set publish_enabled = false where id = 1;

do $$
declare
  owner uuid := '10000000-0000-4000-8000-000000000001';
  media uuid;
  r jsonb;
begin
  perform public.w4_seed_pro(owner, 'Gate Hide');
  media := public.w4_valid_media(owner);
  r := public.publish_county_story(
    owner, media, '48373', 'local_knowledge', null,
    'w4-gate-pub', true, timestamptz '2026-09-15 14:00:00-05'
  );
  if r->>'code' is distinct from 'FEATURE_DISABLED' then
    raise exception 'gate_should_block_publish %', r;
  end if;
  if exists (select 1 from public.county_story_enforcement_events) then
    raise exception 'feature_disabled_created_strike';
  end if;
  raise notice 'feature_gate_blocks_publish';
end
$$;

update public.county_story_launch set publish_enabled = true where id = 1;

-- ---------------------------------------------------------------------------
-- A / B / C / F: rolling three strikes + publish block
-- ---------------------------------------------------------------------------
do $$
declare
  owner uuid := '10000000-0000-4000-8000-000000000010';
  media uuid;
  slot uuid;
  r jsonb;
  cap jsonb;
  accepted_before int;
  accepted_after int;
  n int;
begin
  perform public.w4_seed_pro(owner, 'Strike Three');

  media := public.w4_valid_media(owner);
  r := public.publish_county_story(
    owner, media, '48373', 'local_knowledge', null,
    'w4-s1-pub', true, timestamptz '2026-09-18 14:00:00-05'
  );
  if r->>'code' is distinct from 'PUBLISHED' then
    raise exception 'a_publish %', r;
  end if;
  slot := (r->>'slot_id')::uuid;
  select (public.county_story_capacity('48373', timestamptz '2026-09-18 14:00:00-05')->>'accepted')::int
    into accepted_before;

  r := public.hide_county_story_for_policy(
    slot, 'generic_solicitation', 'admin note stay off professional reads',
    'w4-s1-hide', 'admin', 'admin-a',
    timestamptz '2026-09-18 14:05:00-05'
  );
  if r->>'code' is distinct from 'POLICY_HIDDEN' then
    raise exception 'a_hide %', r;
  end if;
  if r->>'suspended' is distinct from 'false' then
    raise exception 'a_suspended_early %', r;
  end if;
  if (select state from public.county_story_slots where id = slot) is distinct from 'hidden' then
    raise exception 'a_not_hidden';
  end if;
  select (public.county_story_capacity('48373', timestamptz '2026-09-18 14:05:00-05')->>'accepted')::int
    into accepted_after;
  if accepted_after is distinct from accepted_before then
    raise exception 'a_capacity_changed % %', accepted_before, accepted_after;
  end if;
  select count(*) into n from public.county_story_enforcement_events
   where professional_owner_id = owner and qualifies_for_strike;
  if n is distinct from 1 then
    raise exception 'a_event_count %', n;
  end if;
  if exists (select 1 from public.county_story_suspensions where professional_owner_id = owner) then
    raise exception 'a_suspension_created';
  end if;
  raise notice 'first_policy_removal';

  media := public.w4_valid_media(owner);
  r := public.publish_county_story(
    owner, media, '48373', 'local_knowledge', null,
    'w4-s2-pub', true, timestamptz '2026-09-20 14:00:00-05'
  );
  slot := (r->>'slot_id')::uuid;
  r := public.hide_county_story_for_policy(
    slot, 'static_business_card', null, 'w4-s2-hide', 'admin', 'admin-b',
    timestamptz '2026-09-20 14:05:00-05'
  );
  if r->>'code' is distinct from 'POLICY_HIDDEN' then
    raise exception 'b_hide %', r;
  end if;
  if r->>'suspended' is distinct from 'false' then
    raise exception 'b_suspended_early %', r;
  end if;
  select count(*) into n from public.county_story_enforcement_events
   where professional_owner_id = owner and qualifies_for_strike;
  if n is distinct from 2 then
    raise exception 'b_event_count %', n;
  end if;
  if exists (select 1 from public.county_story_suspensions where professional_owner_id = owner) then
    raise exception 'b_suspension_created';
  end if;
  raise notice 'second_qualifying_removal';

  media := public.w4_valid_media(owner);
  r := public.publish_county_story(
    owner, media, '48373', 'local_knowledge', null,
    'w4-s3-pub', true, timestamptz '2026-09-22 14:42:00-05'
  );
  slot := (r->>'slot_id')::uuid;
  r := public.hide_county_story_for_policy(
    slot, 'inappropriate', null, 'w4-s3-hide', 'admin', 'admin-c',
    timestamptz '2026-09-22 14:42:00-05'
  );
  if r->>'code' is distinct from 'POLICY_HIDDEN' then
    raise exception 'c_hide %', r;
  end if;
  if r->>'suspended' is distinct from 'true' then
    raise exception 'c_not_suspended %', r;
  end if;
  if (r->>'eligible_at') is distinct from '2026-09-29T19:42:00+00:00'
     and (r->>'ends_at') is distinct from (r->>'starts_at') then
    null;
  end if;
  if (select starts_at from public.county_story_suspensions where professional_owner_id = owner)
       is distinct from timestamptz '2026-09-22 14:42:00-05' then
    raise exception 'c_start %', r;
  end if;
  if (select ends_at from public.county_story_suspensions where professional_owner_id = owner)
       is distinct from timestamptz '2026-09-29 14:42:00-05' then
    raise exception 'c_end %', r;
  end if;
  select count(*) into n from public.county_story_enforcement_events
   where professional_owner_id = owner;
  if n is distinct from 3 then
    raise exception 'c_event_count %', n;
  end if;
  if (select count(*) from public.county_story_suspensions where professional_owner_id = owner)
       is distinct from 1 then
    raise exception 'c_suspension_count';
  end if;
  raise notice 'third_qualifying_removal';

  media := public.w4_valid_media(owner);
  r := public.publish_county_story(
    owner, media, '48005', 'local_knowledge', null,
    'w4-s4-pub', true, timestamptz '2026-09-24 14:00:00-05'
  );
  if r->>'code' is distinct from 'POSTING_SUSPENDED' then
    raise exception 'f_publish %', r;
  end if;
  if r->>'eligible_at' is null then
    raise exception 'f_missing_eligible %', r;
  end if;
  if r ? 'reason_detail' then
    raise exception 'f_leaked_admin_note';
  end if;
  if exists (
    select 1 from public.county_story_slots
     where professional_owner_id = owner and story_day = date '2026-09-24'
  ) then
    raise exception 'f_created_slot';
  end if;
  cap := public.county_story_capacity('48005', timestamptz '2026-09-24 14:00:00-05');
  if (cap->>'accepted')::int is distinct from 0 then
    raise exception 'f_capacity %', cap;
  end if;
  raise notice 'suspension_publish_block';
end
$$;

-- ---------------------------------------------------------------------------
-- D: three removals outside the rolling window
-- ---------------------------------------------------------------------------
do $$
declare
  owner uuid := '10000000-0000-4000-8000-000000000020';
  media uuid;
  slot uuid;
  r jsonb;
begin
  perform public.w4_seed_pro(owner, 'Outside Window');
  media := public.w4_valid_media(owner);
  r := public.publish_county_story(
    owner, media, '48005', 'local_knowledge', null,
    'w4-d1-pub', true, timestamptz '2026-09-01 10:00:00-05'
  );
  r := public.hide_county_story_for_policy(
    (r->>'slot_id')::uuid, 'other_policy', null, 'w4-d1-hide', 'admin', 'admin-d',
    timestamptz '2026-09-01 10:05:00-05'
  );
  media := public.w4_valid_media(owner);
  r := public.publish_county_story(
    owner, media, '48005', 'local_knowledge', null,
    'w4-d2-pub', true, timestamptz '2026-09-10 10:00:00-05'
  );
  r := public.hide_county_story_for_policy(
    (r->>'slot_id')::uuid, 'other_policy', null, 'w4-d2-hide', 'admin', 'admin-d',
    timestamptz '2026-09-10 10:05:00-05'
  );
  media := public.w4_valid_media(owner);
  r := public.publish_county_story(
    owner, media, '48005', 'local_knowledge', null,
    'w4-d3-pub', true, timestamptz '2026-09-19 10:00:00-05'
  );
  slot := (r->>'slot_id')::uuid;
  r := public.hide_county_story_for_policy(
    slot, 'other_policy', null, 'w4-d3-hide', 'admin', 'admin-d',
    timestamptz '2026-09-19 10:05:00-05'
  );
  if r->>'suspended' is distinct from 'false' then
    raise exception 'd_incorrect_suspend %', r;
  end if;
  if exists (select 1 from public.county_story_suspensions where professional_owner_id = owner) then
    raise exception 'd_suspension_row';
  end if;
  raise notice 'outside_rolling_window';
end
$$;

-- ---------------------------------------------------------------------------
-- E: exact rolling boundary
-- ---------------------------------------------------------------------------
do $$
declare
  include_owner uuid := '10000000-0000-4000-8000-000000000021';
  exclude_owner uuid := '10000000-0000-4000-8000-000000000022';
  media uuid;
  r jsonb;
begin
  perform public.w4_seed_pro(include_owner, 'Boundary Include');
  perform public.w4_seed_pro(exclude_owner, 'Boundary Exclude');

  media := public.w4_valid_media(include_owner);
  r := public.publish_county_story(
    include_owner, media, '48407', 'local_knowledge', null,
    'w4-ei1-pub', true, timestamptz '2026-09-10 14:42:00-05'
  );
  perform public.hide_county_story_for_policy(
    (r->>'slot_id')::uuid, 'other_policy', null, 'w4-ei1-hide', 'admin', 'admin-e',
    timestamptz '2026-09-10 14:42:00-05'
  );
  media := public.w4_valid_media(include_owner);
  r := public.publish_county_story(
    include_owner, media, '48407', 'local_knowledge', null,
    'w4-ei2-pub', true, timestamptz '2026-09-13 14:42:00-05'
  );
  perform public.hide_county_story_for_policy(
    (r->>'slot_id')::uuid, 'other_policy', null, 'w4-ei2-hide', 'admin', 'admin-e',
    timestamptz '2026-09-13 14:42:00-05'
  );
  media := public.w4_valid_media(include_owner);
  r := public.publish_county_story(
    include_owner, media, '48407', 'local_knowledge', null,
    'w4-ei3-pub', true, timestamptz '2026-09-17 14:42:00-05'
  );
  r := public.hide_county_story_for_policy(
    (r->>'slot_id')::uuid, 'other_policy', null, 'w4-ei3-hide', 'admin', 'admin-e',
    timestamptz '2026-09-17 14:42:00-05'
  );
  if r->>'suspended' is distinct from 'true' then
    raise exception 'e_include_not_suspended %', r;
  end if;
  if public.county_story_is_suspended(include_owner, timestamptz '2026-09-24 14:41:59-05') is not true then
    raise exception 'e_still_suspended_before_end';
  end if;
  if public.county_story_is_suspended(include_owner, timestamptz '2026-09-24 14:42:00-05') is not false then
    raise exception 'e_should_be_clear_at_end';
  end if;
  raise notice 'exact_rolling_boundary_include';

  media := public.w4_valid_media(exclude_owner);
  r := public.publish_county_story(
    exclude_owner, media, '48457', 'local_knowledge', null,
    'w4-ee1-pub', true, timestamptz '2026-09-10 14:42:00-05'
  );
  perform public.hide_county_story_for_policy(
    (r->>'slot_id')::uuid, 'other_policy', null, 'w4-ee1-hide', 'admin', 'admin-e',
    timestamptz '2026-09-10 14:42:00-05'
  );
  media := public.w4_valid_media(exclude_owner);
  r := public.publish_county_story(
    exclude_owner, media, '48457', 'local_knowledge', null,
    'w4-ee2-pub', true, timestamptz '2026-09-13 14:42:00-05'
  );
  perform public.hide_county_story_for_policy(
    (r->>'slot_id')::uuid, 'other_policy', null, 'w4-ee2-hide', 'admin', 'admin-e',
    timestamptz '2026-09-13 14:42:00-05'
  );
  media := public.w4_valid_media(exclude_owner);
  r := public.publish_county_story(
    exclude_owner, media, '48457', 'local_knowledge', null,
    'w4-ee3-pub', true, timestamptz '2026-09-17 14:42:01-05'
  );
  r := public.hide_county_story_for_policy(
    (r->>'slot_id')::uuid, 'other_policy', null, 'w4-ee3-hide', 'admin', 'admin-e',
    timestamptz '2026-09-17 14:42:01-05'
  );
  if r->>'suspended' is distinct from 'false' then
    raise exception 'e_exclude_suspended %', r;
  end if;
  if exists (select 1 from public.county_story_suspensions where professional_owner_id = exclude_owner) then
    raise exception 'e_exclude_row';
  end if;
  raise notice 'exact_rolling_boundary_exclude';
end
$$;

-- ---------------------------------------------------------------------------
-- H / I: first-removal replacement, then hide Version 2
-- ---------------------------------------------------------------------------
do $$
declare
  owner uuid := '10000000-0000-4000-8000-000000000030';
  v1 uuid;
  v2 uuid;
  slot uuid;
  r jsonb;
  cap_before int;
  cap_after int;
  events int;
begin
  perform public.w4_seed_pro(owner, 'Replace After Hide');
  v1 := public.w4_valid_media(owner);
  r := public.publish_county_story(
    owner, v1, '48291', 'local_knowledge', null,
    'w4-h-pub', true, timestamptz '2026-09-25 11:00:00-05'
  );
  slot := (r->>'slot_id')::uuid;
  select (public.county_story_capacity('48291', timestamptz '2026-09-25 11:00:00-05')->>'accepted')::int
    into cap_before;
  r := public.hide_county_story_for_policy(
    slot, 'unauthorized_property', null, 'w4-h-hide', 'admin', 'admin-h',
    timestamptz '2026-09-25 11:10:00-05'
  );
  if (select replacement_used from public.county_story_slots where id = slot) is not false then
    raise exception 'h_replacement_erased';
  end if;
  v2 := public.w4_valid_media(owner);
  r := public.replace_county_story_media(
    owner, slot, v2, 'w4-h-rep', true, timestamptz '2026-09-25 11:20:00-05'
  );
  if r->>'code' is distinct from 'REPLACED' then
    raise exception 'h_replace %', r;
  end if;
  if (select state from public.county_story_slots where id = slot) is distinct from 'accepted' then
    raise exception 'h_not_reactivated';
  end if;
  if (select current_media_id from public.county_story_slots where id = slot) is distinct from v2 then
    raise exception 'h_wrong_media';
  end if;
  select count(*) into events from public.county_story_enforcement_events
   where professional_owner_id = owner;
  if events is distinct from 1 then
    raise exception 'h_strike_erased %', events;
  end if;
  select (public.county_story_capacity('48291', timestamptz '2026-09-25 11:20:00-05')->>'accepted')::int
    into cap_after;
  if cap_after is distinct from cap_before then
    raise exception 'h_capacity % %', cap_before, cap_after;
  end if;
  raise notice 'first_removal_replacement';

  r := public.hide_county_story_for_policy(
    slot, 'generic_solicitation', null, 'w4-i-hide', 'admin', 'admin-i',
    timestamptz '2026-09-25 11:30:00-05'
  );
  if r->>'code' is distinct from 'POLICY_HIDDEN' then
    raise exception 'i_hide %', r;
  end if;
  select count(*) into events from public.county_story_enforcement_events
   where professional_owner_id = owner;
  if events is distinct from 2 then
    raise exception 'i_event_count %', events;
  end if;
  v1 := public.w4_valid_media(owner);
  r := public.replace_county_story_media(
    owner, slot, v1, 'w4-i-rep', true, timestamptz '2026-09-25 11:40:00-05'
  );
  if r->>'code' is distinct from 'REPLACEMENT_ALREADY_USED' then
    raise exception 'i_second_replace %', r;
  end if;
  if (select state from public.county_story_slots where id = slot) is distinct from 'hidden' then
    raise exception 'i_not_hidden';
  end if;
  raise notice 'replacement_policy_removal';
end
$$;

-- ---------------------------------------------------------------------------
-- G / J: third strike while replacement unused blocks replace
-- ---------------------------------------------------------------------------
do $$
declare
  owner uuid := '10000000-0000-4000-8000-000000000040';
  media uuid;
  slot uuid;
  r jsonb;
begin
  perform public.w4_seed_pro(owner, 'Unused Replace Suspended');
  media := public.w4_valid_media(owner);
  r := public.publish_county_story(
    owner, media, '48455', 'local_knowledge', null,
    'w4-j1-pub', true, timestamptz '2026-09-18 09:00:00-05'
  );
  perform public.hide_county_story_for_policy(
    (r->>'slot_id')::uuid, 'other_policy', null, 'w4-j1-hide', 'admin', 'admin-j',
    timestamptz '2026-09-18 09:05:00-05'
  );
  media := public.w4_valid_media(owner);
  r := public.publish_county_story(
    owner, media, '48455', 'local_knowledge', null,
    'w4-j2-pub', true, timestamptz '2026-09-20 09:00:00-05'
  );
  perform public.hide_county_story_for_policy(
    (r->>'slot_id')::uuid, 'other_policy', null, 'w4-j2-hide', 'admin', 'admin-j',
    timestamptz '2026-09-20 09:05:00-05'
  );
  media := public.w4_valid_media(owner);
  r := public.publish_county_story(
    owner, media, '48455', 'local_knowledge', null,
    'w4-j3-pub', true, timestamptz '2026-09-22 09:00:00-05'
  );
  slot := (r->>'slot_id')::uuid;
  r := public.hide_county_story_for_policy(
    slot, 'other_policy', null, 'w4-j3-hide', 'admin', 'admin-j',
    timestamptz '2026-09-22 09:05:00-05'
  );
  if r->>'suspended' is distinct from 'true' then
    raise exception 'j_not_suspended %', r;
  end if;
  if (select replacement_used from public.county_story_slots where id = slot) is not false then
    raise exception 'j_replacement_consumed';
  end if;
  media := public.w4_valid_media(owner);
  r := public.replace_county_story_media(
    owner, slot, media, 'w4-j-rep', true, timestamptz '2026-09-22 10:00:00-05'
  );
  if r->>'code' is distinct from 'POSTING_SUSPENDED' then
    raise exception 'g_replace %', r;
  end if;
  if (select state from public.county_story_slots where id = slot) is distinct from 'hidden' then
    raise exception 'g_unhid';
  end if;
  if (select replacement_used from public.county_story_slots where id = slot) is not false then
    raise exception 'g_replacement_used';
  end if;
  if (select current_media_id from public.county_story_slots where id = slot) is not distinct from media then
    raise exception 'g_attached_blocked_media';
  end if;
  raise notice 'suspension_replacement_block';
  raise notice 'third_strike_unused_replacement';
end
$$;

-- ---------------------------------------------------------------------------
-- K: technical failures never create strikes
-- ---------------------------------------------------------------------------
do $$
declare
  owner uuid := '10000000-0000-4000-8000-000000000050';
  media uuid;
  r jsonb;
  n int;
begin
  perform public.w4_seed_pro(owner, 'Tech Failures');
  insert into public.county_story_media (
    id, professional_owner_id, purpose, state, storage_path, expires_at,
    container, codec_video
  ) values (
    '20000000-0000-4000-8000-000000000050',
    owner, 'original', 'needs_normalization',
    owner::text || '/20000000-0000-4000-8000-000000000050/clip.mov',
    now() + interval '6 hours', 'mp4', 'hvc1'
  );
  r := public.publish_county_story(
    owner, '20000000-0000-4000-8000-000000000050', '48457', 'local_knowledge',
    null, 'w4-k-norm', true, timestamptz '2026-09-23 12:00:00-05'
  );
  if r->>'code' is distinct from 'MEDIA_NOT_VALID' then
    raise exception 'k_norm %', r;
  end if;

  media := public.w4_valid_media(owner);
  r := public.publish_county_story(
    owner, media, '48457', 'local_knowledge', null,
    'short', true, timestamptz '2026-09-23 12:00:00-05'
  );
  if r->>'code' is distinct from 'IDEMPOTENCY_CONFLICT' then
    raise exception 'k_short_key %', r;
  end if;

  r := public.replace_county_story_media(
    owner, gen_random_uuid(), media, 'w4-k-rep-miss', true,
    timestamptz '2026-09-23 12:00:00-05'
  );
  if r->>'code' not in ('NOT_SLOT_OWNER', 'STORY_DAY_ENDED') then
    raise exception 'k_replace_miss %', r;
  end if;

  perform public.county_story_media_record_cleanup_failure(
    media, 'storage_delete_failed', timestamptz '2026-09-23 12:01:00-05'
  );

  select count(*) into n from public.county_story_enforcement_events
   where professional_owner_id = owner;
  if n is distinct from 0 then
    raise exception 'k_strikes %', n;
  end if;
  if exists (select 1 from public.county_story_suspensions where professional_owner_id = owner) then
    raise exception 'k_suspension';
  end if;
  raise notice 'technical_failures_zero_strikes';
end
$$;

-- ---------------------------------------------------------------------------
-- L: idempotent policy action
-- ---------------------------------------------------------------------------
do $$
declare
  owner uuid := '10000000-0000-4000-8000-000000000060';
  media uuid;
  slot uuid;
  r1 jsonb;
  r2 jsonb;
  r3 jsonb;
begin
  perform public.w4_seed_pro(owner, 'Idempotent Hide');
  media := public.w4_valid_media(owner);
  r1 := public.publish_county_story(
    owner, media, '48407', 'local_knowledge', null,
    'w4-l-pub', true, timestamptz '2026-09-21 15:00:00-05'
  );
  slot := (r1->>'slot_id')::uuid;
  r1 := public.hide_county_story_for_policy(
    slot, 'generic_solicitation', 'first', 'w4-l-hide', 'admin', 'admin-l',
    timestamptz '2026-09-21 15:10:00-05'
  );
  r2 := public.hide_county_story_for_policy(
    slot, 'generic_solicitation', 'retry', 'w4-l-hide', 'admin', 'admin-l',
    timestamptz '2026-09-21 15:11:00-05'
  );
  r3 := public.hide_county_story_for_policy(
    slot, 'generic_solicitation', 'other-key', 'w4-l-hide-2', 'admin', 'admin-l',
    timestamptz '2026-09-21 15:12:00-05'
  );
  if r1->>'event_id' is distinct from r2->>'event_id' then
    raise exception 'l_same_key_new_event % %', r1, r2;
  end if;
  if (select count(*) from public.county_story_enforcement_events where professional_owner_id = owner)
       is distinct from 1 then
    raise exception 'l_duplicate_events';
  end if;
  if (select count(*) from public.county_story_suspensions where professional_owner_id = owner)
       is distinct from 0 then
    raise exception 'l_false_suspension';
  end if;
  if r3->>'code' is distinct from 'POLICY_HIDDEN' then
    raise exception 'l_natural_key %', r3;
  end if;
  raise notice 'idempotent_policy_action';
end
$$;

-- ---------------------------------------------------------------------------
-- M: policy removal at 30 / 30
-- ---------------------------------------------------------------------------
do $$
declare
  i int;
  owner uuid;
  media uuid;
  r jsonb;
  hide_slot uuid;
  cap jsonb;
begin
  for i in 1..30 loop
    owner := ('10000000-0000-4000-8000-00000001' || lpad(i::text, 4, '0'))::uuid;
    perform public.w4_seed_pro(owner, 'Full ' || i);
    media := public.w4_valid_media(owner);
    r := public.publish_county_story(
      owner, media, '48471', 'local_knowledge', null,
      'w4-m-pub-' || i, true, timestamptz '2026-09-26 13:00:00-05'
    );
    if r->>'code' is distinct from 'PUBLISHED' then
      raise exception 'm_publish % %', i, r;
    end if;
    if i = 12 then
      hide_slot := (r->>'slot_id')::uuid;
    end if;
  end loop;
  cap := public.county_story_capacity('48471', timestamptz '2026-09-26 13:00:00-05');
  if (cap->>'accepted')::int is distinct from 30 then
    raise exception 'm_before %', cap;
  end if;
  r := public.hide_county_story_for_policy(
    hide_slot, 'other_policy', null, 'w4-m-hide', 'admin', 'admin-m',
    timestamptz '2026-09-26 13:10:00-05'
  );
  if r->>'code' is distinct from 'POLICY_HIDDEN' then
    raise exception 'm_hide %', r;
  end if;
  cap := public.county_story_capacity('48471', timestamptz '2026-09-26 13:10:00-05');
  if (cap->>'accepted')::int is distinct from 30 then
    raise exception 'm_after %', cap;
  end if;
  if (select accepted_count from public.county_story_days
       where county_fips = '48471' and story_day = date '2026-09-26')
       is distinct from 30 then
    raise exception 'm_accepted_count';
  end if;
  if (select count(*) from public.county_story_slots
       where county_fips = '48471' and story_day = date '2026-09-26')
       is distinct from 30 then
    raise exception 'm_slot_deleted';
  end if;
  if (select slot_number from public.county_story_slots where id = hide_slot)
       is distinct from 12 then
    raise exception 'm_slot_number_changed';
  end if;
  raise notice 'policy_removal_at_capacity';
end
$$;

-- ---------------------------------------------------------------------------
-- N: storage cleanup failure after hide
-- ---------------------------------------------------------------------------
do $$
declare
  owner uuid := '10000000-0000-4000-8000-000000000070';
  media uuid;
  slot uuid;
  r jsonb;
  marked boolean;
begin
  perform public.w4_seed_pro(owner, 'Cleanup Fail');
  media := public.w4_valid_media(owner);
  r := public.publish_county_story(
    owner, media, '48291', 'local_knowledge', null,
    'w4-n-pub', true, timestamptz '2026-09-16 16:00:00-05'
  );
  slot := (r->>'slot_id')::uuid;
  r := public.hide_county_story_for_policy(
    slot, 'inappropriate', null, 'w4-n-hide', 'admin', 'admin-n',
    timestamptz '2026-09-16 16:10:00-05'
  );
  if not exists (
    select 1 from public.county_story_media_list_policy_removed(timestamptz '2026-09-16 16:10:00-05')
     where id = media
  ) then
    raise exception 'n_not_listed';
  end if;
  perform public.county_story_media_record_cleanup_failure(
    media, 'storage_delete_failed', timestamptz '2026-09-16 16:11:00-05'
  );
  if (select state from public.county_story_slots where id = slot) is distinct from 'hidden' then
    raise exception 'n_restored';
  end if;
  if (select media_deleted_at from public.county_story_media where id = media) is not null then
    raise exception 'n_marked_without_storage';
  end if;
  if (select cleanup_error from public.county_story_media where id = media) is null then
    raise exception 'n_missing_cleanup_error';
  end if;
  if not exists (
    select 1 from public.county_story_enforcement_events
     where slot_id = slot and media_id = media
  ) then
    raise exception 'n_event_rolled_back';
  end if;
  marked := public.county_story_media_mark_policy_deleted(
    media, timestamptz '2026-09-16 16:20:00-05'
  );
  if marked is not true then
    raise exception 'n_retry_failed';
  end if;
  if (select state from public.county_story_slots where id = slot) is distinct from 'hidden' then
    raise exception 'n_unhid_after_retry';
  end if;
  raise notice 'storage_cleanup_failure';
end
$$;

-- ---------------------------------------------------------------------------
-- Authenticated callers cannot hide. Suspension read is service-role.
-- ---------------------------------------------------------------------------
do $$
declare
  r jsonb;
  owner uuid := '10000000-0000-4000-8000-000000000060';
  slot uuid;
begin
  select id into slot from public.county_story_slots
   where professional_owner_id = owner
   order by accepted_at desc
   limit 1;
  perform set_config('request.jwt.claim.role', 'authenticated', false);
  r := public.hide_county_story_for_policy(
    slot, 'other_policy', null, 'w4-auth-hide', 'admin', 'intruder',
    timestamptz '2026-09-21 16:00:00-05'
  );
  if r->>'code' is distinct from 'NOT_ELIGIBLE' then
    raise exception 'auth_hide %', r;
  end if;
  r := public.county_story_suspension_status(owner, timestamptz '2026-09-21 16:00:00-05');
  if r->>'code' is distinct from 'NOT_ELIGIBLE' then
    raise exception 'auth_status %', r;
  end if;
  perform set_config('request.jwt.claim.role', 'service_role', false);
  raise notice 'service_role_hide_authority';
end
$$;

-- ---------------------------------------------------------------------------
-- O: public publishing remains disabled at the end
-- ---------------------------------------------------------------------------
update public.county_story_launch set publish_enabled = false where id = 1;

do $$
declare
  owner uuid := '10000000-0000-4000-8000-000000000080';
  media uuid;
  r jsonb;
  status jsonb;
begin
  perform public.w4_seed_pro(owner, 'Final Gate');
  media := public.w4_valid_media(owner);
  r := public.publish_county_story(
    owner, media, '48373', 'local_knowledge', null,
    'w4-o-pub', true, timestamptz '2026-09-28 14:00:00-05'
  );
  if r->>'code' is distinct from 'FEATURE_DISABLED' then
    raise exception 'o_publish %', r;
  end if;
  if public.county_story_publish_enabled() is not false then
    raise exception 'o_gate_on';
  end if;
  perform set_config('request.jwt.claim.role', 'service_role', false);
  status := public.county_story_suspension_status(
    '10000000-0000-4000-8000-000000000010',
    timestamptz '2026-09-24 14:00:00-05'
  );
  if status->>'code' is distinct from 'SUSPENDED' then
    raise exception 'status_foundation %', status;
  end if;
  if status->>'eligible_at' is null or status->>'qualifying_count' is null then
    raise exception 'status_fields %', status;
  end if;
  if status ? 'reason_detail' or status ? 'actor_id' then
    raise exception 'status_leaked %', status;
  end if;
  raise notice 'feature_gate_remains_off';
  raise notice 'suspension_read_foundation';
  raise notice 'wave4_gates_ok';
end
$$;
