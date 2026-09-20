-- P1C-1A: Professional geography foundation.
-- Storage + launch-FIPS + realtor gate only. No RPCs, Settings, backfill, or Wave A change.
-- Absence of a Primary County row means not set.

create or replace function public.is_professional_launch_county_fips(p_fips text)
returns boolean
language sql
immutable
parallel safe
set search_path = public
as $$
  select p_fips in ('48373','48455','48005','48457','48407','48291','48471');
$$;

comment on function public.is_professional_launch_county_fips(text) is
  'V1 Professional geography: Story Home launch-seven FIPS only. Not county-name authority.';

revoke all on function public.is_professional_launch_county_fips(text)
  from public, anon, authenticated;
grant execute on function public.is_professional_launch_county_fips(text)
  to service_role;

create table public.professional_primary_counties (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles(id) on delete cascade,
  requested_county_fips text not null,
  effective_county_fips text,
  status text not null,
  evidence_kind text,
  requested_at timestamptz not null default now(),
  effective_from timestamptz,
  effective_to timestamptz,
  decided_at timestamptz,
  decided_by uuid,
  supersedes_id uuid references public.professional_primary_counties(id),
  created_at timestamptz not null default now(),
  constraint professional_primary_counties_status_check
    check (status in ('requested', 'effective', 'rejected', 'superseded')),
  constraint professional_primary_counties_requested_fips_check
    check (public.is_professional_launch_county_fips(requested_county_fips)),
  constraint professional_primary_counties_effective_fips_check
    check (
      effective_county_fips is null
      or public.is_professional_launch_county_fips(effective_county_fips)
    ),
  constraint professional_primary_counties_state_shape_check
    check (
      (status = 'requested' and effective_county_fips is null)
      or (status = 'effective' and effective_county_fips is not null)
      or (status = 'rejected' and effective_county_fips is null)
      or (status = 'superseded' and effective_county_fips is not null)
    )
);

create unique index professional_primary_counties_one_effective
  on public.professional_primary_counties (professional_id)
  where status = 'effective';

create index professional_primary_counties_professional_id_idx
  on public.professional_primary_counties (professional_id);

comment on table public.professional_primary_counties is
  'Primary County history. One effective row per eligible Professional. Does not grant Story, Opportunity, brokerage, TREC, or Office authority.';

create table public.professional_service_counties (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles(id) on delete cascade,
  county_fips text not null,
  status text not null,
  source text,
  effective_from timestamptz,
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  constraint professional_service_counties_status_check
    check (status in ('current', 'ended')),
  constraint professional_service_counties_fips_check
    check (public.is_professional_launch_county_fips(county_fips)),
  constraint professional_service_counties_window_check
    check (
      (status = 'current' and effective_to is null)
      or (status = 'ended' and effective_to is not null)
    )
);

create unique index professional_service_counties_one_current
  on public.professional_service_counties (professional_id, county_fips)
  where status = 'current';

create index professional_service_counties_professional_id_idx
  on public.professional_service_counties (professional_id);

comment on table public.professional_service_counties is
  'Structured Service Counties (FIPS only). Does not grant Primary County, Story, Opportunity, brokerage, TREC, or Office authority.';

create or replace function public.enforce_realtor_geography()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'professional geography requires service_role'
      using errcode = '42501';
  end if;
  if not exists (
    select 1
      from public.profiles p
     where p.id = new.professional_id
       and p.account_purpose in ('individual_pro', 'managing_broker')
  ) then
    raise exception 'professional geography is realtor-only'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger professional_primary_counties_realtor_only
  before insert or update on public.professional_primary_counties
  for each row execute function public.enforce_realtor_geography();

create trigger professional_service_counties_realtor_only
  before insert or update on public.professional_service_counties
  for each row execute function public.enforce_realtor_geography();

alter table public.professional_primary_counties enable row level security;
alter table public.professional_primary_counties force row level security;
alter table public.professional_service_counties enable row level security;
alter table public.professional_service_counties force row level security;

revoke all on table public.professional_primary_counties
  from public, anon, authenticated;
revoke all on table public.professional_service_counties
  from public, anon, authenticated;
grant all on table public.professional_primary_counties to service_role;
grant all on table public.professional_service_counties to service_role;

revoke all on function public.enforce_realtor_geography()
  from public, anon, authenticated;
grant execute on function public.enforce_realtor_geography()
  to service_role;
