-- County Stories Wave 4: policy hide, enforcement events, strikes, 7-day suspension.
-- No consumer UI, composer, viewer, captions, analytics, or share URLs.
-- Public publishing stays disabled. This migration does not enable the launch gate.
-- Technical/system failures never write these tables.

-- ---------------------------------------------------------------------------
-- Slot / media audit columns. Hide never deletes the durable slot.
-- ---------------------------------------------------------------------------
alter table public.county_story_slots
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_reason_code text;

alter table public.county_story_media
  add column if not exists policy_removed_at timestamptz;

comment on column public.county_story_slots.hidden_at is
  'Last policy-hide timestamp. Playback authority is state=hidden, not this column. Replacement may reactivate the same slot.';
comment on column public.county_story_slots.hidden_reason_code is
  'Last policy reason code. Durable enforcement facts live on county_story_enforcement_events.';
comment on column public.county_story_media.policy_removed_at is
  'Set when hide commits. Storage-first delete follows. Failure does not restore playback or erase the event.';

-- ---------------------------------------------------------------------------
-- Enforcement events. Append-only. Media bytes are temporary; this row is not.
-- ---------------------------------------------------------------------------
create table public.county_story_enforcement_events (
  id uuid primary key default gen_random_uuid(),
  professional_owner_id uuid not null
    references public.profiles (id)
    on delete restrict
    on update restrict,
  slot_id uuid not null
    references public.county_story_slots (id)
    on delete restrict
    on update restrict,
  media_id uuid not null
    references public.county_story_media (id)
    on delete restrict
    on update restrict,
  county_fips text not null,
  story_day date not null,
  action text not null,
  reason_code text not null,
  reason_detail text,
  qualifies_for_strike boolean not null default true,
  actor_kind text not null,
  actor_id text,
  idempotency_key text not null,
  request_hash text not null,
  occurred_at timestamptz not null,
  result_payload jsonb,
  created_at timestamptz not null default now(),
  constraint county_story_enforcement_action_check
    check (action = 'policy_hide'),
  constraint county_story_enforcement_reason_check
    check (reason_code in (
      'generic_solicitation',
      'static_business_card',
      'inappropriate',
      'unauthorized_property',
      'other_policy'
    )),
  constraint county_story_enforcement_actor_check
    check (actor_kind in ('admin', 'system')),
  constraint county_story_enforcement_owner_key_unique
    unique (professional_owner_id, idempotency_key),
  constraint county_story_enforcement_slot_media_action_unique
    unique (slot_id, media_id, action)
);

comment on table public.county_story_enforcement_events is
  'Durable County Stories policy-hide facts. One event per slot+media+action. Technical failures never insert here.';

create index county_story_enforcement_owner_at_idx
  on public.county_story_enforcement_events (professional_owner_id, occurred_at);

create index county_story_enforcement_slot_idx
  on public.county_story_enforcement_events (slot_id, occurred_at);

alter table public.county_story_enforcement_events enable row level security;
alter table public.county_story_enforcement_events force row level security;
revoke all on table public.county_story_enforcement_events from public, anon, authenticated;
grant all on table public.county_story_enforcement_events to service_role;

-- ---------------------------------------------------------------------------
-- Suspensions. Start = third qualifying removal. End = start + 7 days exactly.
-- ---------------------------------------------------------------------------
create table public.county_story_suspensions (
  id uuid primary key default gen_random_uuid(),
  professional_owner_id uuid not null
    references public.profiles (id)
    on delete restrict
    on update restrict,
  triggering_event_id uuid not null
    references public.county_story_enforcement_events (id)
    on delete restrict
    on update restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint county_story_suspensions_window_check
    check (ends_at = starts_at + interval '7 days'),
  constraint county_story_suspensions_trigger_unique
    unique (triggering_event_id)
);

comment on table public.county_story_suspensions is
  'County Stories publishing suspension only. One row per triggering third-strike event. Exact start/end timestamps. Not a Story Home-wide ban.';

create index county_story_suspensions_owner_window_idx
  on public.county_story_suspensions (professional_owner_id, starts_at, ends_at);

