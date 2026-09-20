-- P1C-3A2: wire existing invite/remove/create-office writes to 0066 history.
-- Does not edit 0048/0066, backfill pointers, change Open Office, or add a new API.

create or replace function public.sync_brokerage_relationship(
  p_uid uuid,
  p_bid uuid,
  p_type text,
  p_source text,
  p_by uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := current_setting('request.jwt.claim.role', true);
  v_purpose text;
  v_active public.professional_brokerage_relationships%rowtype;
  v_now timestamptz := now();
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  select account_purpose into v_purpose from public.profiles where id = p_uid for update;
  if v_purpose is distinct from 'individual_pro'
     and v_purpose is distinct from 'managing_broker' then
    perform set_config('request.jwt.claim.role', coalesce(v_role, ''), true);
    return;
  end if;
  select * into v_active
    from public.professional_brokerage_relationships
   where professional_id = p_uid and status = 'active'
   for update;
  if p_bid is null then
    if found then
      update public.professional_brokerage_relationships
         set status = 'ended', effective_end = v_now
       where id = v_active.id;
    end if;
    perform set_config('request.jwt.claim.role', coalesce(v_role, ''), true);
    return;
  end if;
  if found
     and v_active.brokerage_id = p_bid
     and v_active.relationship_type = p_type then
    perform set_config('request.jwt.claim.role', coalesce(v_role, ''), true);
    return;
  end if;
  if found then
    update public.professional_brokerage_relationships
       set status = 'ended', effective_end = v_now
     where id = v_active.id;
  end if;
  insert into public.professional_brokerage_relationships (
    professional_id, brokerage_id, relationship_type, status, source,
    effective_from, established_by
  ) values (p_uid, p_bid, p_type, 'active', p_source, v_now, p_by);
  perform set_config('request.jwt.claim.role', coalesce(v_role, ''), true);
end;
$$;

revoke all on function public.sync_brokerage_relationship(uuid, uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.sync_brokerage_relationship(uuid, uuid, text, text, uuid)
  to service_role;

create or replace function public.accept_brokerage_invite(p_brokerage uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_lic text;
begin
  select trec_license into v_lic from public.profiles where id = auth.uid();
  if v_lic is null then return false; end if;
  if not exists (
    select 1 from public.brokerage_invites bi
    where bi.brokerage_id = p_brokerage
      and bi.agent_license = v_lic
      and bi.status = 'active'
  ) then
    return false;
  end if;
  perform set_config('story.allow_profile_privilege_write', '1', true);
  perform public.sync_brokerage_relationship(
    auth.uid(), p_brokerage, 'sponsored_agent', 'office_accept', auth.uid());
  update public.profiles set brokerage_id = p_brokerage where id = auth.uid();
  update public.brokerage_invites set status = 'accepted'
    where brokerage_id = p_brokerage and agent_license = v_lic;
  return true;
end;
$$;

create or replace function public.remove_agent_from_brokerage(p_agent uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_brok uuid; v_lic text;
begin
  if not public.is_managing_broker(auth.uid()) then return false; end if;
  select brokerage_id into v_brok from public.profiles where id = p_agent for update;
  if v_brok is null then return false; end if;
  if not public.is_broker_of(v_brok, auth.uid()) then return false; end if;
  select trec_license into v_lic from public.profiles where id = p_agent;
  perform set_config('story.allow_profile_privilege_write', '1', true);
  perform public.sync_brokerage_relationship(p_agent, null, null, null, auth.uid());
  update public.profiles set brokerage_id = null where id = p_agent;
  update public.brokerage_invites set status = 'removed'
    where brokerage_id = v_brok and agent_license = v_lic;
  return true;
end;
$$;

create or replace function public.create_managed_brokerage(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := nullif(btrim(p_name), '');
begin
  if not public.is_managing_broker(auth.uid()) then
    raise exception 'Managing broker required';
  end if;
  if v_name is null then
    raise exception 'Name required';
  end if;
  insert into public.brokerages (name, broker_id, slug)
  values (
    v_name,
    auth.uid(),
    trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'))
  )
  returning id into v_id;
  perform set_config('story.allow_profile_privilege_write', '1', true);
  perform public.sync_brokerage_relationship(
    auth.uid(), v_id, 'managing_broker_of', 'create_office', auth.uid());
  update public.profiles set brokerage_id = v_id where id = auth.uid();
  return v_id;
end;
$$;

grant execute on function public.accept_brokerage_invite(uuid) to authenticated;
grant execute on function public.remove_agent_from_brokerage(uuid) to authenticated;
grant execute on function public.create_managed_brokerage(text) to authenticated;
revoke execute on function public.sync_brokerage_relationship(uuid, uuid, text, text, uuid)
  from public, anon, authenticated;
