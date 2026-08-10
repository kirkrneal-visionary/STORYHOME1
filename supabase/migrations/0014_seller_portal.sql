-- ---------------------------------------------------------------------------
-- Wave J — Seller Portal (real listing + real analytics, code-gated)
--
-- The seller portal is accessed by an access code in the URL (no login). Listing
-- rows are public-read, but listing_analytics is restricted to the owning agent.
-- So we expose analytics to the code-holder via a SECURITY DEFINER function
-- (the access code is the token). We also add a helper for an agent/broker to
-- generate a unique access code to share with their seller.
-- ---------------------------------------------------------------------------

-- Resolve a listing + its analytics by seller access code (code = the secret).
create or replace function public.seller_portal_by_code(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'listing', to_jsonb(l),
    'analytics', to_jsonb(a)
  )
  from public.listings l
  left join public.listing_analytics a on a.listing_id = l.id
  where l.seller_access_code is not null
    and upper(l.seller_access_code) = upper(trim(p_code))
  limit 1;
$$;
grant execute on function public.seller_portal_by_code(text) to anon, authenticated;

-- Generate (once) a unique, human-readable seller access code for a listing the
-- caller owns (agent) or oversees (broker). Returns the code.
create or replace function public.ensure_seller_access_code(p_listing uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_existing text;
  v_addr text;
  v_base text;
  v_code text;
begin
  select seller_access_code, address_serif into v_existing, v_addr
  from public.listings
  where id = p_listing
    and (agent_id = v_uid or public.is_broker_of(brokerage_id, v_uid));
  if not found then
    return null; -- not the caller's listing
  end if;
  if v_existing is not null then
    return v_existing;
  end if;

  v_base := coalesce((regexp_match(upper(coalesce(v_addr, 'HOME')), '[A-Z]{3,}'))[1], 'HOME');
  loop
    v_code := v_base || '-' || lpad((floor(random() * 900) + 100)::int::text, 3, '0');
    exit when not exists (select 1 from public.listings where seller_access_code = v_code);
  end loop;

  update public.listings set seller_access_code = v_code where id = p_listing;
  return v_code;
end;
$$;
grant execute on function public.ensure_seller_access_code(uuid) to authenticated;
