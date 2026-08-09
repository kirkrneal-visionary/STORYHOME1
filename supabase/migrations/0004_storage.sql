-- Story Home — private Storage for home documents/receipts.
-- Apply on the real Supabase project (requires the `storage` schema). NOT part
-- of the local RLS test (plain Postgres has no storage schema).
--
-- Path convention: home-docs/{owner_id}/{home_id}/{filename}
-- v1 policy: owner-only access. Sharing a file with a granted realtor is done
-- via app-generated signed URLs (a later enhancement can add grant-aware paths).

insert into storage.buckets (id, name, public)
values ('home-docs', 'home-docs', false)
on conflict (id) do nothing;

drop policy if exists "home docs owner read" on storage.objects;
create policy "home docs owner read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'home-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "home docs owner write" on storage.objects;
create policy "home docs owner write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'home-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "home docs owner update" on storage.objects;
create policy "home docs owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'home-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "home docs owner delete" on storage.objects;
create policy "home docs owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'home-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
