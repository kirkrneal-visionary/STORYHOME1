-- ---------------------------------------------------------------------------
-- Wave A — Brokerage Roster & Sponsorship
--
-- A broker manages their agent roster. Agents can only be attached when TREC
-- confirms the agent is actually SPONSORED by that broker (verified in the app
-- against the TREC dataset before an invite is created). Joining/removal is done
-- through SECURITY DEFINER functions so the rules can't be bypassed by editing
-- another user's profile directly.
-- ---------------------------------------------------------------------------

create table if not exists public.brokerage_invites (
  id uuid primary key default gen_random_uuid(),
  brokerage_id uuid not null references public.brokerages(id) on delete cascade,
  agent_license text not null,               -- canonical TREC license (e.g. 724479-SA)
  agent_name text,
  invited_by uuid references public.profiles(id) on delete set null,
  status text not null default 'active'
    check (status in ('active','accepted','removed')),
  created_at timestamptz not null default now(),
  unique (brokerage_id, agent_license)
);
create index if not exists brokerage_invites_license_idx
  on public.brokerage_invites (agent_license, status);

alter table public.brokerage_invites enable row level security;

-- Broker of record manages invites for their brokerage.
drop policy if exists invites_broker_all on public.brokerage_invites;
create policy invites_broker_all on public.brokerage_invites
  for all to authenticated
  using (public.is_broker_of(brokerage_id, auth.uid()))
  with check (public.is_broker_of(brokerage_id, auth.uid()));

-- An agent may read invites addressed to their own license.
drop policy if exists invites_agent_read on public.brokerage_invites;
create policy invites_agent_read on public.brokerage_invites
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.trec_license = brokerage_invites.agent_license
    )
  );

grant select, insert, update, delete on public.brokerage_invites to authenticated;

-- Agent accepts: link own profile to the brokerage only if an active invite
-- matches the caller's verified TREC license.
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
  update public.profiles set brokerage_id = p_brokerage where id = auth.uid();
  update public.brokerage_invites set status = 'accepted'
    where brokerage_id = p_brokerage and agent_license = v_lic;
  return true;
end;
$$;
grant execute on function public.accept_brokerage_invite(uuid) to authenticated;

-- Broker removes an agent from their brokerage.
create or replace function public.remove_agent_from_brokerage(p_agent uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_brok uuid; v_lic text;
begin
  select brokerage_id into v_brok from public.profiles where id = p_agent;
  if v_brok is null then return false; end if;
  if not public.is_broker_of(v_brok, auth.uid()) then return false; end if;
  select trec_license into v_lic from public.profiles where id = p_agent;
  update public.profiles set brokerage_id = null where id = p_agent;
  update public.brokerage_invites set status = 'removed'
    where brokerage_id = v_brok and agent_license = v_lic;
  return true;
end;
$$;
grant execute on function public.remove_agent_from_brokerage(uuid) to authenticated;
