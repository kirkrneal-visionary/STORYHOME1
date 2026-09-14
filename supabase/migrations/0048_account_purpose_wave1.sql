-- Wave 1: account purpose, legal identity binding, field locks, hide email,
-- Pro-only corridor/neighbor RPCs, office-admin is not Story Pro.
-- Does NOT delete users, listings, or county/CAD truth data.
-- Does NOT grant managing_broker to existing brokers (no silent office power).

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists account_purpose text not null default 'consumer';

alter table public.profiles
  drop constraint if exists profiles_account_purpose_check;

alter table public.profiles
  add constraint profiles_account_purpose_check
  check (account_purpose in (
    'consumer',
    'individual_pro',
    'managing_broker',
    'other_professional'
  ));

alter table public.profiles add column if not exists legal_full_name text;
alter table public.profiles add column if not exists verified_legal_name text;
alter table public.profiles add column if not exists verified_license text;
alter table public.profiles add column if not exists verified_purpose text;
alter table public.profiles add column if not exists verified_account_kind text;

update public.profiles
set legal_full_name = nullif(btrim(full_name), '')
where legal_full_name is null;

update public.profiles
set account_purpose = 'other_professional'
where account_purpose = 'consumer'
  and professional_role in ('inspector', 'appraiser', 'lender')
  and account_kind = 'consumer';

update public.profiles
set
  account_purpose = 'individual_pro',
  verified_legal_name = coalesce(legal_full_name, nullif(btrim(full_name), '')),
  verified_license = coalesce(nullif(btrim(trec_license), ''), nullif(btrim(license_number), '')),
  verified_purpose = 'individual_pro',
  verified_account_kind = account_kind
where account_kind in ('agent', 'broker')
  and account_purpose = 'consumer';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_individual_pro(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_uid
      and account_purpose = 'individual_pro'
  );
$$;

create or replace function public.is_managing_broker(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_uid
      and account_purpose = 'managing_broker'
  );
$$;

