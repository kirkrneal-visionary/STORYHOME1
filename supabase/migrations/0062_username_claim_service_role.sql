-- P1A security correction: claim_username is no longer a browser PostgREST RPC.
-- 0058–0061 stay unchanged (reviewed, unpublished, treated as immutable).
-- Ordinary mutation path remains:
--   Browser → POST /api/account/username/claim → auth → MFA step-up →
--   rate limit → service_role claim_username(p_uid, p_raw).
-- Transaction logic stays in the database.

create or replace function public.claim_username(p_uid uuid, p_raw text)
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
  v_uid uuid := p_uid;
  v_norm text;
  v_status text;
  v_code text;
  v_current text;
  v_last_change timestamptz;
  v_changes integer;
  v_cooldown integer;
  v_cap integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'claim_username requires service_role'
      using errcode = '42501';
  end if;

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

comment on function public.claim_username(uuid, text) is
  'Service-role username claim. Ordinary clients use POST /api/account/username/claim. Transaction stays in the database.';

-- Remove the 0058 one-argument form so authenticated PostgREST cannot call it.
drop function if exists public.claim_username(text);

revoke all on function public.claim_username(uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_username(uuid, text)
  to service_role;
