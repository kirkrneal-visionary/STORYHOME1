-- P1A-1: username registry authority.
-- Username is a public alias. It is not authorization.
-- Does NOT change account_kind, account_purpose, professional_role,
-- Story Pro, Office, TREC, MFA, CAD, SHI, brokerage, or Wave A.
-- Does NOT delete users, listings, or county/CAD.
-- Does NOT edit 0050 / 0053 / 0056 / 0057 files.
-- Clients have no INSERT/UPDATE/DELETE on the registry.
-- profiles.username_normalized is a denormalized pointer, not the authority.

-- ---------------------------------------------------------------------------
-- Table + pointer
-- ---------------------------------------------------------------------------

create table if not exists public.username_registry (
  normalized text primary key,
  display text not null,
  state text not null,
  account_id uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  released_at timestamptz,
  release_reason text,
  reserved_kind text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_registry_state_check
    check (state in ('reserved', 'active', 'tombstoned')),
  constraint username_registry_release_reason_check
    check (
      release_reason is null
      or release_reason in ('user_changed', 'account_deleted', 'admin')
    ),
  constraint username_registry_reserved_kind_check
    check (
      reserved_kind is null
      or reserved_kind in (
        'system_route',
        'brand',
        'role_word',
        'journalism',
        'impersonation',
        'admin'
      )
    ),
  constraint username_registry_display_matches
    check (display = normalized),
  constraint username_registry_active_has_account
    check (state <> 'active' or account_id is not null)
);

create unique index if not exists username_registry_one_active_per_account
  on public.username_registry (account_id)
  where state = 'active';

create index if not exists username_registry_account_id_idx
  on public.username_registry (account_id);

alter table public.profiles
  add column if not exists username_normalized text;

comment on column public.profiles.username_normalized is
  'Active username pointer only. Not client-writable. Not granted to PostgREST.';

create unique index if not exists profiles_username_normalized_active_key
  on public.profiles (username_normalized)
  where username_normalized is not null;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'profiles_username_normalized_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_username_normalized_fkey
      foreign key (username_normalized)
      references public.username_registry(normalized)
      on delete set null;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- RLS / grants — no client DML, no client SELECT of tombstones
-- ---------------------------------------------------------------------------

alter table public.username_registry enable row level security;
alter table public.username_registry force row level security;

revoke all on table public.username_registry from public, anon, authenticated;
grant all on table public.username_registry to service_role;

-- New profiles column is omitted from the 0050 column grant list on purpose.

-- ---------------------------------------------------------------------------
-- Policy + inspect (server-configurable numbers live in username_policy)
-- ---------------------------------------------------------------------------

create or replace function public.username_policy()
returns table (
  min_len integer,
  max_len integer,
  cooldown_days integer,
  max_changes_12m integer
)
language sql
immutable
set search_path = public
as $$
  select 4, 20, 30, 2;
$$;

comment on function public.username_policy() is
  'v1 username limits. Initial claim is not a change. Server-authoritative.';

create or replace function public.username_inspect(p_raw text)
returns table (
  normalized text,
  status text,
  code text
)
language plpgsql
stable
set search_path = public
as $$
declare
  v text;
  v_min integer;
  v_max integer;
begin
  select p.min_len, p.max_len into v_min, v_max from public.username_policy() p;
  v := btrim(coalesce(p_raw, ''));
  if v like '@%' then
    v := substring(v from 2);
  end if;
  if v = '' then
    return query select null::text, 'invalid'::text, 'too_short'::text;
    return;
  end if;
  if v ~ '[^A-Za-z0-9_]' then
    return query select null::text, 'invalid'::text, 'bad_chars'::text;
    return;
  end if;
  v := lower(v);
  if char_length(v) < v_min then
    return query select v, 'invalid'::text, 'too_short'::text;
    return;
  end if;
  if char_length(v) > v_max then
    return query select v, 'invalid'::text, 'too_long'::text;
    return;
  end if;
  if v ~ '^_' or v ~ '_$' or v ~ '__' then
    return query select v, 'invalid'::text, 'bad_chars'::text;
    return;
  end if;
  return query select v, 'ok'::text, 'ok'::text;
end;
$$;

comment on function public.username_inspect(text) is
  'Canonical lowercase inspect. Syntax codes only. Does not reveal holders.';

