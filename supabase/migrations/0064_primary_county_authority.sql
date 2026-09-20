-- P1C-1B: Primary County request + Story Home/server decision. Does not edit 0063.

create unique index if not exists professional_primary_counties_one_requested
  on public.professional_primary_counties (professional_id)
  where status = 'requested';

create or replace function public.primary_county_own_state(p_uid uuid)
returns table (
  effective_county_fips text,
  pending_county_fips text,
  request_status text,
  requested_at timestamptz,
  decided_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
declare
  e public.professional_primary_counties%rowtype;
  p public.professional_primary_counties%rowtype;
  r public.professional_primary_counties%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'primary_county_own_state requires service_role' using errcode = '42501';
  end if;
  select * into e from public.professional_primary_counties
   where professional_id = p_uid and status = 'effective';
  select * into p from public.professional_primary_counties
   where professional_id = p_uid and status = 'requested';
  select * into r from public.professional_primary_counties
   where professional_id = p_uid and status = 'rejected'
   order by decided_at desc nulls last limit 1;
  if p.id is not null then
    return query select e.effective_county_fips, p.requested_county_fips, 'requested'::text, p.requested_at, null::timestamptz;
  elsif e.id is not null then
    return query select e.effective_county_fips, null::text, 'effective'::text, e.requested_at, e.decided_at;
  elsif r.id is not null then
    return query select null::text, null::text, 'rejected'::text, r.requested_at, r.decided_at;
  else
    return query select null::text, null::text, 'not_set'::text, null::timestamptz, null::timestamptz;
  end if;
end;
$$;

create or replace function public.request_primary_county(p_uid uuid, p_fips text)
returns table (ok boolean, error_code text)
language plpgsql security definer set search_path = public as $$
declare
  pending public.professional_primary_counties%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'request_primary_county requires service_role' using errcode = '42501';
  end if;
  if p_uid is null then return query select false, 'sign_in_required'::text; return; end if;
  if not public.is_professional_launch_county_fips(p_fips) then
    return query select false, 'invalid_county'::text; return;
  end if;
  if not exists (
    select 1 from public.profiles x
     where x.id = p_uid and x.account_purpose in ('individual_pro', 'managing_broker')
  ) then
    return query select false, 'not_eligible'::text; return;
  end if;
  perform 1 from public.profiles where id = p_uid for update;
  select * into pending from public.professional_primary_counties
   where professional_id = p_uid and status = 'requested' for update;
  if pending.id is not null then
    if pending.requested_county_fips = p_fips then
      return query select true, null::text; return;
    end if;
    update public.professional_primary_counties
       set status = 'rejected', decided_at = now(), evidence_kind = 'replaced_pending'
     where id = pending.id;
  end if;
  insert into public.professional_primary_counties (
    professional_id, requested_county_fips, status, evidence_kind
  ) values (p_uid, p_fips, 'requested', 'professional_request');
  return query select true, null::text;
exception
  when unique_violation then
    select * into pending from public.professional_primary_counties
     where professional_id = p_uid and status = 'requested';
    if pending.requested_county_fips = p_fips then
      return query select true, null::text;
    end if;
    return query select false, 'conflict'::text;
end;
$$;

create or replace function public.decide_primary_county(p_request_id uuid, p_decision text)
returns table (ok boolean, error_code text)
language plpgsql security definer set search_path = public as $$
declare
  req public.professional_primary_counties%rowtype;
  old_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'decide_primary_county requires service_role' using errcode = '42501';
  end if;
  if p_decision is distinct from 'approve' and p_decision is distinct from 'reject' then
    return query select false, 'bad_decision'::text; return;
  end if;
  select * into req from public.professional_primary_counties where id = p_request_id for update;
  if req.id is null then return query select false, 'not_found'::text; return; end if;
  if req.status is distinct from 'requested' then
    return query select false, 'not_pending'::text; return;
  end if;
  if not exists (
    select 1 from public.profiles x
     where x.id = req.professional_id
       and x.account_purpose in ('individual_pro', 'managing_broker')
  ) then
    return query select false, 'not_eligible'::text; return;
  end if;
  if not public.is_professional_launch_county_fips(req.requested_county_fips) then
    return query select false, 'invalid_county'::text; return;
  end if;
  if p_decision = 'reject' then
    update public.professional_primary_counties
       set status = 'rejected', decided_at = now(), evidence_kind = 'story_home_server'
     where id = req.id;
    return query select true, null::text; return;
  end if;
  select id into old_id from public.professional_primary_counties
   where professional_id = req.professional_id and status = 'effective' for update;
  if old_id is not null then
    update public.professional_primary_counties
       set status = 'superseded', effective_to = now()
     where id = old_id;
  end if;
  update public.professional_primary_counties
     set status = 'effective',
         effective_county_fips = req.requested_county_fips,
         effective_from = now(),
         decided_at = now(),
         evidence_kind = 'story_home_server',
         supersedes_id = old_id
   where id = req.id;
  return query select true, null::text;
end;
$$;

revoke all on function public.request_primary_county(uuid, text) from public, anon, authenticated;
revoke all on function public.decide_primary_county(uuid, text) from public, anon, authenticated;
revoke all on function public.primary_county_own_state(uuid) from public, anon, authenticated;
grant execute on function public.request_primary_county(uuid, text) to service_role;
grant execute on function public.decide_primary_county(uuid, text) to service_role;
grant execute on function public.primary_county_own_state(uuid) to service_role;
