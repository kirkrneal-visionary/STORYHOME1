-- LOCAL TEST SCENARIO — sets up users/org/data as superuser (bypasses RLS).
-- Fixed UUIDs so the assertion script can reference them.

-- Users (inserting into auth.users fires handle_new_user -> profiles)
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111','buyer1@test.dev','{"full_name":"Buyer One","account_kind":"consumer"}'),
  ('22222222-2222-2222-2222-222222222222','buyer2@test.dev','{"full_name":"Buyer Two","account_kind":"consumer"}'),
  ('33333333-3333-3333-3333-333333333333','agent1@test.dev','{"full_name":"Agent One","account_kind":"agent"}'),
  ('44444444-4444-4444-4444-444444444444','agent2@test.dev','{"full_name":"Agent Two","account_kind":"agent"}'),
  ('55555555-5555-5555-5555-555555555555','broker1@test.dev','{"full_name":"Broker One","account_kind":"broker"}');

-- Brokerage + membership
insert into public.brokerages (id, name, broker_license, broker_id) values
  ('b0000000-0000-0000-0000-000000000001','Test Realty','555001','55555555-5555-5555-5555-555555555555');

update public.profiles set brokerage_id = 'b0000000-0000-0000-0000-000000000001'
  where id in (
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555');
update public.profiles set team_leader_authorized = true
  where id = '33333333-3333-3333-3333-333333333333';

-- Team: leader agent1, member agent1 (agent2 is NOT a member)
insert into public.teams (id, brokerage_id, name, leader_id, authorized) values
  ('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','Lakeside','33333333-3333-3333-3333-333333333333', true);
insert into public.team_members (team_id, member_id) values
  ('c0000000-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333');

-- Channels: brokerage-wide + team-private
insert into public.channels (id, brokerage_id, scope, team_id, name) values
  ('d0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','brokerage', null, 'General'),
  ('d0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000001','team','c0000000-0000-0000-0000-000000000001','Lakeside Team');

-- Buyer1 suite
insert into public.suites (id, user_id, name) values
  ('e0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','My Suite');

-- Agent1 listing
insert into public.listings (id, agent_id, brokerage_id, price, address_serif, city, county_name, state, beds, baths, sqft)
values ('f0000000-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','b0000000-0000-0000-0000-000000000001',
        500000,'1 Test St','Lufkin','Angelina County','TX',3,2,1800);
