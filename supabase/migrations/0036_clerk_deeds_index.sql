-- DEEDS-1 — Owned clerk deed index (launch 7). Dark store until peer-grade reveal.
-- Not CAD observation. Not DataTree / ATTOM. Not deed dates invented from owner diffs.

create table if not exists public.clerk_deed_transfers (
  id bigserial primary key,
  county_fips text not null,
  prop_id text,
  recorded_date date,
  grantor text,
  grantee text,
  instrument text,
  volume_page text,
  doc_number text,
  source_note text not null default 'owned-clerk',
  ingested_at timestamptz not null default now()
);

create unique index if not exists clerk_deed_transfers_fips_doc_uidx
  on public.clerk_deed_transfers (county_fips, doc_number)
  where doc_number is not null;

create index if not exists clerk_deed_transfers_fips_prop_idx
  on public.clerk_deed_transfers (county_fips, prop_id);

create index if not exists clerk_deed_transfers_fips_date_idx
  on public.clerk_deed_transfers (county_fips, recorded_date desc nulls last);

comment on table public.clerk_deed_transfers is
  'DEEDS-1 owned clerk transfer index for launch 7. Never treat CAD owner diffs as deeds. User reveal stays closed until DEEDS-2 peer-grade gate.';

create table if not exists public.clerk_county_coverage (
  county_fips text primary key,
  ready boolean not null default false,
  peer_grade boolean not null default false,
  transfer_count integer not null default 0,
  notes text,
  updated_at timestamptz not null default now()
);

comment on table public.clerk_county_coverage is
  'DEEDS-1 per-county clerk coverage flags. ready=true means index rows exist; peer_grade / product reveal is DEEDS-2.';

grant select on public.clerk_deed_transfers to authenticated, service_role;
grant select on public.clerk_county_coverage to authenticated, service_role;
grant insert, update, delete on public.clerk_deed_transfers to service_role;
grant insert, update, delete on public.clerk_county_coverage to service_role;
grant usage, select on sequence public.clerk_deed_transfers_id_seq to service_role;
