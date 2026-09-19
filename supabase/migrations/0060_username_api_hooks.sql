-- P1A-2: delete-path tombstone hook + caller-only mutation state.
-- Does not change P1A-1 claim authority, reserved seed, or privilege lock.
-- Does NOT delete users, listings, or county/CAD.
-- No admin HTTP. No client DML on username_registry.

create or replace function public.tombstone_account_usernames(p_uid uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'tombstone_account_usernames requires service_role'
      using errcode = '42501';
  end if;
  if p_uid is null then
    return 0;
  end if;

  update public.username_registry
     set state = 'tombstoned',
         released_at = coalesce(released_at, now()),
         release_reason = case
           when state = 'active' then 'account_deleted'
           else release_reason
         end,
         updated_at = now()
   where account_id = p_uid
     and state = 'active';
  get diagnostics v_count = row_count;

  perform set_config('story.allow_profile_privilege_write', '1', true);
  update public.profiles
     set username_normalized = null
   where id = p_uid
     and username_normalized is not null;

  return v_count;
end;
$$;

comment on function public.tombstone_account_usernames(uuid) is
  'Service-role delete-path hook. Active usernames become indefinite tombstones. No client grant.';

create or replace function public.username_own_mutation_state()
returns table (
  active_normalized text,
  cooldown_until timestamptz,
  can_change boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_active text;
  v_last timestamptz;
  v_changes integer;
  v_cooldown integer;
  v_cap integer;
  v_until timestamptz;
begin
  if v_uid is null then
    return;
  end if;

  select p.cooldown_days, p.max_changes_12m
    into v_cooldown, v_cap
    from public.username_policy() p;

  select r.normalized
    into v_active
    from public.username_registry r
   where r.account_id = v_uid
     and r.state = 'active';

  select max(r.released_at)
    into v_last
    from public.username_registry r
   where r.account_id = v_uid
     and r.release_reason = 'user_changed';

  select count(*)::integer
    into v_changes
    from public.username_registry r
   where r.account_id = v_uid
     and r.release_reason = 'user_changed'
     and r.released_at > now() - interval '12 months';

  if v_last is not null then
    v_until := v_last + make_interval(days => v_cooldown);
    if v_until <= now() then
      v_until := null;
    end if;
  end if;

  return query
    select
      v_active,
      v_until,
      (v_active is null)
        or (
          v_until is null
          and coalesce(v_changes, 0) < v_cap
        );
end;
$$;

comment on function public.username_own_mutation_state() is
  'Caller-only cooldown/eligibility. Never returns another account or registry history.';

revoke all on function public.tombstone_account_usernames(uuid)
  from public, anon, authenticated;
revoke all on function public.username_own_mutation_state()
  from public, anon;

grant execute on function public.tombstone_account_usernames(uuid)
  to service_role;
grant execute on function public.username_own_mutation_state()
  to authenticated, service_role;
