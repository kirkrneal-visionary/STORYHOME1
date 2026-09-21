-- P2A1B: County product activation authority.
-- Separate from canonical tx_counties. Missing FIPS is inactive.
-- Not public routes, CAD, or Professional geography.

create table public.tx_county_product_activation (
  county_fips text primary key
    references public.tx_counties (county_fips)
    on delete restrict
    on update restrict,
  is_active boolean not null,
  activated_at timestamptz not null default now(),
  constraint tx_county_product_activation_active_only check (is_active)
);

comment on table public.tx_county_product_activation is
  'Story Home County product activation. FIPS must exist in tx_counties. No row means inactive. Server/service-role only.';

insert into public.tx_county_product_activation (county_fips, is_active) values
  ('48005', true),
  ('48291', true),
  ('48373', true),
  ('48407', true),
  ('48455', true),
  ('48457', true),
  ('48471', true)
on conflict (county_fips) do update
  set is_active = excluded.is_active;

alter table public.tx_county_product_activation enable row level security;
alter table public.tx_county_product_activation force row level security;

revoke all on table public.tx_county_product_activation
  from public, anon, authenticated;
grant all on table public.tx_county_product_activation to service_role;
