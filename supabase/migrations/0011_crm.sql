-- ---------------------------------------------------------------------------
-- Wave D — CRM (Buyers/Sellers) + lead sources + activities + campaigns
--
-- Enriches the existing buyers/seller_clients tables for a real CRM (lead
-- source + contact info), and adds an activity log (notes/calls/tasks) and
-- trackable marketing campaigns (UTM link builder). All rows are owned by the
-- agent (agent_id = auth.uid()).
-- ---------------------------------------------------------------------------

alter table public.buyers add column if not exists source text;
alter table public.buyers add column if not exists source_campaign text;
alter table public.buyers add column if not exists email text;
alter table public.buyers add column if not exists phone text;
alter table public.buyers add column if not exists last_contacted_at timestamptz;

alter table public.seller_clients add column if not exists source text;
alter table public.seller_clients add column if not exists email text;
alter table public.seller_clients add column if not exists phone text;

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  subject_type text not null check (subject_type in ('buyer','seller')),
  subject_id uuid not null,
  kind text not null default 'note' check (kind in ('note','call','text','email','task')),
  body text not null default '',
  due_at timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists crm_activities_subject_idx
  on public.crm_activities (agent_id, subject_type, subject_id, created_at);

create table if not exists public.crm_campaigns (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  channel text not null default 'other'
    check (channel in ('google','facebook','instagram','zillow','referral','other')),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);
create index if not exists crm_campaigns_agent_idx on public.crm_campaigns (agent_id);

alter table public.crm_activities enable row level security;
alter table public.crm_campaigns  enable row level security;

drop policy if exists crm_activities_all_own on public.crm_activities;
create policy crm_activities_all_own on public.crm_activities
  for all to authenticated
  using (agent_id = auth.uid()) with check (agent_id = auth.uid());

drop policy if exists crm_campaigns_all_own on public.crm_campaigns;
create policy crm_campaigns_all_own on public.crm_campaigns
  for all to authenticated
  using (agent_id = auth.uid()) with check (agent_id = auth.uid());

grant select, insert, update, delete on public.crm_activities to authenticated;
grant select, insert, update, delete on public.crm_campaigns  to authenticated;
grant select, insert, update, delete on public.crm_activities to service_role;
grant select, insert, update, delete on public.crm_campaigns  to service_role;
