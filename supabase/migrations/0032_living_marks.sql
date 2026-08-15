-- STORY-WALK SW-2 — Living Mark media library
-- Public still/video URLs for Agent World circle. Apply on real Supabase.
-- Local plain-Postgres RLS tests may skip storage schema.

alter table public.profiles
  add column if not exists living_mark_video_url text;

comment on column public.profiles.living_mark_video_url is
  'Story Walk Living Mark welcome video URL (SW-2+). photo_url remains the still/poster.';

insert into storage.buckets (id, name, public)
values ('living-marks', 'living-marks', true)
on conflict (id) do nothing;

-- Owners write under {user_id}/… ; public read for Agent World.
drop policy if exists "living marks owner write" on storage.objects;
create policy "living marks owner write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'living-marks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "living marks owner update" on storage.objects;
create policy "living marks owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'living-marks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "living marks owner delete" on storage.objects;
create policy "living marks owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'living-marks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "living marks public read" on storage.objects;
create policy "living marks public read" on storage.objects
  for select to public
  using (bucket_id = 'living-marks');
