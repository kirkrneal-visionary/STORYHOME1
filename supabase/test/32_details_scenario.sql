-- Adds structures/disclosure/folder/audit to home1 (from 30_homes_scenario).
insert into public.home_structures (home_id, owner_id, kind, name, year_built)
values ('40000000-0000-0000-0000-000000000001','a1111111-1111-1111-1111-111111111111','Barn','Red barn',2010);

insert into public.home_disclosures (home_id, owner_id, data)
values ('40000000-0000-0000-0000-000000000001','a1111111-1111-1111-1111-111111111111','{"roof":"Y"}'::jsonb);

insert into public.home_folders (home_id, owner_id, name)
values ('40000000-0000-0000-0000-000000000001','a1111111-1111-1111-1111-111111111111','Insurance');

insert into public.home_access_audit (home_id, owner_id, actor_id, action, scope)
values ('40000000-0000-0000-0000-000000000001','a1111111-1111-1111-1111-111111111111','a3333333-3333-3333-3333-333333333333','granted','full');
