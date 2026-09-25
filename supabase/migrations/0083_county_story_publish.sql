-- County Stories Wave 3: atomic publish / replace.
-- No consumer UI, composer, viewer, captions, strikes, or share URLs.
-- Public publishing stays disabled until a later launch gate is turned on.

-- ---------------------------------------------------------------------------
-- Launch gate. Default OFF. Hosted must stay off until later waves.
-- ---------------------------------------------------------------------------
create table public.county_story_launch (
  id smallint primary key default 1,
  publish_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint county_story_launch_singleton check (id = 1)
);

insert into public.county_story_launch (id, publish_enabled)
values (1, false)
on conflict (id) do nothing;

comment on table public.county_story_launch is
  'Server authority for County Story publish/replace. Default false. Not a UI flag.';

alter table public.county_story_launch enable row level security;
alter table public.county_story_launch force row level security;
revoke all on table public.county_story_launch from public, anon, authenticated;
grant all on table public.county_story_launch to service_role;

create or replace function public.county_story_publish_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select l.publish_enabled from public.county_story_launch l where l.id = 1),
    false
  );
$$;

revoke all on function public.county_story_publish_enabled()
  from public, anon, authenticated;
grant execute on function public.county_story_publish_enabled()
  to service_role;

-- Snapshot/listing columns already exist on hosted profiles, listings, and
-- brokerages. Isolated harnesses add the same columns via
-- scripts/county-stories-w3-bootstrap.sql.

-- ---------------------------------------------------------------------------
-- Slot + intent columns for attach, snapshot, rules, replacement
-- ---------------------------------------------------------------------------
alter table public.county_story_slots
  add column if not exists current_media_id uuid
    references public.county_story_media (id)
    on delete restrict
    on update restrict,
  add column if not exists rules_acknowledged_at timestamptz,
  add column if not exists replacement_rules_acknowledged_at timestamptz,
  add column if not exists replaced_at timestamptz,
  add column if not exists snapshot_legal_name text,
  add column if not exists snapshot_license text,
  add column if not exists snapshot_trec_status text,
  add column if not exists snapshot_professional_type text,
  add column if not exists snapshot_purpose text,
  add column if not exists snapshot_account_kind text,
  add column if not exists snapshot_brokerage_id uuid,
  add column if not exists snapshot_brokerage_name text,
  add column if not exists snapshot_sponsor_name text,
  add column if not exists snapshot_sponsor_license text,
  add column if not exists snapshot_story_pro boolean;

alter table public.county_story_slots
  drop constraint if exists county_story_slots_accepted_has_media;
alter table public.county_story_slots
  add constraint county_story_slots_accepted_has_media
    check (state <> 'accepted' or current_media_id is not null);
alter table public.county_story_slots
  drop constraint if exists county_story_slots_replace_ack_check;
alter table public.county_story_slots
  add constraint county_story_slots_replace_ack_check
    check (
      (replacement_used = false and replacement_rules_acknowledged_at is null)
      or (replacement_used = true and replacement_rules_acknowledged_at is not null)
    );
comment on column public.county_story_slots.rules_acknowledged_at is
  'Version 1 publish acknowledgment. Never overwritten by replacement.';
comment on column public.county_story_slots.replacement_rules_acknowledged_at is
  'Independent Version 2 / replacement acknowledgment. Separate publication event.';

create unique index if not exists county_story_slots_current_media_uidx
  on public.county_story_slots (current_media_id)
  where current_media_id is not null;

alter table public.county_story_media
  add column if not exists superseded_at timestamptz;

alter table public.county_story_publish_intents
  add column if not exists request_hash text,
  add column if not exists result_payload jsonb;

-- ---------------------------------------------------------------------------
-- Publish eligibility: Story Pro purpose + verified TX license.
-- other_professional / consumer stay denied. brokerage_id may be null.
-- ---------------------------------------------------------------------------
create or replace function public.county_story_publish_eligible(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = p_uid
       and p.account_purpose in ('individual_pro', 'managing_broker')
       and coalesce(p.professional_role, '') not in ('inspector', 'appraiser', 'lender')
       and nullif(btrim(coalesce(p.verified_license, p.trec_license, '')), '') is not null
  );
$$;

comment on function public.county_story_publish_eligible(uuid) is
  'Wave 3 accept eligibility. Story Pro purpose plus a verified/TREC license. Null brokerage_id is allowed.';

revoke all on function public.county_story_publish_eligible(uuid)
  from public, anon, authenticated;
