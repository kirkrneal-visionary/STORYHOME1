-- ---------------------------------------------------------------------------
-- Wave L3 (consumer) — Multi-parcel home profiles
--
-- Mirrors listing_parcels for the consumer "My Home" side: a home profile can
-- span several CAD tracts (lots bought over time). Links a home to many parcels,
-- marks one primary, and keeps the home's primary CAD id + total lot acreage in
-- sync. Private data — owner + consented realtor read, owner-only write.
-- ---------------------------------------------------------------------------

create table if not exists public.home_parcels (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  source text not null,
  prop_id text not null,
  county_fips text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (home_id, source, prop_id)
);
create index if not exists home_parcels_home_idx on public.home_parcels (home_id);

alter table public.home_parcels enable row level security;

drop policy if exists home_parcels_read on public.home_parcels;
create policy home_parcels_read on public.home_parcels
  for select to authenticated
  using (
    exists (
      select 1 from public.homes h
      where h.id = home_id
        and (h.owner_id = auth.uid() or public.has_home_access(h.id, auth.uid(), false))
    )
  );

drop policy if exists home_parcels_write on public.home_parcels;
create policy home_parcels_write on public.home_parcels
  for all to authenticated
  using (exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid()))
  with check (exists (select 1 from public.homes h where h.id = home_id and h.owner_id = auth.uid()));

grant select, insert, update, delete on public.home_parcels to authenticated;
grant all on public.home_parcels to service_role;

-- Keep the home's primary CAD link + total lot acreage synced to its tracts.
create or replace function public.sync_home_primary_parcel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_home uuid := coalesce(new.home_id, old.home_id);
  v_prop text;
  v_fips text;
  v_acres numeric;
begin
  select hp.prop_id, hp.county_fips
    into v_prop, v_fips
  from public.home_parcels hp
  where hp.home_id = v_home
  order by hp.is_primary desc, hp.created_at asc
  limit 1;

  select coalesce(sum(p.legal_acreage), 0)
    into v_acres
  from public.home_parcels hp
  join public.county_parcels p
    on p.prop_id = hp.prop_id
   and (hp.county_fips is null or p.county_fips = hp.county_fips)
  where hp.home_id = v_home;

  if v_prop is not null then
    update public.homes
       set cad_prop_id = v_prop,
           lot_acres = case when v_acres > 0 then v_acres else lot_acres end
     where id = v_home;
  else
    update public.homes set cad_prop_id = null where id = v_home;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_sync_home_parcel on public.home_parcels;
create trigger trg_sync_home_parcel
  after insert or update or delete on public.home_parcels
  for each row execute function public.sync_home_primary_parcel();

-- Aggregated facts across a home's tracts.
create or replace function public.home_parcel_facts(p_home uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'tract_count', count(*),
    'total_acres', coalesce(sum(p.legal_acreage), 0),
    'improved_count', count(*) filter (where coalesce(p.improvement_value, 0) > 0),
    'land_only_count', count(*) filter (where coalesce(p.improvement_value, 0) = 0),
    'land_value', coalesce(sum(p.land_value), 0),
    'improvement_value', coalesce(sum(p.improvement_value), 0),
    'market_value', coalesce(sum(p.market_value), 0),
    'legal_combined', string_agg(nullif(p.legal_description, ''), ' + ' order by hp.is_primary desc),
    'prop_ids', jsonb_agg(hp.prop_id order by hp.is_primary desc)
  )
  from public.home_parcels hp
  join public.county_parcels p
    on p.prop_id = hp.prop_id
   and (hp.county_fips is null or p.county_fips = hp.county_fips)
  where hp.home_id = p_home;
$$;
grant execute on function public.home_parcel_facts(uuid) to authenticated;
