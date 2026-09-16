-- Harden Wave 4: lock the processed CAD warehouse after bounded APIs exist.
-- Apply ONLY after /api/parcels/search, /api/parcels/lookup, and SHI
-- service-role table reads are deployed.
-- Tiles stay public via parcels_mvt (security definer, execute still granted).
-- Does NOT delete county_parcels or county_parcel_values rows.
-- Does NOT revoke parcels_mvt.

revoke select on table public.county_parcels from anon, authenticated, public;
revoke select on table public.county_parcel_values from anon, authenticated, public;

drop policy if exists county_parcels_public_read on public.county_parcels;
drop policy if exists county_parcel_values_public_read on public.county_parcel_values;

grant all on table public.county_parcels to service_role;
grant all on table public.county_parcel_values to service_role;

comment on table public.county_parcels is
  'Processed Story Home CAD warehouse. Public users use /api/parcels/search, /api/parcels/lookup, or parcels_mvt. Direct table SELECT is service_role only.';

comment on table public.county_parcel_values is
  'Processed CAD value years. Direct table SELECT is service_role only after Wave 4.';
