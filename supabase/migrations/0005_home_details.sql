-- Story Home — My Home fine-tune: property profile, disclosure, structures,
-- folders, receipt attachments, closing packet, and an access audit log.
-- Same consent model as 0003 (owner full; granted realtor read per scope).

-- ---------------------------------------------------------------------------
-- Extend homes: photo (private path), land, and closing facts
-- ---------------------------------------------------------------------------
alter table public.homes
  add column if not exists photo_path text,
  add column if not exists lot_acres numeric(10,2),
  add column if not exists water_source text,
  add column if not exists sewer_type text,
  add column if not exists fenced boolean not null default false,
  add column if not exists ag_exemption boolean not null default false,
  add column if not exists road_frontage text,
  add column if not exists is_financed boolean,
  add column if not exists title_company text,
  add column if not exists gf_number text,
  add column if not exists lender text,
  add column if not exists loan_amount numeric(12,2);

-- ---------------------------------------------------------------------------
-- Records & expenses: "Other" free-text + attached receipt/invoice
-- ---------------------------------------------------------------------------
alter table public.home_records
  add column if not exists category_other text,
  add column if not exists receipt_path text,
  add column if not exists receipt_name text;

alter table public.home_expenses
  add column if not exists category_other text,
  add column if not exists receipt_path text,
  add column if not exists receipt_name text;

-- ---------------------------------------------------------------------------
-- Folders (organize the Documents vault) + document extras + closing packet
-- ---------------------------------------------------------------------------
create table if not exists public.home_folders (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null default 'documents',
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists home_folders_home_idx on public.home_folders (home_id);

alter table public.home_documents
  add column if not exists folder_id uuid references public.home_folders(id) on delete set null,
  add column if not exists doc_type_other text,
  add column if not exists is_closing_doc boolean not null default false,
  add column if not exists closing_slot text,
  add column if not exists sensitive boolean not null default false;

-- ---------------------------------------------------------------------------
-- Structures (barns, shops, sheds, etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.home_structures (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'Other',
  kind_other text,
  name text not null default '',
  size_sqft int,
  year_built int,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists home_structures_home_idx on public.home_structures (home_id);

-- ---------------------------------------------------------------------------
-- Disclosure (informational TREC-style form, stored as structured JSON)
-- ---------------------------------------------------------------------------
create table if not exists public.home_disclosures (
  home_id uuid primary key references public.homes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Access audit log (owner-visible): who was granted/revoked, when
-- ---------------------------------------------------------------------------
create table if not exists public.home_access_audit (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid,
  action text not null,
  scope text,
  detail text,
  at timestamptz not null default now()
);
create index if not exists home_audit_home_idx on public.home_access_audit (home_id, at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.home_folders        enable row level security;
alter table public.home_structures     enable row level security;
alter table public.home_disclosures    enable row level security;
alter table public.home_access_audit   enable row level security;

-- Folders: owner writes; granted (full) can read (they see the doc vault)
create policy home_folders_select on public.home_folders
  for select to authenticated
  using (owner_id = auth.uid() or public.has_home_access(home_id, auth.uid(), true));
create policy home_folders_write on public.home_folders
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid())
  );

-- Structures: part of the property "report" — visible on any active grant
create policy home_structures_select on public.home_structures
  for select to authenticated
  using (owner_id = auth.uid() or public.has_home_access(home_id, auth.uid(), false));
create policy home_structures_write on public.home_structures
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid())
  );

-- Disclosure: part of the property "report" — visible on any active grant
create policy home_disclosures_select on public.home_disclosures
  for select to authenticated
  using (owner_id = auth.uid() or public.has_home_access(home_id, auth.uid(), false));
create policy home_disclosures_write on public.home_disclosures
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid())
  );

-- Audit: owner-only
create policy home_audit_select on public.home_access_audit
  for select to authenticated using (owner_id = auth.uid());
create policy home_audit_insert on public.home_access_audit
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid())
  );

-- Expose new tables to API roles (RLS is the gate)
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
