-- Repair seller-code lookup: this Postgres has hmac(bytea, bytea, text) only.
-- Does NOT delete users, listings, or county/CAD truth data.

create or replace function public.seller_portal_by_code(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_norm text := upper(trim(coalesce(p_code, '')));
  v_pepper text;
  v_lookup text;
  l public.listings;
  a public.listing_analytics;
begin
  if length(v_norm) < 3 or length(v_norm) > 64 then
    return null;
  end if;
  if v_norm !~ '^[A-Z0-9][A-Z0-9-]{2,63}$' then
    return null;
  end if;

  select pepper into v_pepper from public.seller_code_secrets where id = 1;
  if v_pepper is null then
    return null;
  end if;

  v_lookup := encode(hmac(convert_to(v_norm, 'UTF8'), convert_to(v_pepper, 'UTF8'), 'sha256'::text), 'hex');

  select * into l
  from public.listings
  where seller_access_code_lookup = v_lookup
  limit 1;

  if not found then
    select * into l
    from public.listings
    where seller_access_code is not null
      and upper(trim(seller_access_code)) = v_norm
    limit 1;
    if found then
      update public.listings
      set
        seller_access_code_hash = crypt(v_norm, gen_salt('bf', 10)),
        seller_access_code_lookup = v_lookup,
        seller_access_code = null
      where id = l.id
      returning * into l;
    end if;
  end if;

  if l.id is null then
    return null;
  end if;

  if l.seller_access_code_hash is not null
     and l.seller_access_code_hash <> crypt(v_norm, l.seller_access_code_hash) then
    return null;
  end if;

  select * into a from public.listing_analytics where listing_id = l.id;

  return jsonb_build_object(
    'listing', public.seller_listing_json(l),
    'analytics', to_jsonb(a)
  );
end;
$$;

revoke execute on function public.seller_portal_by_code(text)
  from anon, authenticated, public;
grant execute on function public.seller_portal_by_code(text)
  to service_role;

create or replace function public.ensure_seller_access_code(p_listing uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_addr text;
  v_base text;
  v_code text;
  v_pepper text;
  v_lookup text;
  v_existing text;
begin
  select seller_access_code_hash, address_serif
    into v_existing, v_addr
  from public.listings
  where id = p_listing
    and (agent_id = v_uid or public.is_broker_of(brokerage_id, v_uid));
  if not found then
    return jsonb_build_object('ok', false);
  end if;
  if v_existing is not null then
    return jsonb_build_object('ok', true, 'created', false, 'code', null);
  end if;

  select pepper into v_pepper from public.seller_code_secrets where id = 1;
  if v_pepper is null then
    return jsonb_build_object('ok', false);
  end if;

  v_base := coalesce((regexp_match(upper(coalesce(v_addr, 'HOME')), '[A-Z]{3,}'))[1], 'HOME');
  loop
    v_code := v_base || '-' || lpad((floor(random() * 900) + 100)::int::text, 3, '0');
    v_lookup := encode(hmac(convert_to(v_code, 'UTF8'), convert_to(v_pepper, 'UTF8'), 'sha256'::text), 'hex');
    exit when not exists (
      select 1
      from public.listings
      where seller_access_code_lookup = v_lookup
         or upper(trim(coalesce(seller_access_code, ''))) = v_code
    );
  end loop;

  update public.listings
  set
    seller_access_code_hash = crypt(v_code, gen_salt('bf', 10)),
    seller_access_code_lookup = v_lookup,
    seller_access_code = null
  where id = p_listing;

  return jsonb_build_object('ok', true, 'created', true, 'code', v_code);
end;
$$;

grant execute on function public.ensure_seller_access_code(uuid) to authenticated;

create or replace function public.rotate_seller_access_code(p_listing uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_addr text;
  v_base text;
  v_code text;
  v_pepper text;
  v_lookup text;
begin
  select address_serif into v_addr
  from public.listings
  where id = p_listing
    and (agent_id = v_uid or public.is_broker_of(brokerage_id, v_uid));
  if not found then
    return null;
  end if;

  select pepper into v_pepper from public.seller_code_secrets where id = 1;
  if v_pepper is null then
    return null;
  end if;

  v_base := coalesce((regexp_match(upper(coalesce(v_addr, 'HOME')), '[A-Z]{3,}'))[1], 'HOME');
  loop
    v_code := v_base || '-' || lpad((floor(random() * 900) + 100)::int::text, 3, '0');
    v_lookup := encode(hmac(convert_to(v_code, 'UTF8'), convert_to(v_pepper, 'UTF8'), 'sha256'::text), 'hex');
    exit when not exists (
      select 1
      from public.listings
      where seller_access_code_lookup = v_lookup
         or upper(trim(coalesce(seller_access_code, ''))) = v_code
    );
  end loop;

  update public.listings
  set
    seller_access_code_hash = crypt(v_code, gen_salt('bf', 10)),
    seller_access_code_lookup = v_lookup,
    seller_access_code = null
  where id = p_listing;

  return v_code;
end;
$$;

grant execute on function public.rotate_seller_access_code(uuid) to authenticated;
