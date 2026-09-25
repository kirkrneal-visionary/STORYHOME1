-- Isolated County Stories Wave 3 extras. Apply after county-stories-w2-bootstrap.sql.
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists legal_full_name text,
  add column if not exists trec_license text,
  add column if not exists trec_status text,
  add column if not exists verified_license text,
  add column if not exists sponsor_name text,
  add column if not exists sponsor_license_number text;
alter table public.brokerages
  add column if not exists name text;
alter table public.listings
  add column if not exists county_fips text,
  add column if not exists brokerage_id uuid;

update public.brokerages
   set name = 'Story Office'
 where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

update public.profiles set
  legal_full_name = 'Pat Publisher',
  full_name = 'Pat Publisher',
  trec_license = '123456',
  verified_license = '123456',
  trec_status = 'Active'
 where id = 'b2222222-2222-2222-2222-222222222222';

update public.profiles set
  legal_full_name = 'Casey County',
  full_name = 'Casey County',
  trec_license = '234567',
  verified_license = '234567',
  trec_status = 'Active'
 where id = 'c3333333-3333-3333-3333-333333333333';

update public.profiles set
  legal_full_name = 'Morgan Managing',
  full_name = 'Morgan Managing',
  trec_license = '345678',
  verified_license = '345678',
  trec_status = 'Active',
  brokerage_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
 where id = 'd4444444-4444-4444-4444-444444444444';

update public.listings set
  county_fips = '48373',
  brokerage_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
 where id = '11111111-1111-1111-1111-111111111111';

insert into public.profiles (
  id, account_kind, account_purpose, professional_role,
  legal_full_name, full_name
) values (
  'f6666666-6666-6666-6666-666666666666',
  'agent', 'individual_pro', 'realtor_broker',
  'No License', 'No License'
)
on conflict (id) do nothing;
