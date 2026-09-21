-- Isolated P2B1B proofs. Not production. No listing seed/backfill.
do $$
declare
  lid uuid;
  lid2 uuid;
  fips text;
  n int;
  act int;
begin
  insert into public.listings (county_name, city, county_fips)
    values ('Polk County', 'Livingston', '48291')
    returning id, county_fips into lid, fips;
  if fips <> '48373' then raise exception 'name_fallback %', fips; end if;
  raise notice 'valid_county_name';
  raise notice 'client_fips_recomputed';

  insert into public.listings (county_name, city, county_fips)
    values ('Not A County', 'Cleveland', '48291')
    returning id, county_fips into lid2, fips;
  if fips is not null then raise exception 'unknown_name_bound %', fips; end if;
  raise notice 'invalid_county_name_null';
  raise notice 'cleveland_city_no_liberty';
  raise notice 'null_county_supported';

  update public.listings set county_fips = '48005' where id = lid2;
  select county_fips into fips from public.listings where id = lid2;
  if fips is not null then raise exception 'direct_fips_stuck %', fips; end if;
  raise notice 'direct_postgrest_recomputed';

  begin
    alter table public.listings disable trigger trg_listings_bind_county;
    insert into public.listings (county_name, county_fips) values ('Polk County', '00000');
    alter table public.listings enable trigger trg_listings_bind_county;
    raise exception 'unknown_fips_persisted';
  exception
    when foreign_key_violation then
      alter table public.listings enable trigger trg_listings_bind_county;
    when others then
      alter table public.listings enable trigger trg_listings_bind_county;
      if sqlerrm = 'unknown_fips_persisted' then raise; end if;
      raise;
  end;
  raise notice 'unknown_fips_denied';
  raise notice 'fk_tx_counties';

  insert into public.county_parcels
    (source, prop_id, county_fips, legal_acreage, centroid_lat, centroid_lng)
    values
      ('polk_cad', 'P1', '48373', 2, 30.7, -94.9),
      ('liberty_cad', 'L1', '48291', 1, 30.0, -94.7),
      ('montgomery_cad', 'M1', '48339', 1, 30.3, -95.4);

  insert into public.listings (county_name, city, county_fips)
    values ('Liberty County', 'Cleveland', '48005')
    returning id into lid;
  insert into public.listing_parcels
    (listing_id, source, prop_id, county_fips, is_primary)
    values (lid, 'polk_cad', 'P1', '48291', true);
  select county_fips into fips from public.listings where id = lid;
  if fips <> '48373' then raise exception 'parcel_did_not_win %', fips; end if;
  if (select county_name from public.listings where id = lid) <> 'Liberty County' then
    raise exception 'display_name_overwritten';
  end if;
  raise notice 'parcel_county_wins';
  raise notice 'display_name_preserved';

  update public.listings set city = 'Cleveland', zip = '77327', county_fips = '48291'
    where id = lid;
  select county_fips into fips from public.listings where id = lid;
  if fips <> '48373' then raise exception 'city_zip_changed_county %', fips; end if;
  raise notice 'city_never_binds';
  raise notice 'zip_never_binds';

  delete from public.listing_parcels where listing_id = lid;
  select county_fips into fips from public.listings where id = lid;
  if fips <> '48291' then raise exception 'removal_did_not_recompute %', fips; end if;
  raise notice 'parcel_removal_recomputes';

  update public.listings set county_name = 'Walker County' where id = lid;
  select county_fips into fips from public.listings where id = lid;
  if fips <> '48471' then raise exception 'name_change %', fips; end if;
  raise notice 'county_name_recomputes';

  insert into public.listing_parcels
    (listing_id, source, prop_id, county_fips, is_primary)
    values (lid, 'liberty_cad', 'L1', '48373', true);
  select county_fips into fips from public.listings where id = lid;
  if fips <> '48291' then raise exception 'primary_change %', fips; end if;
  raise notice 'primary_parcel_change';

  begin
    insert into public.listing_parcels
      (listing_id, source, prop_id, county_fips, is_primary)
      values (lid, 'polk_cad', 'P1', '48373', true);
    raise exception 'two_primaries_allowed';
  exception
    when unique_violation then null;
    when others then
      if sqlerrm = 'two_primaries_allowed' then raise; end if;
      raise;
  end;
  raise notice 'multiple_primary_rejected';

  insert into public.listings (county_name, city)
    values ('Montgomery County', 'Cleveland')
    returning id, county_fips into lid2, fips;
  if fips <> '48339' then raise exception 'montgomery %', fips; end if;
  select count(*) into act from public.tx_county_product_activation;
  if act <> 7 then raise exception 'activation_wrote %', act; end if;
  if exists (
    select 1 from public.tx_county_product_activation where county_fips = '48339'
  ) then
    raise exception 'montgomery_activated';
  end if;
  raise notice 'inactive_county_binds';
  raise notice 'montgomery_name_binds';
  raise notice 'activation_unchanged';

  insert into public.listings (county_name, city)
    values ('', 'Liberty')
    returning county_fips into fips;
  if fips is not null then raise exception 'liberty_city_bound %', fips; end if;
  insert into public.listings (county_name, city)
    values ('', 'Trinity')
    returning county_fips into fips;
  if fips is not null then raise exception 'trinity_city_bound %', fips; end if;
  raise notice 'liberty_city_no_county';
  raise notice 'trinity_city_no_county';

  set local role authenticated;
  update public.listings set county_fips = '48005' where id = lid;
  reset role;
  select county_fips into fips from public.listings where id = lid;
  if fips <> '48291' then raise exception 'auth_role_forged %', fips; end if;
  raise notice 'authenticated_fips_recomputed';

  select count(*) into n from public.listings;
  if n = 0 then raise exception 'unexpected_empty'; end if;
  raise notice 'no_production_seed';
end;
$$;