create or replace function public.username_availability(p_raw text)
returns table (
  normalized text,
  status text,
  code text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_norm text;
  v_status text;
  v_code text;
begin
  select i.normalized, i.status, i.code
    into v_norm, v_status, v_code
    from public.username_inspect(p_raw) i;
  if v_status = 'invalid' then
    return query select v_norm, 'invalid'::text, v_code;
    return;
  end if;
  if exists (
    select 1
      from public.username_registry r
     where r.normalized = v_norm
  ) then
    return query select v_norm, 'unavailable'::text, 'taken_or_blocked'::text;
    return;
  end if;
  return query select v_norm, 'available'::text, 'ok'::text;
end;
$$;

comment on function public.username_availability(text) is
  'Taken, tombstoned, and reserved all return unavailable. No holder identity.';

create or replace function public.resolve_username(p_raw text)
returns table (
  normalized text,
  account_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_norm text;
  v_status text;
begin
  select i.normalized, i.status
    into v_norm, v_status
    from public.username_inspect(p_raw) i;
  if v_status is distinct from 'ok' then
    return;
  end if;
  return query
    select r.normalized, r.account_id
      from public.username_registry r
     where r.normalized = v_norm
       and r.state = 'active'
       and r.account_id is not null;
end;
$$;

comment on function public.resolve_username(text) is
  'Active usernames only. Tombstoned, reserved, and unknown return no row.';

-- ---------------------------------------------------------------------------
-- Atomic claim
-- ---------------------------------------------------------------------------

create or replace function public.claim_username(p_raw text)
returns table (
  ok boolean,
  normalized text,
  error_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_norm text;
  v_status text;
  v_code text;
  v_current text;
  v_last_change timestamptz;
  v_changes integer;
  v_cooldown integer;
  v_cap integer;
begin
  if v_uid is null then
    return query select false, null::text, 'sign_in_required'::text;
    return;
  end if;

  select i.normalized, i.status, i.code
    into v_norm, v_status, v_code
    from public.username_inspect(p_raw) i;
  if v_status = 'invalid' then
    return query select false, v_norm, v_code;
    return;
  end if;

  select r.normalized
    into v_current
    from public.username_registry r
   where r.account_id = v_uid
     and r.state = 'active';

  if v_current is not null and v_current = v_norm then
    return query select true, v_norm, null::text;
    return;
  end if;

  if exists (
    select 1
      from public.username_registry r
     where r.normalized = v_norm
  ) then
    return query select false, v_norm, 'unavailable'::text;
    return;
  end if;

  if v_current is not null then
    select p.cooldown_days, p.max_changes_12m
      into v_cooldown, v_cap
      from public.username_policy() p;

    select max(r.released_at)
      into v_last_change
      from public.username_registry r
     where r.account_id = v_uid
       and r.release_reason = 'user_changed';

    if v_last_change is not null
       and v_last_change > now() - make_interval(days => v_cooldown) then
      return query select false, v_norm, 'cooldown'::text;
      return;
    end if;

    select count(*)::integer
      into v_changes
      from public.username_registry r
     where r.account_id = v_uid
       and r.release_reason = 'user_changed'
       and r.released_at > now() - interval '12 months';

    if coalesce(v_changes, 0) >= v_cap then
      return query select false, v_norm, 'change_limit'::text;
      return;
    end if;

    update public.username_registry
       set state = 'tombstoned',
           released_at = now(),
           release_reason = 'user_changed',
           updated_at = now()
     where account_id = v_uid
       and state = 'active';
  end if;

  insert into public.username_registry (
    normalized,
    display,
    state,
    account_id,
    claimed_at,
    updated_at
  ) values (
    v_norm,
    v_norm,
    'active',
    v_uid,
    now(),
    now()
  );

  perform set_config('story.allow_profile_privilege_write', '1', true);
  update public.profiles
     set username_normalized = v_norm
   where id = v_uid;

  return query select true, v_norm, null::text;
exception
  when unique_violation then
    return query select false, v_norm, 'unavailable'::text;
end;
$$;

comment on function public.claim_username(text) is
  'Atomic username claim. Initial claim is not a change. Old names stay tombstoned.';

-- ---------------------------------------------------------------------------
-- Account delete cannot erase history
-- ---------------------------------------------------------------------------

create or replace function public.username_tombstone_on_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.username_registry
     set state = 'tombstoned',
         released_at = coalesce(released_at, now()),
         release_reason = case
           when state = 'active' then 'account_deleted'
           else release_reason
         end,
         updated_at = now()
   where account_id = old.id
     and state = 'active';
  return old;
end;
$$;

drop trigger if exists username_tombstone_on_profile_delete on public.profiles;
create trigger username_tombstone_on_profile_delete
  before delete on public.profiles
  for each row
  execute function public.username_tombstone_on_profile_delete();

comment on function public.username_tombstone_on_profile_delete() is
  'Active usernames become indefinite tombstones before profile delete. Rows are not removed.';

-- ---------------------------------------------------------------------------
-- Audited admin hook — no UI, service_role only
-- ---------------------------------------------------------------------------

create or replace function public.admin_moderate_username(
  p_raw text,
  p_action text,
  p_account_id uuid,
  p_audit_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm text;
  v_status text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'admin_moderate_username requires service_role'
      using errcode = '42501';
  end if;
  if btrim(coalesce(p_audit_reason, '')) = '' then
    raise exception 'audit reason required';
  end if;
  if p_action not in ('suspend', 'reserve', 'recover', 'reassign') then
    raise exception 'unknown username admin action';
  end if;

  select i.normalized, i.status
    into v_norm, v_status
    from public.username_inspect(p_raw) i;
  if v_status is distinct from 'ok' then
    raise exception 'invalid username';
  end if;

  if p_action = 'suspend' then
    update public.username_registry
       set state = 'tombstoned',
           released_at = now(),
           release_reason = 'admin',
           reserved_kind = 'admin',
           updated_at = now()
     where normalized = v_norm
       and state = 'active';
    perform set_config('story.allow_profile_privilege_write', '1', true);
    update public.profiles
       set username_normalized = null
     where username_normalized = v_norm;
    return true;
  end if;

  if p_action = 'reserve' then
    insert into public.username_registry (
      normalized, display, state, reserved_kind, updated_at
    ) values (
      v_norm, v_norm, 'reserved', 'admin', now()
    )
    on conflict (normalized) do update
      set state = 'reserved',
          reserved_kind = 'admin',
          account_id = null,
          released_at = now(),
          release_reason = 'admin',
          updated_at = now();
    perform set_config('story.allow_profile_privilege_write', '1', true);
    update public.profiles
       set username_normalized = null
     where username_normalized = v_norm;
    return true;
  end if;

  if p_account_id is null then
    raise exception 'account required for recover/reassign';
  end if;

  if p_action = 'reassign' then
    update public.username_registry
       set state = 'tombstoned',
           released_at = now(),
           release_reason = 'admin',
           updated_at = now()
     where state = 'active'
       and account_id = p_account_id
       and normalized is distinct from v_norm;
  end if;

  insert into public.username_registry (
    normalized, display, state, account_id, claimed_at, reserved_kind, updated_at
  ) values (
    v_norm, v_norm, 'active', p_account_id, now(), 'admin', now()
  )
  on conflict (normalized) do update
    set state = 'active',
        display = excluded.display,
        account_id = excluded.account_id,
        claimed_at = now(),
        released_at = null,
        release_reason = null,
        reserved_kind = 'admin',
        updated_at = now();

  perform set_config('story.allow_profile_privilege_write', '1', true);
  update public.profiles
     set username_normalized = v_norm
   where id = p_account_id;
  return true;
end;
$$;

comment on function public.admin_moderate_username(text, text, uuid, text) is
  'Service-role audited suspend/reserve/recover/reassign. No client grant. No admin UI.';

-- ---------------------------------------------------------------------------
-- Privilege lock: username pointer is not client-writable
-- Keeps 0053 Story Pro / TREC / purpose locks. Adds username_normalized.
-- ---------------------------------------------------------------------------

create or replace function public.profiles_lock_privilege_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email_ok boolean := false;
  v_aal text := coalesce(auth.jwt() ->> 'aal', 'aal1');
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if current_setting('story.allow_profile_privilege_write', true) = '1' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.account_kind is distinct from old.account_kind then
      raise exception 'account_kind cannot be changed by the client';
    end if;
    if new.account_purpose is distinct from old.account_purpose then
      raise exception 'account_purpose cannot be changed by the client';
    end if;
    if new.legal_full_name is distinct from old.legal_full_name then
      raise exception 'legal_full_name cannot be changed by the client';
    end if;
    if new.trec_status is distinct from old.trec_status then
      raise exception 'trec_status cannot be changed by the client';
    end if;
    if new.trec_license is distinct from old.trec_license then
      raise exception 'trec_license cannot be changed by the client';
    end if;
    if new.license_number is distinct from old.license_number then
      raise exception 'license_number cannot be changed by the client';
    end if;
    if new.trec_verified_at is distinct from old.trec_verified_at then
      raise exception 'trec_verified_at cannot be changed by the client';
    end if;
    if new.verified_legal_name is distinct from old.verified_legal_name then
      raise exception 'verified_legal_name cannot be changed by the client';
    end if;
    if new.verified_license is distinct from old.verified_license then
      raise exception 'verified_license cannot be changed by the client';
    end if;
    if new.verified_purpose is distinct from old.verified_purpose then
      raise exception 'verified_purpose cannot be changed by the client';
    end if;
    if new.verified_account_kind is distinct from old.verified_account_kind then
      raise exception 'verified_account_kind cannot be changed by the client';
    end if;
    if new.brokerage_id is distinct from old.brokerage_id then
      raise exception 'brokerage_id cannot be changed by the client';
    end if;
    if new.team_leader_authorized is distinct from old.team_leader_authorized then
      raise exception 'team_leader_authorized cannot be changed by the client';
    end if;
    if new.professional_role is distinct from old.professional_role then
      raise exception 'professional_role cannot be changed by the client';
    end if;
    if new.forced_logout_at is distinct from old.forced_logout_at then
      raise exception 'forced_logout_at cannot be changed by the client';
    end if;
    if new.username_normalized is distinct from old.username_normalized then
      raise exception 'username cannot be changed by the client';
    end if;

    if new.specialties is distinct from old.specialties
      or new.service_areas is distinct from old.service_areas
      or new.languages is distinct from old.languages
      or new.designations is distinct from old.designations
      or new.primary_market_city is distinct from old.primary_market_city
    then
      if old.account_purpose not in (
        'individual_pro',
        'managing_broker',
        'other_professional'
      ) then
        raise exception 'Story Pro settings cannot be changed on this account.';
      end if;
      select u.email_confirmed_at is not null
        into v_email_ok
        from auth.users u
       where u.id = auth.uid();
      if coalesce(v_email_ok, false) is not true then
        raise exception 'Confirm your email and authenticator before Story Pro settings.';
      end if;
      if old.account_purpose in ('individual_pro', 'managing_broker')
        and v_aal is distinct from 'aal2'
      then
        raise exception 'Confirm your email and authenticator before Story Pro settings.';
      end if;
    end if;
  end if;
  if tg_op = 'INSERT' then
    if new.account_kind is distinct from 'consumer' then
      raise exception 'account_kind cannot be set by the client';
    end if;
    if new.account_purpose not in ('consumer', 'other_professional') then
      raise exception 'account_purpose cannot be set by the client';
    end if;
    if new.forced_logout_at is not null then
      raise exception 'forced_logout_at cannot be set by the client';
    end if;
    if new.username_normalized is not null then
      raise exception 'username cannot be set by the client';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.profiles_lock_privilege_columns() is
  'Privilege, Story Pro settings, and username pointer follow the account on file. Username is not authorization. View as buyer is not stored.';

drop trigger if exists profiles_lock_privilege_columns on public.profiles;
create trigger profiles_lock_privilege_columns
  before insert or update on public.profiles
  for each row
  execute function public.profiles_lock_privilege_columns();

-- ---------------------------------------------------------------------------
-- Execute grants
-- ---------------------------------------------------------------------------

revoke all on function public.username_policy() from public, anon;
revoke all on function public.username_inspect(text) from public, anon;
revoke all on function public.username_availability(text) from public, anon;
revoke all on function public.resolve_username(text) from public, anon;
revoke all on function public.claim_username(text) from public, anon;
revoke all on function public.admin_moderate_username(text, text, uuid, text)
  from public, anon, authenticated;
revoke all on function public.username_tombstone_on_profile_delete()
  from public, anon, authenticated;

grant execute on function public.username_policy() to authenticated, service_role;
grant execute on function public.username_inspect(text) to authenticated, service_role;
grant execute on function public.username_availability(text) to authenticated, service_role;
grant execute on function public.resolve_username(text) to authenticated, service_role;
grant execute on function public.claim_username(text) to authenticated, service_role;
grant execute on function public.admin_moderate_username(text, text, uuid, text)
  to service_role;
