-- P1C-4A: current Professional availability preference only.
-- Absence means not configured. No backfill, Settings, inactivity, or Opportunities.

create table public.professional_operational_state (
  professional_id uuid primary key references public.profiles(id) on delete cascade,
  availability text not null,
  updated_at timestamptz not null default now(),
  updated_source text not null default 'professional_set',
  constraint professional_operational_state_availability_check
    check (availability in ('available', 'temporarily_unavailable')),
  constraint professional_operational_state_source_check
    check (updated_source in ('professional_set'))
);

comment on table public.professional_operational_state is
  'Current Realtor work-receipt preference. Not eligibility. No row means not configured.';

create or replace function public.enforce_realtor_operational_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'operational state requires service_role' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles p
     where p.id = new.professional_id
       and p.account_purpose in ('individual_pro', 'managing_broker')
  ) then
    raise exception 'operational state is realtor-only' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger professional_operational_state_realtor_only
  before insert or update on public.professional_operational_state
  for each row execute function public.enforce_realtor_operational_state();

alter table public.professional_operational_state enable row level security;
alter table public.professional_operational_state force row level security;
revoke all on table public.professional_operational_state from public, anon, authenticated;
grant all on table public.professional_operational_state to service_role;
revoke all on function public.enforce_realtor_operational_state() from public, anon, authenticated;
grant execute on function public.enforce_realtor_operational_state() to service_role;

create or replace function public.operational_state_own(p_uid uuid)
returns table (availability text, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'operational_state_own requires service_role' using errcode = '42501';
  end if;
  return query
  select s.availability, s.updated_at
    from public.professional_operational_state s
   where s.professional_id = p_uid;
end;
$$;

create or replace function public.set_operational_availability(p_uid uuid, p_availability text)
returns table (ok boolean, error_code text, availability text, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  current text;
  at timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'set_operational_availability requires service_role' using errcode = '42501';
  end if;
  if p_uid is null then
    return query select false, 'sign_in_required'::text, null::text, null::timestamptz; return;
  end if;
  if not exists (
    select 1 from public.profiles x
     where x.id = p_uid and x.account_purpose in ('individual_pro', 'managing_broker')
  ) then
    return query select false, 'not_eligible'::text, null::text, null::timestamptz; return;
  end if;
  if p_availability is distinct from 'available'
     and p_availability is distinct from 'temporarily_unavailable' then
    return query select false, 'invalid_availability'::text, null::text, null::timestamptz; return;
  end if;
  perform 1 from public.profiles where id = p_uid for update;
  select s.availability, s.updated_at into current, at
    from public.professional_operational_state s
   where s.professional_id = p_uid for update;
  if current is not distinct from p_availability then
    return query select true, null::text, current, at; return;
  end if;
  insert into public.professional_operational_state (
    professional_id, availability, updated_at, updated_source
  ) values (p_uid, p_availability, now(), 'professional_set')
  on conflict (professional_id) do update
    set availability = excluded.availability,
        updated_at = now(),
        updated_source = 'professional_set';
  return query select true, null::text, o.availability, o.updated_at
    from public.operational_state_own(p_uid) o;
end;
$$;

revoke all on function public.operational_state_own(uuid) from public, anon, authenticated;
revoke all on function public.set_operational_availability(uuid, text) from public, anon, authenticated;
grant execute on function public.operational_state_own(uuid) to service_role;
grant execute on function public.set_operational_availability(uuid, text) to service_role;
