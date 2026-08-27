-- Hide seller passcodes from public listing reads.
-- Does NOT delete users, listings, or county/CAD truth data.
--
-- Why this is a second file: REVOKE SELECT (one_column) does not override a
-- table-level GRANT SELECT. We revoke the table grant, then re-grant every
-- public column except seller_access_code.

revoke select on public.listings from anon, authenticated, public;

grant select (
  id,
  agent_id,
  brokerage_id,
  created_at,
  updated_at,
  mls_number,
  price,
  address_serif,
  city,
  county_name,
  county_fips,
  state,
  zip,
  beds,
  baths,
  sqft,
  acres,
  lot_size,
  year_built,
  description,
  property_type,
  status,
  has_office,
  has_garage,
  has_pool,
  has_hoa,
  photo_urls,
  lat,
  lng,
  listing_agent_name,
  listing_agent_license,
  brokerage_name,
  lead_paint_disclosure_provided,
  sellers_disclosure_provided,
  days_on_market,
  like_count,
  save_count,
  comment_count,
  cad_prop_id,
  mh_serial_number,
  mh_hud_label
) on public.listings to anon, authenticated;
