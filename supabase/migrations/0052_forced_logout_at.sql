-- Sign out everywhere stamps the account so other devices can notice.
-- TREC still cannot grant office. Does NOT delete users, listings, or county/CAD.

alter table public.profiles
  add column if not exists forced_logout_at timestamptz;

comment on column public.profiles.forced_logout_at is
  'Sessions issued before this time must sign out.';

create or replace function public.profiles_lock_privilege_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
  end if;
  return new;
end;
$$;

create or replace function public.stamp_forced_logout()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  v_at := now();
  perform set_config('story.allow_profile_privilege_write', '1', true);
  update public.profiles
     set forced_logout_at = v_at
   where id = auth.uid();
  return v_at;
end;
$$;

create or replace function public.my_forced_logout_at()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select forced_logout_at
    from public.profiles
   where id = auth.uid();
$$;

comment on function public.stamp_forced_logout() is
  'Marks this account signed out everywhere. Other devices must drop that login.';

grant execute on function public.stamp_forced_logout() to authenticated;
grant execute on function public.my_forced_logout_at() to authenticated;
revoke execute on function public.stamp_forced_logout() from public, anon;
revoke execute on function public.my_forced_logout_at() from public, anon;
