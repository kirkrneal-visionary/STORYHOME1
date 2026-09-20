-- P1C-5A: close two confirmed authority defects. No new product.

create or replace function public.accept_brokerage_invite(p_brokerage uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_lic text; v_purpose text;
begin
  select trec_license, account_purpose into v_lic, v_purpose
    from public.profiles where id = auth.uid();
  if v_lic is null then return false; end if;
  if v_purpose is distinct from 'individual_pro'
     and v_purpose is distinct from 'managing_broker' then
    return false;
  end if;
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

create or replace function public.create_managed_brokerage(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := nullif(btrim(p_name), '');
  v_ptr uuid;
begin
  if not public.is_managing_broker(auth.uid()) then
    raise exception 'Managing broker required';
  end if;
  if v_name is null then
    raise exception 'Name required';
  end if;
  select brokerage_id into v_ptr from public.profiles where id = auth.uid() for update;
  if v_ptr is not null
     or exists (
       select 1 from public.professional_brokerage_relationships
        where professional_id = auth.uid() and status = 'active'
     ) then
    raise exception 'Current brokerage already set';
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

revoke all on function public.accept_brokerage_invite(uuid) from public, anon;
revoke all on function public.create_managed_brokerage(text) from public, anon;
grant execute on function public.accept_brokerage_invite(uuid) to authenticated;
grant execute on function public.create_managed_brokerage(text) to authenticated;
