-- Story Home — Consumer "My Home" homeowner data vault (CARFAX-for-homes).
-- Private by default; a homeowner explicitly grants a specific realtor access to
-- a specific home, revocable anytime. Enforced by RLS, not just the UI.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.homes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  nickname text not null default 'My Home',
  address text not null default '',
  city text not null default '',
  county_name text not null default '',
  state text not null default 'TX',
  zip text not null default '',
  beds int,
  baths numeric(3,1),
  sqft int,
  year_built int,
  property_type text,
  purchase_date date,
  purchase_price numeric(12,2),
  photo_url text,
  created_at timestamptz not null default now()
);
create index if not exists homes_owner_idx on public.homes (owner_id);

create table if not exists public.home_records (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  occurred_on date not null default current_date,
  category text not null default 'Other',
  title text not null,
  description text,
  cost numeric(12,2) not null default 0,
  contractor text,
  warranty_until date,
  is_capital_improvement boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists home_records_home_idx on public.home_records (home_id);

create table if not exists public.home_expenses (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  spent_on date not null default current_date,
  category text not null default 'Other',
  vendor text,
  amount numeric(12,2) not null default 0,
  tax_year int,
  is_capital_improvement boolean not null default false,
  receipt_document_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists home_expenses_home_idx on public.home_expenses (home_id);

create table if not exists public.home_documents (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  doc_type text not null default 'other'
    check (doc_type in ('tax','insurance','warranty','receipt','deed','other')),
  title text not null,
  file_path text,
  created_at timestamptz not null default now()
);
create index if not exists home_documents_home_idx on public.home_documents (home_id);

-- Explicit, revocable, per-home consent to a specific realtor.
create table if not exists public.home_access_grants (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  grantee_agent_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null default 'full' check (scope in ('full','report')),
  status text not null default 'active' check (status in ('active','revoked')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (home_id, grantee_agent_id)
);
create index if not exists home_grants_grantee_idx on public.home_access_grants (grantee_agent_id, status);

-- ---------------------------------------------------------------------------
-- Access helper (SECURITY DEFINER to avoid recursive policy evaluation)
-- ---------------------------------------------------------------------------

create or replace function public.has_home_access(
  p_home uuid,
  p_uid uuid,
  p_need_full boolean
)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.home_access_grants g
    where g.home_id = p_home
      and g.grantee_agent_id = p_uid
      and g.status = 'active'
      and (not p_need_full or g.scope = 'full')
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.homes               enable row level security;
alter table public.home_records        enable row level security;
alter table public.home_expenses       enable row level security;
alter table public.home_documents      enable row level security;
alter table public.home_access_grants  enable row level security;

-- homes: owner full; granted realtor may read (any active grant)
create policy homes_select on public.homes
  for select to authenticated
  using (owner_id = auth.uid() or public.has_home_access(id, auth.uid(), false));
create policy homes_insert on public.homes
  for insert to authenticated with check (owner_id = auth.uid());
create policy homes_update on public.homes
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy homes_delete on public.homes
  for delete to authenticated using (owner_id = auth.uid());

-- records (home history): owner full; granted realtor read on ANY active grant
create policy home_records_select on public.home_records
  for select to authenticated
  using (owner_id = auth.uid() or public.has_home_access(home_id, auth.uid(), false));
create policy home_records_write on public.home_records
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid())
  );

-- expenses: owner full; granted realtor read ONLY with full scope
create policy home_expenses_select on public.home_expenses
  for select to authenticated
  using (owner_id = auth.uid() or public.has_home_access(home_id, auth.uid(), true));
create policy home_expenses_write on public.home_expenses
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid())
  );

-- documents: owner full; granted realtor read ONLY with full scope
create policy home_documents_select on public.home_documents
  for select to authenticated
  using (owner_id = auth.uid() or public.has_home_access(home_id, auth.uid(), true));
create policy home_documents_write on public.home_documents
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid())
  );

-- grants: owner manages; grantee may see grants pointed at them
create policy home_grants_select on public.home_access_grants
  for select to authenticated
  using (owner_id = auth.uid() or grantee_agent_id = auth.uid());
create policy home_grants_write on public.home_access_grants
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid())
  );

-- Expose the new tables to the API roles (RLS above is the real gate).
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;
