-- P2A3: reviewed East Texas local-place seed. Not public activation.
-- Deterministic UUIDv5 (URL namespace + Story Home seed key). Reapply is idempotent.

insert into public.local_places (id, display_name, place_type, canonical_slug)
values
  ('00029d4e-eb06-5551-83de-6e016d76fa06', 'Lufkin', 'city', 'lufkin'),
  ('805d173e-ecae-5c3e-ab92-e4e6dde01d98', 'Diboll', 'city', 'diboll'),
  ('384780b5-d56e-5cc0-a88b-5a5067bf1fe4', 'Huntington', 'city', 'huntington'),
  ('c1c8ba40-9a9f-5f52-8822-3a1139cca38c', 'Hudson', 'city', 'hudson'),
  ('62fc788a-b066-50d1-8324-edef95b863b2', 'Zavalla', 'city', 'zavalla'),
  ('e27d8dab-f9bb-5a40-88a0-989630cf6c91', 'Liberty', 'city', 'liberty'),
  ('4fcae51d-b8f4-5284-8eb7-3d339e199cbb', 'Dayton', 'city', 'dayton'),
  ('d34e1210-95ec-5371-92cf-69271971259e', 'Cleveland', 'city', 'cleveland'),
  ('57b6c1da-0815-5ea9-9202-ec53a86f6c87', 'Livingston', 'town', 'livingston'),
  ('d75a8e75-9369-563c-af62-82161d9adf27', 'Corrigan', 'town', 'corrigan'),
  ('1914bd8f-60ea-5d33-b54e-554203422f60', 'Goodrich', 'city', 'goodrich'),
  ('df5284bd-dc05-5397-b4e9-14fbd75ba1ca', 'Onalaska', 'city', 'onalaska'),
  ('d44ba033-63c7-5d3e-a701-9f07b33b78cd', 'Coldspring', 'city', 'coldspring'),
  ('a008239f-c217-5c7d-9e68-e42ff0ba1582', 'Shepherd', 'city', 'shepherd'),
  ('33b96f7a-394f-508f-bb97-f53ea282e6a8', 'Groveton', 'city', 'groveton'),
  ('6e8bfac5-1b0c-531d-be26-f53bef1ecf42', 'Trinity', 'city', 'trinity'),
  ('e48fe0cb-c8ee-5620-bf75-5cae48bf095f', 'Woodville', 'town', 'woodville'),
  ('e4fdb7d1-c85b-5d15-a05d-c1efdefd760c', 'Colmesneil', 'city', 'colmesneil'),
  ('8d6bbd11-5bf8-5f0e-bf9d-f802fad19bdb', 'Chester', 'town', 'chester'),
  ('860e0e40-a3b2-5e4f-baef-4b8e39f8e219', 'Huntsville', 'city', 'huntsville'),
  ('41c657a5-f134-5563-9c5a-8e418f641d6c', 'New Waverly', 'city', 'new-waverly'),
  ('1bbd2277-4760-5619-91b3-d47415012c1c', 'Riverside', 'city', 'riverside')
on conflict (id) do nothing;

insert into public.local_place_counties (local_place_id, county_fips, is_primary)
values
  ('00029d4e-eb06-5551-83de-6e016d76fa06', '48005', true),
  ('805d173e-ecae-5c3e-ab92-e4e6dde01d98', '48005', true),
  ('384780b5-d56e-5cc0-a88b-5a5067bf1fe4', '48005', true),
  ('c1c8ba40-9a9f-5f52-8822-3a1139cca38c', '48005', true),
  ('62fc788a-b066-50d1-8324-edef95b863b2', '48005', true),
  ('e27d8dab-f9bb-5a40-88a0-989630cf6c91', '48291', true),
  ('4fcae51d-b8f4-5284-8eb7-3d339e199cbb', '48291', true),
  ('d34e1210-95ec-5371-92cf-69271971259e', '48291', true),
  ('d34e1210-95ec-5371-92cf-69271971259e', '48339', false),
  ('57b6c1da-0815-5ea9-9202-ec53a86f6c87', '48373', true),
  ('d75a8e75-9369-563c-af62-82161d9adf27', '48373', true),
  ('1914bd8f-60ea-5d33-b54e-554203422f60', '48373', true),
  ('df5284bd-dc05-5397-b4e9-14fbd75ba1ca', '48373', true),
  ('d44ba033-63c7-5d3e-a701-9f07b33b78cd', '48407', true),
  ('a008239f-c217-5c7d-9e68-e42ff0ba1582', '48407', true),
  ('33b96f7a-394f-508f-bb97-f53ea282e6a8', '48455', true),
  ('6e8bfac5-1b0c-531d-be26-f53bef1ecf42', '48455', true),
  ('e48fe0cb-c8ee-5620-bf75-5cae48bf095f', '48457', true),
  ('e4fdb7d1-c85b-5d15-a05d-c1efdefd760c', '48457', true),
  ('8d6bbd11-5bf8-5f0e-bf9d-f802fad19bdb', '48457', true),
  ('860e0e40-a3b2-5e4f-baef-4b8e39f8e219', '48471', true),
  ('41c657a5-f134-5563-9c5a-8e418f641d6c', '48471', true),
  ('1bbd2277-4760-5619-91b3-d47415012c1c', '48471', true)
on conflict (local_place_id, county_fips) do nothing;

insert into public.local_place_aliases (
  id, local_place_id, alias_kind, raw_value, normalized_value
) values (
  '3886d0b1-f7fe-58e4-bae1-f064cd0c0458',
  'd44ba033-63c7-5d3e-a701-9f07b33b78cd',
  'name',
  'Cold Spring',
  'cold-spring'
)
on conflict (id) do nothing;
