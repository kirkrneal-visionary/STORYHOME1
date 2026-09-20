-- P1C-3A1: Professional ↔ Brokerage relationship history foundation.
-- Schema + invariants only. Does not wire invite/remove/create-office writes,
-- backfill profiles.brokerage_id, change Settings, or expose public history.

create table public.professional_brokerage_relationships (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles(id) on delete cascade,
  brokerage_id uuid not null references public.brokerages(id) on delete restrict,
  relationship_type text not null,
  status text not null,
  source text,
  effective_from timestamptz not null default now(),
  effective_end timestamptz,
  established_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint professional_brokerage_relationships_type_check
    check (relationship_type in ('sponsored_agent', 'managing_broker_of')),
  constraint professional_brokerage_relationships_status_check
    check (status in ('active', 'ended')),
  constraint professional_brokerage_relationships_source_check
    check (
      source is null
      or source in ('office_accept', 'create_office', 'office_remove', 'server')
    ),
  constraint professional_brokerage_relationships_window_check
    check (
      (status = 'active' and effective_end is null)
      or (status = 'ended' and effective_end is not null)
    )
);

create unique index professional_brokerage_relationships_one_active
  on public.professional_brokerage_relationships (professional_id)
  where status = 'active';

create index professional_brokerage_relationships_professional_id_idx
  on public.professional_brokerage_relationships (professional_id);

comment on table public.professional_brokerage_relationships is
  'Historical Professional brokerage membership. One active row per Professional. Does not replace profiles.brokerage_id.';

create or replace function public.enforce_realtor_brokerage_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'brokerage history requires service_role'
      using errcode = '42501';
  end if;
  if not exists (
    select 1
      from public.profiles p
     where p.id = new.professional_id
       and p.account_purpose in ('individual_pro', 'managing_broker')
  ) then
    raise exception 'brokerage history is realtor-only'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger professional_brokerage_relationships_realtor_only
  before insert or update on public.professional_brokerage_relationships
  for each row execute function public.enforce_realtor_brokerage_history();

alter table public.professional_brokerage_relationships enable row level security;
alter table public.professional_brokerage_relationships force row level security;

revoke all on table public.professional_brokerage_relationships
  from public, anon, authenticated;
grant all on table public.professional_brokerage_relationships to service_role;

revoke all on function public.enforce_realtor_brokerage_history()
  from public, anon, authenticated;
grant execute on function public.enforce_realtor_brokerage_history()
  to service_role;