alter table public.county_story_suspensions enable row level security;
alter table public.county_story_suspensions force row level security;
revoke all on table public.county_story_suspensions from public, anon, authenticated;
grant all on table public.county_story_suspensions to service_role;

-- ---------------------------------------------------------------------------
-- Reads. Service-role only. Professional APIs use the admin client.
-- ---------------------------------------------------------------------------
create or replace function public.county_story_qualifying_strike_count(
  p_owner uuid,
  p_at timestamptz
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from public.county_story_enforcement_events e
   where e.professional_owner_id = p_owner
     and e.qualifies_for_strike
     and e.occurred_at >= p_at - interval '7 days'
     and e.occurred_at <= p_at;
$$;

create or replace function public.county_story_is_suspended(
  p_owner uuid,
  p_at timestamptz default now()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.county_story_suspensions s
     where s.professional_owner_id = p_owner
       and s.starts_at <= p_at
       and p_at < s.ends_at
  );
$$;

create or replace function public.county_story_suspension_block(
  p_owner uuid,
  p_at timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  select s.starts_at, s.ends_at
    into v_start, v_end
    from public.county_story_suspensions s
   where s.professional_owner_id = p_owner
     and s.starts_at <= p_at
     and p_at < s.ends_at
   order by s.starts_at desc
   limit 1;
  if v_end is null then
    return null;
  end if;
  return public.county_story_result(false, 'POSTING_SUSPENDED', jsonb_build_object(
    'starts_at', v_start,
    'ends_at', v_end,
    'eligible_at', v_end
  ));
end;
$$;

create or replace function public.county_story_suspension_status(
  p_owner uuid,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_count int;
begin
  if auth.role() is distinct from 'service_role' then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  v_count := public.county_story_qualifying_strike_count(p_owner, p_at);
  select s.starts_at, s.ends_at
    into v_start, v_end
    from public.county_story_suspensions s
   where s.professional_owner_id = p_owner
     and s.starts_at <= p_at
     and p_at < s.ends_at
   order by s.starts_at desc
   limit 1;
  if v_end is not null then
    return public.county_story_result(true, 'SUSPENDED', jsonb_build_object(
      'suspended', true,
      'starts_at', v_start,
      'ends_at', v_end,
      'eligible_at', v_end,
      'qualifying_count', v_count
    ));
  end if;
  return public.county_story_result(true, 'CLEAR', jsonb_build_object(
    'suspended', false,
    'starts_at', null,
    'ends_at', null,
    'eligible_at', null,
    'qualifying_count', v_count
  ));
end;
$$;

comment on function public.county_story_suspension_status(uuid, timestamptz) is
  'Safe composer foundation. Suspended flag, exact start/end/eligible_at, rolling qualifying count. No admin notes.';

revoke all on function public.county_story_qualifying_strike_count(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_qualifying_strike_count(uuid, timestamptz)
  to service_role;
revoke all on function public.county_story_is_suspended(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_is_suspended(uuid, timestamptz)
  to service_role;
revoke all on function public.county_story_suspension_block(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_suspension_block(uuid, timestamptz)
  to service_role;
revoke all on function public.county_story_suspension_status(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_suspension_status(uuid, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Policy-removed media cleanup. Storage-first. Never un-hides the slot.
-- ---------------------------------------------------------------------------
create or replace function public.county_story_media_list_policy_removed(
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

comment on function public.county_story_media_list_policy_removed(timestamptz) is
  'Policy-removed temporary media eligible for storage delete. Hidden current media is included. Accepted current media is not.';

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
  return n > 0;
end;
$$;

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
     and m.media_deleted_at is null
     and m.state <> 'deleted'
     and (
       m.slot_id is null
       or m.superseded_at is not null
       or m.policy_removed_at is not null
     );
end;
$$;

revoke all on function public.county_story_media_list_policy_removed(timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_media_list_policy_removed(timestamptz)
  to service_role;
revoke all on function public.county_story_media_mark_policy_deleted(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_media_mark_policy_deleted(uuid, timestamptz)
  to service_role;
revoke all on function public.county_story_media_record_cleanup_failure(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_media_record_cleanup_failure(uuid, text, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Policy hide. Service-role only. Explicit reason required. No slot delete.
-- Does not consult the public publish feature gate.
-- ---------------------------------------------------------------------------
create or replace function public.hide_county_story_for_policy(
  p_slot uuid,
  p_reason_code text,
  p_reason_detail text,
  p_idempotency_key text,
  p_actor_kind text,
  p_actor_id text,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.county_story_slots%rowtype;
  v_event public.county_story_enforcement_events%rowtype;
  v_hash text;
  v_count int;
  v_payload jsonb;
  v_start timestamptz;
  v_end timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;
  if char_length(coalesce(p_idempotency_key, '')) < 8
     or char_length(p_idempotency_key) > 128 then
    return public.county_story_result(false, 'IDEMPOTENCY_CONFLICT');
  end if;
  if p_reason_code is null
     or p_reason_code not in (
       'generic_solicitation',
       'static_business_card',
       'inappropriate',
       'unauthorized_property',
       'other_policy'
     ) then
    return public.county_story_result(false, 'INVALID_REASON');
  end if;
  if p_actor_kind is null or p_actor_kind not in ('admin', 'system') then
    return public.county_story_result(false, 'NOT_ELIGIBLE');
  end if;

  select * into v_slot
    from public.county_story_slots s
   where s.id = p_slot;
  if not found then
    return public.county_story_result(false, 'NOT_SLOT_OWNER');
  end if;

  perform pg_advisory_xact_lock(
    hashtext('county_story_pro'),
    hashtext(v_slot.professional_owner_id::text || ':' || v_slot.story_day::text)
  );

  select * into v_event
    from public.county_story_enforcement_events e
   where e.professional_owner_id = v_slot.professional_owner_id
     and e.idempotency_key = p_idempotency_key
   for update;
  if found then
    v_hash := public.county_story_request_hash(
      'policy_hide', v_event.media_id, v_event.county_fips, p_reason_code, null, p_slot
    );
    if v_event.request_hash is distinct from v_hash
       or v_event.slot_id is distinct from p_slot
       or v_event.reason_code is distinct from p_reason_code then
      return public.county_story_result(false, 'IDEMPOTENCY_CONFLICT');
    end if;
    return coalesce(
      v_event.result_payload,
      public.county_story_result(true, 'POLICY_HIDDEN', jsonb_build_object(
        'slot_id', v_event.slot_id,
        'event_id', v_event.id,
        'media_id', v_event.media_id
      ))
    );
  end if;

  select * into v_slot
    from public.county_story_slots s
   where s.id = p_slot
   for update;
  if not found then
    return public.county_story_result(false, 'NOT_SLOT_OWNER');
  end if;
  if v_slot.current_media_id is null then
    return public.county_story_result(false, 'MEDIA_NOT_VALID');
  end if;
  if v_slot.state not in ('accepted', 'hidden') then
    return public.county_story_result(false, 'NOT_PLAYABLE');
  end if;

  select * into v_event
    from public.county_story_enforcement_events e
   where e.slot_id = p_slot
     and e.media_id = v_slot.current_media_id
     and e.action = 'policy_hide';
  if found then
    return coalesce(v_event.result_payload, public.county_story_result(true, 'POLICY_HIDDEN'));
  end if;

  if v_slot.state is distinct from 'accepted' then
    return public.county_story_result(false, 'NOT_PLAYABLE');
  end if;

  perform pg_advisory_xact_lock(
    hashtext('county_story_media'),
    hashtext(v_slot.current_media_id::text)
  );

  update public.county_story_slots
     set state = 'hidden',
         hidden_at = p_at,
         hidden_reason_code = p_reason_code
   where id = v_slot.id
     and state = 'accepted'
     and current_media_id is not distinct from v_slot.current_media_id;
  if not found then
    return public.county_story_result(false, 'NOT_PLAYABLE');
  end if;

  update public.county_story_media
     set policy_removed_at = p_at
   where id = v_slot.current_media_id
     and policy_removed_at is null;

  v_hash := public.county_story_request_hash(
    'policy_hide', v_slot.current_media_id, v_slot.county_fips, p_reason_code, null, p_slot
  );

  insert into public.county_story_enforcement_events (
    professional_owner_id, slot_id, media_id, county_fips, story_day,
    action, reason_code, reason_detail, qualifies_for_strike,
    actor_kind, actor_id, idempotency_key, request_hash, occurred_at
  ) values (
    v_slot.professional_owner_id, v_slot.id, v_slot.current_media_id,
    v_slot.county_fips, v_slot.story_day,
    'policy_hide', p_reason_code, nullif(btrim(coalesce(p_reason_detail, '')), ''),
    true, p_actor_kind, nullif(btrim(coalesce(p_actor_id, '')), ''),
    p_idempotency_key, v_hash, p_at
  )
  returning * into v_event;

  v_count := public.county_story_qualifying_strike_count(
    v_slot.professional_owner_id, p_at
  );
  if v_count = 3 then
    insert into public.county_story_suspensions (
      professional_owner_id, triggering_event_id, starts_at, ends_at
    ) values (
      v_slot.professional_owner_id, v_event.id, p_at, p_at + interval '7 days'
    )
    on conflict (triggering_event_id) do nothing;
  end if;

  select s.starts_at, s.ends_at
    into v_start, v_end
    from public.county_story_suspensions s
   where s.triggering_event_id = v_event.id;

  v_payload := public.county_story_result(true, 'POLICY_HIDDEN', jsonb_build_object(
    'slot_id', v_slot.id,
    'slot_number', v_slot.slot_number,
    'county_fips', v_slot.county_fips,
    'story_day', v_slot.story_day,
    'media_id', v_slot.current_media_id,
    'event_id', v_event.id,
    'qualifying_count', v_count,
    'suspended', v_end is not null,
    'starts_at', v_start,
    'ends_at', v_end,
    'eligible_at', v_end
  ));

  update public.county_story_enforcement_events
     set result_payload = v_payload
   where id = v_event.id;

  return v_payload;
end;
$$;

comment on function public.hide_county_story_for_policy(uuid, text, text, text, text, text, timestamptz) is
  'Trusted policy hide. Service-role only. Consumes the slot permanently. Idempotent per key and per slot+media. Does not decrement capacity.';

revoke all on function public.hide_county_story_for_policy(uuid, text, text, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.hide_county_story_for_policy(uuid, text, text, text, text, text, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Publish: check active County Stories suspension before committing a slot.
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
  'Atomic County Story accept. Service-role only. Feature-gated. Blocks POSTING_SUSPENDED from server authority. Stores idempotency only on PUBLISHED. No slot-delete path.';

revoke all on function public.publish_county_story(uuid, uuid, text, text, uuid, text, boolean, timestamptz)
  from public, anon, authenticated;
grant execute on function public.publish_county_story(uuid, uuid, text, text, uuid, text, boolean, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Replace: suspension blocks unused replacement. Hidden slots reactivate.
-- ---------------------------------------------------------------------------
create or replace function public.replace_county_story_media(
  p_owner uuid,
  p_slot uuid,
  p_media uuid,
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
  v_slot public.county_story_slots%rowtype;
  v_media public.county_story_media%rowtype;
  v_old uuid;
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
    'replace', p_media, null, null, null, p_slot
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

  v_old := v_slot.current_media_id;

  update public.county_story_slots
     set current_media_id = p_media,
         state = 'accepted',
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

comment on function public.replace_county_story_media(uuid, uuid, uuid, text, boolean, timestamptz) is
  'Atomic one-time media replacement. Blocks POSTING_SUSPENDED. Reactivates a policy-hidden slot on success. Does not change capacity or erase enforcement history.';

revoke all on function public.replace_county_story_media(uuid, uuid, uuid, text, boolean, timestamptz)
  from public, anon, authenticated;
grant execute on function public.replace_county_story_media(uuid, uuid, uuid, text, boolean, timestamptz)
  to service_role;
