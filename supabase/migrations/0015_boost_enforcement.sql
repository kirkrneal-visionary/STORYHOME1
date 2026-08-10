-- ---------------------------------------------------------------------------
-- Wave J.1 — Per-county boost enforcement (all 254 TX counties)
--
-- Boost scarcity is defined PER COUNTY: each tier has a slots_per_county cap
-- (with optional per-county overrides). Everything keys on county FIPS, so the
-- cap applies uniformly to any Texas county, not just the launch footprint.
--
-- 0001 seeded the boost tables and 0002's RLS comment referenced
-- assert_boost_slot_available(), but that function was never defined. This adds
-- the real server-side enforcement plus a public per-county availability read.
-- ---------------------------------------------------------------------------

-- Effective slot cap for a county+tier: per-county override, else tier default.
create or replace function public.boost_slots_for_county(p_county_fips text, p_tier text)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(
    (select slots_per_county from public.boost_county_slot_overrides
      where county_fips = p_county_fips and tier_id = p_tier),
    (select slots_per_county from public.boost_tiers where id = p_tier),
    0
  );
$$;

-- Active boosts currently held in a county for a tier.
create or replace function public.count_active_boosts(p_county_fips text, p_tier text)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.listing_boosts
   where county_fips = p_county_fips and tier_id = p_tier and status = 'active';
$$;

-- Raise if the county+tier bucket is already at capacity.
create or replace function public.assert_boost_slot_available(p_county_fips text, p_tier text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_cap int := public.boost_slots_for_county(p_county_fips, p_tier);
  v_used int := public.count_active_boosts(p_county_fips, p_tier);
begin
  if v_cap <= 0 then
    raise exception 'Boost tier % is not offered in county %', p_tier, p_county_fips
      using errcode = 'check_violation';
  end if;
  if v_used >= v_cap then
    raise exception 'Boost tier % is full in county % (% of % slots used)',
      p_tier, p_county_fips, v_used, v_cap
      using errcode = 'check_violation';
  end if;
end;
$$;

-- Activate a boost for a listing the caller owns/oversees. Resolves the county
-- from the listing, takes a per-(county,tier) advisory lock to prevent oversell
-- under concurrency, enforces the cap, then records the boost. Payment wiring
-- (Stripe) attaches later; the scarcity guarantee lives here regardless.
create or replace function public.activate_boost(p_listing uuid, p_tier text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_fips text;
  v_id uuid;
begin
  select county_fips into v_fips
  from public.listings
  where id = p_listing
    and (agent_id = v_uid or public.is_broker_of(brokerage_id, v_uid));
  if not found then
    raise exception 'Not authorized for this listing' using errcode = 'insufficient_privilege';
  end if;
  if v_fips is null then
    raise exception 'Listing has no county assigned; cannot key a per-county boost'
      using errcode = 'not_null_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_fips || ':' || p_tier));
  perform public.assert_boost_slot_available(v_fips, p_tier);

  insert into public.listing_boosts (listing_id, county_fips, tier_id, status)
  values (p_listing, v_fips, p_tier, 'active')
  returning id into v_id;
  return v_id;
end;
$$;

-- Public, per-county availability for every tier (capacity/used/remaining).
-- SECURITY DEFINER so an unauthenticated seller portal can show real numbers
-- for a listing's county without exposing the underlying listing_boosts rows.
create or replace function public.county_boost_availability(p_county_fips text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'tier_id', t.id,
        'name', t.name,
        'price_monthly_cents', t.price_monthly_cents,
        'capacity', public.boost_slots_for_county(p_county_fips, t.id),
        'used', public.count_active_boosts(p_county_fips, t.id),
        'remaining', greatest(
          public.boost_slots_for_county(p_county_fips, t.id)
            - public.count_active_boosts(p_county_fips, t.id), 0)
      )
      order by t.price_monthly_cents
    ),
    '[]'::jsonb
  )
  from public.boost_tiers t;
$$;

grant execute on function public.boost_slots_for_county(text, text) to authenticated;
grant execute on function public.count_active_boosts(text, text) to authenticated;
grant execute on function public.assert_boost_slot_available(text, text) to authenticated;
grant execute on function public.activate_boost(uuid, text) to authenticated;
grant execute on function public.county_boost_availability(text) to anon, authenticated;
