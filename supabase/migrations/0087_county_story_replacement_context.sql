-- County Stories replacement context.
-- The one replacement may change Story type and the optional property link.
-- County, Story Day, owner, and slot number stay fixed.
-- A missing Story type or property action is rejected. Blank does not mean keep.

create or replace function public.county_story_replace_request_hash(
  p_media uuid,
  p_story_type text,
  p_listing_action text,
  p_listing_id uuid,
  p_slot uuid
)
returns text
language sql
immutable
as $$
  select md5(concat_ws(
    '|',
    'replace',
    coalesce(p_slot::text, ''),
    coalesce(p_media::text, ''),
    coalesce(p_story_type, ''),
    coalesce(p_listing_action, ''),
    coalesce(p_listing_id::text, '')
  ));
$$;

comment on function public.county_story_replace_request_hash(uuid, text, text, uuid, uuid) is
  'Replace idempotency hash. Includes operation, slot, media, Story type, property action, and listing id. Does not change publish, policy-hide, or caption-job hashes.';

revoke all on function public.county_story_replace_request_hash(uuid, text, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.county_story_replace_request_hash(uuid, text, text, uuid, uuid)
  to service_role;

drop function if exists public.replace_county_story_media(uuid, uuid, uuid, text, boolean, timestamptz, uuid);

create function public.replace_county_story_media(
  p_owner uuid,
  p_slot uuid,
  p_media uuid,
  p_idempotency_key text,
  p_rules_acknowledged boolean,
  p_story_type text,
  p_listing_action text,
  p_listing_id uuid,
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
  v_hash := public.county_story_replace_request_hash(
    p_media, p_story_type, p_listing_action, p_listing_id, p_slot
  );

  perform pg_advisory_xact_lock(
    hashtext('county_story_pro'),
    hashtext(p_owner::text || ':' || v_day::text)
  );

  v_replay := public.county_story_replay_or_conflict(p_owner, p_idempotency_key, 'replace', v_hash);
  if v_replay is not null then
    return v_replay;
  end if;

  if p_story_type is null
     or p_story_type not in ('local_knowledge', 'open_house_property') then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  if p_listing_action is null
     or p_listing_action not in ('keep', 'set', 'clear') then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  if p_listing_action in ('keep', 'clear') and p_listing_id is not null then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  if p_listing_action = 'set' and p_listing_id is null then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
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

  if p_listing_action = 'keep' then
    v_next_listing := v_slot.listing_id;
  elsif p_listing_action = 'clear' then
    v_next_listing := null;
  else
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
         story_type = p_story_type,
         listing_id = v_next_listing,
         replacement_used = true,
         replaced_at = p_at,
         replacement_rules_acknowledged_at = p_at
   where id = v_slot.id
     and replacement_used = false
     and current_media_id is not distinct from v_old
     and rules_acknowledged_at is not distinct from v_slot.rules_acknowledged_at
     and county_fips is not distinct from v_slot.county_fips
     and story_day is not distinct from v_slot.story_day
     and professional_owner_id is not distinct from v_slot.professional_owner_id
     and slot_number is not distinct from v_slot.slot_number;
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
    'superseded_media_id', v_old,
    'story_type', p_story_type,
    'listing_id', v_next_listing
  ));
  perform public.county_story_store_intent(
    p_owner, p_idempotency_key, 'replace', v_hash, v_slot.id, v_payload
  );
  return v_payload;
end;
$$;

comment on function public.replace_county_story_media(uuid, uuid, uuid, text, boolean, text, text, uuid, timestamptz) is
  'One replacement on the owned slot. Requires an explicit Story type and property action (keep, set, or clear). May change video, Story type, and listing. Does not change County, Story Day, owner, slot number, or capacity. Prepared signed playback, captions, accessibility, and rules acknowledgment still required.';

revoke all on function public.replace_county_story_media(uuid, uuid, uuid, text, boolean, text, text, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.replace_county_story_media(uuid, uuid, uuid, text, boolean, text, text, uuid, timestamptz)
  to service_role;
