-- Wave 4 — Suites on the account.
-- Additive. Does not delete users, listings, or CAD.
-- Do not auto-assign browser albums to the next login (app rule).

alter table public.suites
  add column if not exists description text not null default '';

alter table public.suites
  add column if not exists cover_tone text not null default '';

alter table public.suites
  add column if not exists updated_at timestamptz not null default now();

alter table public.suite_items
  add column if not exists sort_order integer not null default 0;

-- Keep the album slot if a listing leaves the market.
alter table public.suite_items
  alter column listing_id drop not null;

do $$
declare
  fk_name text;
begin
  select c.conname into fk_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  where t.relname = 'suite_items'
    and c.contype = 'f'
    and pg_get_constraintdef(c.oid) ilike '%listing_id%listings%';
  if fk_name is not null then
    execute format('alter table public.suite_items drop constraint %I', fk_name);
  end if;
end $$;

alter table public.suite_items
  add constraint suite_items_listing_id_fkey
  foreign key (listing_id) references public.listings(id) on delete set null;

create index if not exists suites_user_updated_idx
  on public.suites (user_id, updated_at desc);

create index if not exists suite_items_suite_sort_idx
  on public.suite_items (suite_id, sort_order);

create or replace function public.suites_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists suites_touch_updated_at on public.suites;
create trigger suites_touch_updated_at
  before update on public.suites
  for each row execute function public.suites_touch_updated_at();

create or replace function public.suites_lock_owner()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id = auth.uid();
  elsif tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'suite owner cannot change';
  end if;
  return new;
end;
$$;

drop trigger if exists suites_lock_owner on public.suites;
create trigger suites_lock_owner
  before insert or update on public.suites
  for each row execute function public.suites_lock_owner();

drop policy if exists suites_all_own on public.suites;
drop policy if exists suite_items_all_own on public.suite_items;
drop policy if exists suites_select_own on public.suites;
drop policy if exists suites_insert_own on public.suites;
drop policy if exists suites_update_own on public.suites;
drop policy if exists suites_delete_own on public.suites;
drop policy if exists suite_items_select_own on public.suite_items;
drop policy if exists suite_items_insert_own on public.suite_items;
drop policy if exists suite_items_update_own on public.suite_items;
drop policy if exists suite_items_delete_own on public.suite_items;

create policy suites_select_own on public.suites
  for select to authenticated
  using (user_id = auth.uid());
create policy suites_insert_own on public.suites
  for insert to authenticated
  with check (user_id = auth.uid());
create policy suites_update_own on public.suites
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy suites_delete_own on public.suites
  for delete to authenticated
  using (user_id = auth.uid());

create policy suite_items_select_own on public.suite_items
  for select to authenticated
  using (exists (select 1 from public.suites s
                 where s.id = suite_id and s.user_id = auth.uid()));
create policy suite_items_insert_own on public.suite_items
  for insert to authenticated
  with check (exists (select 1 from public.suites s
                 where s.id = suite_id and s.user_id = auth.uid()));
create policy suite_items_update_own on public.suite_items
  for update to authenticated
  using (exists (select 1 from public.suites s
                 where s.id = suite_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.suites s
                 where s.id = suite_id and s.user_id = auth.uid()));
create policy suite_items_delete_own on public.suite_items
  for delete to authenticated
  using (exists (select 1 from public.suites s
                 where s.id = suite_id and s.user_id = auth.uid()));

-- Share URL: name + listing ids only. Never notes or user_id.
create or replace function public.suite_share(p_id uuid)
returns table (
  id uuid,
  name text,
  listing_ids uuid[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.name,
    coalesce(
      array_agg(i.listing_id order by i.sort_order, i.created_at)
        filter (where i.listing_id is not null),
      array[]::uuid[]
    ) as listing_ids
  from public.suites s
  left join public.suite_items i on i.suite_id = s.id
  where s.id = p_id
  group by s.id, s.name;
$$;

revoke all on function public.suite_share(uuid) from public;
grant execute on function public.suite_share(uuid) to anon, authenticated;
