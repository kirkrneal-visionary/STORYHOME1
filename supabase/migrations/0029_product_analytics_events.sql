-- STORY-ANALYTICS-DESTINATION
-- First-party product usage events (Story OS catalog).
-- Privacy: scrubbed props only — no owner/address/passcode/message bodies.
-- Not seller listing_analytics_events. Not a dashboard product.

create table if not exists public.product_analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null,
  props jsonb not null default '{}'::jsonb,
  -- Optional actor when session present; never required for marketplace funnel.
  user_id uuid null references auth.users (id) on delete set null,
  client_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint product_analytics_events_name_len check (char_length(event_name) between 1 and 80)
);

create index if not exists product_analytics_events_name_created_idx
  on public.product_analytics_events (event_name, created_at desc);

create index if not exists product_analytics_events_created_idx
  on public.product_analytics_events (created_at desc);

comment on table public.product_analytics_events is
  'Story OS product usage events (catalog). Props are scrubbed enums/ids only — not CAD PII.';

alter table public.product_analytics_events enable row level security;

-- Insert: anon + authenticated may write (marketplace funnel includes logged-out).
-- No public SELECT — ops/service-role only. Prevents “who viewed what” theater.
drop policy if exists product_analytics_events_insert on public.product_analytics_events;
create policy product_analytics_events_insert
  on public.product_analytics_events
  for insert
  to anon, authenticated
  with check (true);

-- Authenticated users may read only their own rows (optional self-check; no cross-user).
drop policy if exists product_analytics_events_select_own on public.product_analytics_events;
create policy product_analytics_events_select_own
  on public.product_analytics_events
  for select
  to authenticated
  using (user_id is not null and user_id = auth.uid());