grant execute on function public.county_story_publish_eligible(uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.county_story_result(
  p_ok boolean,
  p_code text,
  p_extra jsonb default '{}'::jsonb
)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object('ok', p_ok, 'code', p_code) || coalesce(p_extra, '{}'::jsonb);
$$;

create or replace function public.county_story_request_hash(
  p_operation text,
  p_media uuid,
  p_county_fips text,
  p_story_type text,
  p_listing_id uuid,
  p_slot_id uuid
)
returns text
language sql
immutable
as $$
  select md5(concat_ws(
    '|',
    p_operation,
    coalesce(p_media::text, ''),
    coalesce(p_county_fips, ''),
    coalesce(p_story_type, ''),
    coalesce(p_listing_id::text, ''),
    coalesce(p_slot_id::text, '')
  ));
$$;

create or replace function public.county_story_store_intent(
  p_owner uuid,
  p_key text,
  p_operation text,
  p_hash text,
  p_slot uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.county_story_publish_intents (
    professional_owner_id, idempotency_key, operation,
    request_hash, slot_id, result_code, result_payload
  ) values (
    p_owner, p_key, p_operation,
    p_hash, p_slot, p_payload->>'code', p_payload
  )
  on conflict (professional_owner_id, idempotency_key) do update
    set slot_id = excluded.slot_id,
        result_code = excluded.result_code,
        result_payload = excluded.result_payload,
        request_hash = excluded.request_hash;
end;
$$;

create or replace function public.county_story_replay_or_conflict(
  p_owner uuid,
  p_key text,
  p_operation text,
  p_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  intent public.county_story_publish_intents%rowtype;
begin
  select * into intent
    from public.county_story_publish_intents
   where professional_owner_id = p_owner
     and idempotency_key = p_key
   for update;
  if not found then
    return null;
  end if;
  if intent.operation is distinct from p_operation
     or intent.request_hash is distinct from p_hash then
    return public.county_story_result(false, 'IDEMPOTENCY_CONFLICT');
  end if;
  return coalesce(intent.result_payload, public.county_story_result(false, intent.result_code));
end;
$$;

-- ---------------------------------------------------------------------------
-- Capacity read. Consumed slots, including later hidden ones.
-- ---------------------------------------------------------------------------
create or replace function public.county_story_capacity(
  p_county_fips text,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_day date := public.county_story_day(p_at);
  v_n int;
begin
  if not public.county_story_county_is_active(p_county_fips) then
    return public.county_story_result(false, 'COUNTY_INACTIVE', jsonb_build_object(
      'county_fips', p_county_fips,
      'story_day', v_day,
      'accepted', 0,
      'max', 30
    ));
  end if;
  select count(*) into v_n
    from public.county_story_slots s
   where s.county_fips = p_county_fips
     and s.story_day = v_day;
  return public.county_story_result(true, 'CAPACITY', jsonb_build_object(
    'county_fips', p_county_fips,
    'story_day', v_day,
    'accepted', v_n,
    'max', 30
  ));
end;
$$;

revoke all on function public.county_story_capacity(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_capacity(text, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Publish. Lock order: professional+day, then county+day, then media/slot.
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

  -- 1. Professional + Story Day
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

  -- 2. County + Story Day
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

  -- 3. Media / slot commit
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
  'Atomic County Story accept. Service-role only. Feature-gated. Playback-ready media only. Stores idempotency only on PUBLISHED. No slot-delete path.';

revoke all on function public.publish_county_story(uuid, uuid, text, text, uuid, text, boolean, timestamptz)
  from public, anon, authenticated;
grant execute on function public.publish_county_story(uuid, uuid, text, text, uuid, text, boolean, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Replace current media once. No capacity / slot-number / ownership change.
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
  'Atomic one-time media replacement. Requires its own rules acknowledgment. Does not change capacity, slot number, County, Story Day, or Version 1 acknowledgment.';

revoke all on function public.replace_county_story_media(uuid, uuid, uuid, text, boolean, timestamptz)
  from public, anon, authenticated;
grant execute on function public.replace_county_story_media(uuid, uuid, uuid, text, boolean, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Retire superseded media AFTER the new pointer committed.
-- Storage object must already be gone. Never rolls the Story back.
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
     and (m.slot_id is null or m.superseded_at is not null);
end;
$$;

revoke all on function public.county_story_media_mark_retired(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_media_mark_retired(uuid, timestamptz)
  to service_role;

revoke all on function public.county_story_result(boolean, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.county_story_result(boolean, text, jsonb)
  to service_role;
revoke all on function public.county_story_request_hash(text, uuid, text, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.county_story_request_hash(text, uuid, text, text, uuid, uuid)
  to service_role;
revoke all on function public.county_story_store_intent(uuid, text, text, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.county_story_store_intent(uuid, text, text, text, uuid, jsonb)
  to service_role;
revoke all on function public.county_story_replay_or_conflict(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.county_story_replay_or_conflict(uuid, text, text, text)
  to service_role;

create or replace function public.county_story_media_list_superseded(
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
     and m.superseded_at is not null
     and m.superseded_at <= p_at
     and m.state <> 'deleted'
     and not exists (
       select 1 from public.county_story_slots s where s.current_media_id = m.id
     );
$$;

comment on function public.county_story_media_list_superseded(timestamptz) is
  'Superseded media eligible for storage-first retire. Never includes current Story media. No slot reopen.';

revoke all on function public.county_story_media_list_superseded(timestamptz)
  from public, anon, authenticated;
grant execute on function public.county_story_media_list_superseded(timestamptz)
  to service_role;
