-- LOCAL TEST SCENARIO for the My Home consent model (superuser bypasses RLS).

insert into auth.users (id, email, raw_user_meta_data) values
  ('a1111111-1111-1111-1111-111111111111','owner@test.dev','{"full_name":"Home Owner","account_kind":"consumer"}'),
  ('a2222222-2222-2222-2222-222222222222','other@test.dev','{"full_name":"Other Consumer","account_kind":"consumer"}'),
  ('a3333333-3333-3333-3333-333333333333','agentfull@test.dev','{"full_name":"Agent Full","account_kind":"agent"}'),
  ('a4444444-4444-4444-4444-444444444444','agentreport@test.dev','{"full_name":"Agent Report","account_kind":"agent"}'),
  ('a5555555-5555-5555-5555-555555555555','agentrevoked@test.dev','{"full_name":"Agent Revoked","account_kind":"agent"}');

insert into public.homes (id, owner_id, nickname, address, city, county_name)
values ('40000000-0000-0000-0000-000000000001','a1111111-1111-1111-1111-111111111111','My Home','12 Oak Ln','Livingston','Polk County');

insert into public.home_records (id, home_id, owner_id, title, category, cost)
values ('41000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','a1111111-1111-1111-1111-111111111111','New roof','Roof',18000);

insert into public.home_expenses (id, home_id, owner_id, category, amount, tax_year)
values ('42000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','a1111111-1111-1111-1111-111111111111','Maintenance',450,2026);

insert into public.home_access_grants (home_id, owner_id, grantee_agent_id, scope, status) values
  ('40000000-0000-0000-0000-000000000001','a1111111-1111-1111-1111-111111111111','a3333333-3333-3333-3333-333333333333','full','active'),
  ('40000000-0000-0000-0000-000000000001','a1111111-1111-1111-1111-111111111111','a4444444-4444-4444-4444-444444444444','report','active'),
  ('40000000-0000-0000-0000-000000000001','a1111111-1111-1111-1111-111111111111','a5555555-5555-5555-5555-555555555555','full','revoked');
