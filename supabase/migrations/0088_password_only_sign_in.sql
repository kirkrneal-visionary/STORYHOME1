-- Sign-in is email + password only (2026-11-25).
-- 1. Story Pro settings keep the confirmed-email lock but no longer need an
--    authenticator session (aal2). Everything else matches 0058.
-- 2. Saved authenticators are removed. Supabase Auth refuses password and
--    email changes for an account that still has one unless that session
--    entered a code, and the app no longer asks for codes.
-- Run after the password-only app is live, or the old app asks Pros to set up
-- an authenticator again.

create or replace function public.profiles_lock_privilege_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email_ok boolean := false;
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
        raise exception 'Confirm your email before Story Pro settings.';
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
  'Privilege, Story Pro settings, and username pointer follow the account on file. Username is not authorization. View as buyer is not stored. No authenticator level is checked.';

-- Removing authenticators signs no one out. The next sign-in asks for the
-- password only. The row below says whether any other aal rule remains.
with removed as (
  delete from auth.mfa_factors
  returning user_id
)
select
  (select count(distinct user_id) from removed) as accounts_cleared,
  case
    when exists (
      select 1
        from pg_policies
       where coalesce(qual, '') ilike '%''aal''%'
          or coalesce(with_check, '') ilike '%''aal''%'
    )
    or exists (
      select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.prosrc ilike '%''aal''%'
    )
    then 'done - another 2FA rule is still in the database, tell the agent'
    else 'done'
  end as status;
