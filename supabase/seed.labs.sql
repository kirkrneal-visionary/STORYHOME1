-- Story Labs synthetic seed. Run ONLY on an isolated staging Supabase project.
-- DO NOT run against production (ksvllgzsnzyahqsjuove).
-- Create Auth users first (labs-consumer@, labs-agent@, labs-broker@, labs-seller@)
-- then replace the UUIDs below.

-- County / CAD / map reference data is system truth. Copy schema via
-- official Supabase Branching. Do not copy production Auth, Storage, or CRM.

-- Example after Auth users exist:
-- insert into public.profiles (id, email, full_name, account_kind)
-- values
--   ('00000000-0000-0000-0000-000000000001', 'labs-consumer@storyhome.invalid', 'Labs Consumer', 'consumer'),
--   ('00000000-0000-0000-0000-000000000002', 'labs-agent@storyhome.invalid', 'Labs Agent', 'agent'),
--   ('00000000-0000-0000-0000-000000000003', 'labs-broker@storyhome.invalid', 'Labs Broker', 'broker');
