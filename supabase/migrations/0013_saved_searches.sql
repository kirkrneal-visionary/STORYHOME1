-- ---------------------------------------------------------------------------
-- Wave F — Saved searches (marketplace)
--
-- Lets a signed-in user save their current marketplace filter set and re-apply
-- it later (the HAR "Save Search" button). Owner-only. In-app for now; email
-- alerts can layer on later without schema changes.
-- ---------------------------------------------------------------------------

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists saved_searches_user_idx on public.saved_searches (user_id, created_at);

alter table public.saved_searches enable row level security;

drop policy if exists saved_searches_all_own on public.saved_searches;
create policy saved_searches_all_own on public.saved_searches
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.saved_searches to authenticated;
grant select, insert, update, delete on public.saved_searches to service_role;
