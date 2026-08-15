-- STORY-WALK SW-5 — Agent World engagement (agent-owned, honest)
-- Separate from product_analytics_events (ops catalog; no agent SELECT).
-- Guests: no visitor_user_id (session visits only — no permanent fingerprint).

create table if not exists public.agent_world_engagement (
  id bigint generated always as identity primary key,
  agent_id text not null,
  event_name text not null,
  audience text not null
    check (audience in ('guest', 'account', 'own')),
  -- Account visitors only. Never invent a guest fingerprint id.
  visitor_user_id text null,
  cta text null
    check (
      cta is null
      or cta in ('listings', 'inventory', 'find_agents')
    ),
  created_at timestamptz not null default now(),
  constraint agent_world_engagement_event_len
    check (char_length(event_name) between 1 and 64)
);

create index if not exists agent_world_engagement_agent_created_idx
  on public.agent_world_engagement (agent_id, created_at desc);

create index if not exists agent_world_engagement_agent_event_idx
  on public.agent_world_engagement (agent_id, event_name);

comment on table public.agent_world_engagement is
  'Story Walk Agent World engagement for the owning agent. Guest rows never carry a durable visitor id.';

alter table public.agent_world_engagement enable row level security;

drop policy if exists agent_world_engagement_insert on public.agent_world_engagement;
create policy agent_world_engagement_insert
  on public.agent_world_engagement
  for insert
  to anon, authenticated
  with check (
    audience in ('guest', 'account', 'own')
    and (
      (audience = 'guest' and visitor_user_id is null)
      or (audience in ('account', 'own'))
    )
  );

-- Owning agent reads their own world only.
drop policy if exists agent_world_engagement_select_owner on public.agent_world_engagement;
create policy agent_world_engagement_select_owner
  on public.agent_world_engagement
  for select
  to authenticated
  using (agent_id = auth.uid()::text);