-- Office power requires managing purpose. License type alone is not enough.
create or replace function public.is_broker_of(p_bid uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_managing_broker(p_uid)
    and (
      exists (
        select 1 from public.brokerages b
        where b.id = p_bid and b.broker_id = p_uid
      )
      or exists (
        select 1 from public.profiles p
        where p.id = p_uid
          and p.brokerage_id = p_bid
          and p.account_purpose = 'managing_broker'
      )
    );
$$;

grant execute on function public.is_individual_pro(uuid) to anon, authenticated, service_role;
grant execute on function public.is_managing_broker(uuid) to anon, authenticated, service_role;
grant execute on function public.is_broker_of(uuid, uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Privilege lock (client cannot write role / legal identity / membership)
-- SECURITY DEFINER roster/office functions set story.allow_profile_privilege_write.
-- ---------------------------------------------------------------------------
create or replace function public.profiles_lock_privilege_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if current_setting('story.allow_profile_privilege_write', true) = '1' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.account_kind is distinct from old.account_kind then
      raise exception 'account_kind cannot be changed by the client';
    end if;
    if new.account_purpose is distinct from old.account_purpose then
      raise exception 'account_purpose cannot be changed by the client';
    end if;
    if new.legal_full_name is distinct from old.legal_full_name then
      raise exception 'legal_full_name cannot be changed by the client';
    end if;
    if new.trec_status is distinct from old.trec_status then
      raise exception 'trec_status cannot be changed by the client';
    end if;
    if new.trec_license is distinct from old.trec_license then
      raise exception 'trec_license cannot be changed by the client';
    end if;
    if new.license_number is distinct from old.license_number then
      raise exception 'license_number cannot be changed by the client';
    end if;
    if new.trec_verified_at is distinct from old.trec_verified_at then
      raise exception 'trec_verified_at cannot be changed by the client';
    end if;
    if new.verified_legal_name is distinct from old.verified_legal_name then
      raise exception 'verified_legal_name cannot be changed by the client';
    end if;
    if new.verified_license is distinct from old.verified_license then
      raise exception 'verified_license cannot be changed by the client';
    end if;
    if new.verified_purpose is distinct from old.verified_purpose then
      raise exception 'verified_purpose cannot be changed by the client';
    end if;
    if new.verified_account_kind is distinct from old.verified_account_kind then
      raise exception 'verified_account_kind cannot be changed by the client';
    end if;
    if new.brokerage_id is distinct from old.brokerage_id then
      raise exception 'brokerage_id cannot be changed by the client';
    end if;
    if new.team_leader_authorized is distinct from old.team_leader_authorized then
      raise exception 'team_leader_authorized cannot be changed by the client';
    end if;
    if new.professional_role is distinct from old.professional_role then
      raise exception 'professional_role cannot be changed by the client';
    end if;
  end if;
  if tg_op = 'INSERT' then
    if new.account_kind is distinct from 'consumer' then
      raise exception 'account_kind cannot be set by the client';
    end if;
    if new.account_purpose not in ('consumer', 'other_professional') then
      raise exception 'account_purpose cannot be set by the client';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_privilege_columns on public.profiles;
create trigger profiles_lock_privilege_columns
  before insert or update on public.profiles
  for each row
  execute function public.profiles_lock_privilege_columns();

-- ---------------------------------------------------------------------------
-- Signup: always consumer (or other_professional from role). Ignore privilege metadata.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_lic  text := nullif(new.raw_user_meta_data->>'trec_license', '');
  v_role text := nullif(new.raw_user_meta_data->>'professional_role', '');
  v_purpose text := 'consumer';
begin
  if v_role is not null and v_role not in ('realtor_broker', 'inspector', 'appraiser', 'lender') then
    v_role := null;
  end if;
  if v_role in ('inspector', 'appraiser', 'lender') then
    v_purpose := 'other_professional';
  else
    v_purpose := 'consumer';
  end if;

  insert into public.profiles (
    id, email, full_name, legal_full_name, initials,
    account_kind, account_purpose, professional_role,
    license_number, trec_license, trec_status, trec_verified_at,
    sponsor_license_number, sponsor_name
  )
  values (
    new.id,
    new.email,
    v_name,
    v_name,
    upper(left(v_name, 1)) ||
      upper(coalesce(nullif(split_part(v_name, ' ', 2), ''), '')),
    'consumer',
    v_purpose,
    v_role,
    v_lic,
    v_lic,
    null,
    null,
    nullif(new.raw_user_meta_data->>'sponsor_license_number', ''),
    nullif(new.raw_user_meta_data->>'sponsor_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates a consumer or other-professional profile. Ignores account_kind, account_purpose, and trec_status in signup metadata.';

-- ---------------------------------------------------------------------------
-- Roster / office writes (trusted functions only)
-- ---------------------------------------------------------------------------
create or replace function public.accept_brokerage_invite(p_brokerage uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_lic text;
begin
  select trec_license into v_lic from public.profiles where id = auth.uid();
  if v_lic is null then return false; end if;
  if not exists (
    select 1 from public.brokerage_invites bi
    where bi.brokerage_id = p_brokerage
      and bi.agent_license = v_lic
      and bi.status = 'active'
  ) then
    return false;
  end if;
  perform set_config('story.allow_profile_privilege_write', '1', true);
  update public.profiles set brokerage_id = p_brokerage where id = auth.uid();
  update public.brokerage_invites set status = 'accepted'
    where brokerage_id = p_brokerage and agent_license = v_lic;
  return true;
end;
$$;

create or replace function public.remove_agent_from_brokerage(p_agent uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_brok uuid; v_lic text;
begin
  if not public.is_managing_broker(auth.uid()) then return false; end if;
  select brokerage_id into v_brok from public.profiles where id = p_agent;
  if v_brok is null then return false; end if;
  if not public.is_broker_of(v_brok, auth.uid()) then return false; end if;
  select trec_license into v_lic from public.profiles where id = p_agent;
  perform set_config('story.allow_profile_privilege_write', '1', true);
  update public.profiles set brokerage_id = null where id = p_agent;
  update public.brokerage_invites set status = 'removed'
    where brokerage_id = v_brok and agent_license = v_lic;
  return true;
end;
$$;

create or replace function public.set_team_leader_authorized(
  p_agent uuid,
  p_authorized boolean
)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_brok uuid;
begin
  if not public.is_managing_broker(auth.uid()) then return false; end if;
  select brokerage_id into v_brok from public.profiles where id = p_agent;
  if v_brok is null then return false; end if;
  if not public.is_broker_of(v_brok, auth.uid()) then return false; end if;
  perform set_config('story.allow_profile_privilege_write', '1', true);
  update public.profiles set team_leader_authorized = p_authorized where id = p_agent;
  return true;
end;
$$;

create or replace function public.create_managed_brokerage(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := nullif(btrim(p_name), '');
begin
  if not public.is_managing_broker(auth.uid()) then
    raise exception 'Managing broker required';
  end if;
  if v_name is null then
    raise exception 'Name required';
  end if;
  insert into public.brokerages (name, broker_id, slug)
  values (
    v_name,
    auth.uid(),
    trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'))
  )
  returning id into v_id;
  perform set_config('story.allow_profile_privilege_write', '1', true);
  update public.profiles set brokerage_id = v_id where id = auth.uid();
  return v_id;
end;
$$;

grant execute on function public.accept_brokerage_invite(uuid) to authenticated;
grant execute on function public.remove_agent_from_brokerage(uuid) to authenticated;
grant execute on function public.set_team_leader_authorized(uuid, boolean) to authenticated;
grant execute on function public.create_managed_brokerage(text) to authenticated;

drop policy if exists brokerages_insert on public.brokerages;
create policy brokerages_insert on public.brokerages
  for insert to authenticated
  with check (public.is_managing_broker(auth.uid()));

-- ---------------------------------------------------------------------------
-- Hide email (and verification stamps) from PostgREST clients
-- ---------------------------------------------------------------------------
revoke select on table public.profiles from anon, authenticated;
grant select (
  id,
  full_name,
  legal_full_name,
  initials,
  account_kind,
  account_purpose,
  professional_role,
  brokerage_id,
  credential,
  license_number,
  team_leader_authorized,
  primary_market_city,
  bio,
  avatar_url,
  photo_url,
  phone,
  website,
  specialties,
  service_areas,
  languages,
  designations,
  socials,
  reputation_score,
  star_rating,
  review_count,
  created_at,
  living_mark_video_url,
  trec_license,
  trec_status,
  sponsor_license_number,
  sponsor_name
) on table public.profiles to anon, authenticated;

grant select, insert, update, delete on table public.profiles to service_role;

-- ---------------------------------------------------------------------------
-- Corridor / neighbor RPCs: empty unless individual Pro (fail closed)
-- ---------------------------------------------------------------------------
create or replace function public.corridor_parcel_frontage(
  p_prop_id text,
  p_source text,
  p_buffer_m double precision default 35
)
returns table (
  route_id text,
  approx_frontage_ft double precision,
  aadt integer,
  segment_id text
)
language sql
stable
parallel safe
security definer
set search_path = public
as $$
  with parcel as (
    select ST_Multi(geom) as geom
    from public.county_parcels
    where prop_id = p_prop_id
      and source = p_source
      and geom is not null
      and public.is_individual_pro(auth.uid())
    limit 1
  ),
  roads as (
    select s.id, s.route_id, s.aadt, s.geom
    from public.corridor_road_segments s
    cross join parcel p
    where s.geom && ST_Expand(p.geom, 0.002)
  ),
  hits as (
    select
      r.route_id,
      r.aadt,
      r.id as segment_id,
      ST_Length(
        ST_Transform(
          ST_Intersection(
            ST_Boundary(p.geom),
            ST_Buffer(r.geom::geography, p_buffer_m)::geometry
          ),
          3857
        )
      ) * 3.28084 as ft
    from roads r
    cross join parcel p
    where ST_Intersects(
      ST_Boundary(p.geom),
      ST_Buffer(r.geom::geography, p_buffer_m)::geometry
    )
  )
  select
    h.route_id,
    round(sum(h.ft)::numeric, 1)::double precision as approx_frontage_ft,
    max(h.aadt)::integer as aadt,
    (array_agg(h.segment_id order by h.ft desc))[1] as segment_id
  from hits h
  group by h.route_id
  having sum(h.ft) >= 25;
$$;

create or replace function public.corridor_parcel_intersection_distance(
  p_prop_id text,
  p_source text,
  p_join_m double precision default 20,
  p_search_m double precision default 200
)
returns table (
  approx_distance_m double precision,
  route_a text,
  route_b text
)
language sql
stable
parallel safe
security definer
set search_path = public
as $$
  with parcel as (
    select
      ST_Multi(geom) as geom,
      ST_Centroid(geom) as c
    from public.county_parcels
    where prop_id = p_prop_id
      and source = p_source
      and geom is not null
      and public.is_individual_pro(auth.uid())
    limit 1
  ),
  nearby as (
    select s.id, s.route_id, s.geom
    from public.corridor_road_segments s
    cross join parcel p
    where ST_DWithin(s.geom::geography, p.geom::geography, p_search_m)
  ),
  pairs as (
    select
      a.route_id as route_a,
      b.route_id as route_b,
      ST_ClosestPoint(a.geom, b.geom) as cross_pt
    from nearby a
    join nearby b
      on a.id < b.id
     and a.route_id is distinct from b.route_id
    where ST_DWithin(a.geom::geography, b.geom::geography, p_join_m)
  )
  select
    round(
      ST_Distance(pairs.cross_pt::geography, parcel.c::geography)::numeric,
      0
    )::double precision as approx_distance_m,
    pairs.route_a,
    pairs.route_b
  from pairs
  cross join parcel
  order by 1 asc
  limit 1;
$$;

create or replace function public.parcel_neighbors(
  p_prop_id text,
  p_source text,
  p_buffer_m double precision default 2,
  p_limit integer default 24
)
returns table (
  prop_id text,
  source text,
  county_fips text,
  owner_name text,
  cad_owner_id text,
  legal_acreage double precision,
  relation text,
  distance_m double precision
)
language sql
stable
parallel safe
security definer
set search_path = public
as $$
  with subject as (
    select
      geom,
      source,
      prop_id,
      county_fips
    from public.county_parcels
    where prop_id = p_prop_id
      and source = p_source
      and geom is not null
      and public.is_individual_pro(auth.uid())
    limit 1
  ),
  box as (
    select
      s.*,
      ST_Expand(
        s.geom,
        greatest(coalesce(p_buffer_m, 2), 2) / 111320.0
      ) as search_geom
    from subject s
  )
  select
    n.prop_id,
    n.source,
    n.county_fips,
    n.owner_name,
    n.cad_owner_id,
    n.legal_acreage,
    case
      when ST_Touches(b.geom, n.geom) then 'touches'
      else 'near'
    end as relation,
    round(
      ST_Distance(b.geom::geography, n.geom::geography)::numeric,
      1
    )::double precision as distance_m
  from box b
  join public.county_parcels n
    on n.source = b.source
   and n.prop_id is distinct from b.prop_id
   and n.geom is not null
   and n.geom && b.search_geom
   and (
     ST_Touches(b.geom, n.geom)
     or ST_DWithin(
       b.geom::geography,
       n.geom::geography,
       greatest(coalesce(p_buffer_m, 2), 0)
     )
   )
  order by
    case when ST_Touches(b.geom, n.geom) then 0 else 1 end,
    ST_Distance(b.geom::geography, n.geom::geography),
    n.prop_id
  limit greatest(coalesce(p_limit, 24), 1);
$$;
