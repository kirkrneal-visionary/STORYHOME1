-- P1C-2A: structured Service County SET/read. Does not edit 0063/0064.

create or replace function public.service_counties_own_state(p_uid uuid)
returns table (county_fips text[])
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service_counties_own_state requires service_role' using errcode = '42501';
  end if;
  return query
    select coalesce(array_agg(s.county_fips order by s.county_fips), '{}')
      from public.professional_service_counties s
     where s.professional_id = p_uid and s.status = 'current';
end;
$$;

create or replace function public.set_service_counties(p_uid uuid, p_fips text[])
returns table (ok boolean, error_code text, county_fips text[])
language plpgsql security definer set search_path = public as $$
declare
  wanted text[];
  current text[];
  fips text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'set_service_counties requires service_role' using errcode = '42501';
  end if;
  if p_uid is null then
    return query select false, 'sign_in_required'::text, '{}'::text[]; return;
  end if;
  if not exists (
    select 1 from public.profiles x
     where x.id = p_uid and x.account_purpose in ('individual_pro', 'managing_broker')
  ) then
    return query select false, 'not_eligible'::text, '{}'::text[]; return;
  end if;

  select coalesce(array_agg(distinct x order by x), '{}')
    into wanted
    from unnest(coalesce(p_fips, '{}')) as x;
  foreach fips in array wanted loop
    if not public.is_professional_launch_county_fips(fips) then
      return query select false, 'invalid_county'::text, '{}'::text[]; return;
    end if;
  end loop;

  perform 1 from public.profiles where id = p_uid for update;
  perform 1 from public.professional_service_counties
   where professional_id = p_uid and status = 'current' for update;
  select coalesce(array_agg(s.county_fips order by s.county_fips), '{}')
    into current
    from public.professional_service_counties s
   where s.professional_id = p_uid and s.status = 'current';
  if current = wanted then
    return query select true, null::text, current; return;
  end if;

  update public.professional_service_counties s
     set status = 'ended', effective_to = now()
   where s.professional_id = p_uid
     and s.status = 'current'
     and not (s.county_fips = any (wanted));

  foreach fips in array wanted loop
    if not (fips = any (current)) then
      insert into public.professional_service_counties (
        professional_id, county_fips, status, source, effective_from
      ) values (p_uid, fips, 'current', 'professional_set', now());
    end if;
  end loop;

  return query select true, null::text, o.county_fips
    from public.service_counties_own_state(p_uid) o;
end;
$$;

revoke all on function public.service_counties_own_state(uuid) from public, anon, authenticated;
revoke all on function public.set_service_counties(uuid, text[]) from public, anon, authenticated;
grant execute on function public.service_counties_own_state(uuid) to service_role;
grant execute on function public.set_service_counties(uuid, text[]) to service_role;
