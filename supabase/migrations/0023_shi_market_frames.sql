-- SHI Market Frames — private study folders + saved map frames + snapshots.
-- Never writes to county_parcels. Agent-owned only (RLS). Hard caps enforced in app.

create table if not exists public.shi_study_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  acronym text not null,
  county_source text not null,
  county_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shi_study_folders_owner_idx
  on public.shi_study_folders (owner_id, county_source, updated_at desc);

create table if not exists public.shi_market_frames (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.shi_study_folders(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  acronym text not null,
  color text not null default '#17335e',
  boundary jsonb not null,
  map_center_lat double precision,
  map_center_lng double precision,
  map_zoom double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shi_market_frames_folder_idx
  on public.shi_market_frames (folder_id, updated_at desc);

create index if not exists shi_market_frames_owner_idx
  on public.shi_market_frames (owner_id);

-- Frozen analysis + optional thumbnail path (storage). Append/update by owner only.
create table if not exists public.shi_frame_snapshots (
  id uuid primary key default gen_random_uuid(),
  frame_id uuid not null unique references public.shi_market_frames(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  metrics jsonb not null default '{}'::jsonb,
  parcels jsonb not null default '[]'::jsonb,
  thumbnail_path text,
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shi_study_folders enable row level security;
alter table public.shi_market_frames enable row level security;
alter table public.shi_frame_snapshots enable row level security;

drop policy if exists "shi folders owner all" on public.shi_study_folders;
create policy "shi folders owner all" on public.shi_study_folders
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "shi frames owner all" on public.shi_market_frames;
create policy "shi frames owner all" on public.shi_market_frames
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "shi snapshots owner all" on public.shi_frame_snapshots;
create policy "shi snapshots owner all" on public.shi_frame_snapshots
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on public.shi_study_folders to authenticated;
grant select, insert, update, delete on public.shi_market_frames to authenticated;
grant select, insert, update, delete on public.shi_frame_snapshots to authenticated;

-- Private thumbnails: shi-studies/{owner_id}/{frame_id}.jpg
insert into storage.buckets (id, name, public)
values ('shi-studies', 'shi-studies', false)
on conflict (id) do nothing;

drop policy if exists "shi studies owner read" on storage.objects;
create policy "shi studies owner read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'shi-studies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shi studies owner write" on storage.objects;
create policy "shi studies owner write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shi-studies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shi studies owner update" on storage.objects;
create policy "shi studies owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shi-studies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shi studies owner delete" on storage.objects;
create policy "shi studies owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shi-studies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
