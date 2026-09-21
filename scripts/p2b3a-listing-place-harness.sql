-- Isolated P2B3A proofs. No production listing or parcel backfill.
do $$
declare
  livingston uuid := '57b6c1da-0815-5ea9-9202-ec53a86f6c87';
  onalaska uuid := 'df5284bd-dc05-5397-b4e9-14fbd75ba1ca';
  cleveland uuid := 'd34e1210-95ec-5371-92cf-69271971259e';
  lid uuid;
  lid2 uuid;
  place uuid;
  fips text;
  v_city text;
  n int;
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'listings_local_place_id_idx'
  ) then raise exception 'missing_index'; end if;
  raise notice 'index_ok';

  insert into public.county_parcels
    (source, prop_id, county_fips, legal_acreage, centroid_lat, centroid_lng, local_place_id)
  values
    ('polk_cad', 'liv_p', '48373', 1, 30.71, -94.94, livingston),
    ('polk_cad', 'ona_p', '48373', 1, 30.82, -95.11, onalaska),
    ('polk_cad', 'out_p', '48373', 1, 30.70, -94.70, null),
    ('liberty_cad', 'cle_p', '48291', 1, 30.34, -95.07, cleveland),
    ('sjac_cad', 'cle_sj', '48407', 1, 30.34, -95.07, null);

  insert into public.listings (county_name, city, local_place_id)
    values ('Polk County', 'Livingston', livingston)
    returning id, local_place_id, county_fips into lid, place, fips;
  if place is not null then raise exception 'client_uuid %', place; end if;
  if fips <> '48373' then raise exception 'no_parcel_county %', fips; end if;
  raise notice 'no_parcel_null';
  raise notice 'city_text_not_authority';
  raise notice 'client_uuid_ignored';

  update public.listings set local_place_id = livingston where id = lid;
  select local_place_id into place from public.listings where id = lid;
  if place is not null then raise exception 'direct_forge %', place; end if;
  raise notice 'direct_postgrest_recomputed';

  insert into public.listing_parcels (listing_id, source, prop_id, is_primary)
    values (lid, 'polk_cad', 'liv_p', true);
  select local_place_id, county_fips, city into place, fips, v_city
    from public.listings where id = lid;
  if place <> livingston or fips <> '48373' or v_city <> 'Livingston' then
    raise exception 'liv_attach % %', place, fips;
  end if;
  raise notice 'livingston_matched';
  raise notice 'primary_parcel_attach';

  insert into public.listings (county_name, city)
    values ('Polk County', 'Onalaska')
    returning id into lid2;
  insert into public.listing_parcels (listing_id, source, prop_id, is_primary)
    values (lid2, 'polk_cad', 'ona_p', true);
  if (select local_place_id from public.listings where id = lid2) <> onalaska then
    raise exception 'ona';
  end if;
  if exists (select 1 from public.local_place_product_activation where local_place_id = onalaska)
    then raise exception 'ona_active'; end if;
  raise notice 'onalaska_matched_inactive';

  update public.listing_parcels
    set source = 'polk_cad', prop_id = 'out_p'
    where listing_id = lid;
  if (select local_place_id from public.listings where id = lid) is not null then
    raise exception 'swap_place';
  end if;
  if (select county_fips from public.listings where id = lid) <> '48373' then
    raise exception 'swap_county';
  end if;
  raise notice 'polk_outside_null';
  raise notice 'primary_parcel_change';

  delete from public.listing_parcels where listing_id = lid;
  if (select local_place_id from public.listings where id = lid) is not null then
    raise exception 'removal_place';
  end if;
  if (select county_fips from public.listings where id = lid) <> '48373' then
    raise exception 'removal_county';
  end if;
  raise notice 'primary_parcel_removal';

  insert into public.listings (county_name, city)
    values ('Liberty County', 'Cleveland')
    returning id into lid;
  insert into public.listing_parcels (listing_id, source, prop_id, is_primary)
    values (lid, 'liberty_cad', 'cle_p', true);
  select local_place_id, county_fips into place, fips from public.listings where id = lid;
  if place <> cleveland or fips <> '48291' then
    raise exception 'cle_liberty % %', place, fips;
  end if;
  raise notice 'cleveland_liberty_matched';

  insert into public.listings (county_name, city)
    values ('San Jacinto County', 'Cleveland')
    returning id into lid;
  insert into public.listing_parcels (listing_id, source, prop_id, is_primary)
    values (lid, 'sjac_cad', 'cle_sj', true);
  select local_place_id, county_fips into place, fips from public.listings where id = lid;
  if place is not null or fips <> '48407' then
    raise exception 'cle_sj % %', place, fips;
  end if;
  raise notice 'cleveland_san_jacinto_null';

  update public.county_parcels set local_place_id = livingston where prop_id = 'ona_p';
  perform public.listings_recompute_local_place();
  if (select local_place_id from public.listings where id = lid2) <> livingston then
    raise exception 'reclass';
  end if;
  update public.county_parcels set local_place_id = onalaska where prop_id = 'ona_p';
  perform public.listings_recompute_local_place();
  if (select local_place_id from public.listings where id = lid2) <> onalaska then
    raise exception 'reclass_restore';
  end if;
  raise notice 'parcel_reclass_propagates';

  begin
    alter table public.listings disable trigger trg_listings_bind_county;
    insert into public.listings (county_name, local_place_id)
      values ('Polk County', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    alter table public.listings enable trigger trg_listings_bind_county;
    raise exception 'unknown_uuid_persisted';
  exception
    when foreign_key_violation then
      alter table public.listings enable trigger trg_listings_bind_county;
    when others then
      alter table public.listings enable trigger trg_listings_bind_county;
      if sqlerrm = 'unknown_uuid_persisted' then raise; end if;
      raise;
  end;
  raise notice 'unknown_uuid_rejected';

  if (select count(*) from public.local_place_product_activation) <> 7 then
    raise exception 'activation';
  end if;
  if (select count(*) from public.tx_county_product_activation) <> 7 then
    raise exception 'county_activation';
  end if;
  raise notice 'activation_unchanged';
  raise notice 'no_production_seed';
end
$$;

do $$
begin
  begin
    set local role authenticated;
    perform public.listings_recompute_local_place();
    raise exception 'authenticated_recompute_allowed';
  exception
    when insufficient_privilege then null;
    when others then if sqlerrm = 'authenticated_recompute_allowed' then raise; end if;
  end;
  reset role;
  raise notice 'client_recompute_denied';
end
$$;
