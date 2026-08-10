-- ---------------------------------------------------------------------------
-- Wave L (part 2) — statewide-safe listing geocoding
--
-- A CAD Property ID is only unique WITHIN a county appraisal district, so when
-- deriving a listing's coordinates from a linked parcel we must disambiguate by
-- the listing's county (county_fips). Prefer the parcel in the same county.
-- ---------------------------------------------------------------------------

create or replace function public.geocode_listing_from_parcel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c record;
begin
  if new.cad_prop_id is not null and (new.lat is null or new.lng is null) then
    select centroid_lat, centroid_lng into c
    from public.county_parcels
    where prop_id = new.cad_prop_id
      and (new.county_fips is null or county_fips = new.county_fips)
    order by (county_fips is not distinct from new.county_fips) desc
    limit 1;
    if found and c.centroid_lat is not null then
      new.lat := c.centroid_lat;
      new.lng := c.centroid_lng;
    end if;
  end if;
  return new;
end;
$$;
