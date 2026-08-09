do $$
declare
  n int; failures int := 0;
  other constant text := 'a2222222-2222-2222-2222-222222222222';
  agent_full constant text := 'a3333333-3333-3333-3333-333333333333';
  agent_report constant text := 'a4444444-4444-4444-4444-444444444444';
  owner1 constant text := 'a1111111-1111-1111-1111-111111111111';
  home1 constant text := '40000000-0000-0000-0000-000000000001';
begin
  set local role authenticated;

  -- report-scope agent: sees structures + disclosure, NOT folders
  perform set_config('app.uid', agent_report, true);
  select count(*) into n from public.home_structures where home_id = home1::uuid;
  if n=1 then raise notice 'PASS  report agent sees structures'; else raise notice 'FAIL report structures (%)',n; failures:=failures+1; end if;
  select count(*) into n from public.home_disclosures where home_id = home1::uuid;
  if n=1 then raise notice 'PASS  report agent sees disclosure'; else raise notice 'FAIL report disclosure'; failures:=failures+1; end if;
  select count(*) into n from public.home_folders where home_id = home1::uuid;
  if n=0 then raise notice 'PASS  report agent CANNOT see folders'; else raise notice 'FAIL report folders'; failures:=failures+1; end if;

  -- full-scope agent: sees folders too
  perform set_config('app.uid', agent_full, true);
  select count(*) into n from public.home_folders where home_id = home1::uuid;
  if n=1 then raise notice 'PASS  full agent sees folders'; else raise notice 'FAIL full folders'; failures:=failures+1; end if;

  -- other consumer: nothing
  perform set_config('app.uid', other, true);
  select count(*) into n from public.home_structures where home_id = home1::uuid;
  if n=0 then raise notice 'PASS  other cannot see structures'; else raise notice 'FAIL other structures'; failures:=failures+1; end if;

  -- audit: owner sees, other cannot
  perform set_config('app.uid', owner1, true);
  select count(*) into n from public.home_access_audit where home_id = home1::uuid;
  if n=1 then raise notice 'PASS  owner sees audit'; else raise notice 'FAIL owner audit'; failures:=failures+1; end if;
  perform set_config('app.uid', other, true);
  select count(*) into n from public.home_access_audit where home_id = home1::uuid;
  if n=0 then raise notice 'PASS  other cannot see audit'; else raise notice 'FAIL other audit'; failures:=failures+1; end if;

  reset role;
  if failures>0 then raise exception '% detail RLS assertion(s) FAILED', failures;
  else raise notice 'ALL HOME-DETAIL RLS ASSERTIONS PASSED'; end if;
end $$;
