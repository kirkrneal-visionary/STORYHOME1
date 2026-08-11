-- Wave L6: CAD advanced search fields (Owner ID) + indexes for facet search.
alter table public.county_parcels
  add column if not exists cad_owner_id text;

create index if not exists county_parcels_owner_id_idx
  on public.county_parcels (cad_owner_id)
  where cad_owner_id is not null;

create index if not exists county_parcels_tax_year_idx
  on public.county_parcels (tax_year)
  where tax_year is not null;

create index if not exists county_parcels_prop_category_tax_idx
  on public.county_parcels (property_category, tax_year);
