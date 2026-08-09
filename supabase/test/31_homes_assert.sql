-- LOCAL RLS ASSERTIONS for the My Home consent model.

do $$
declare
  n int;
  failures int := 0;
  owner1 constant text := 'a1111111-1111-1111-1111-111111111111';
  other constant text := 'a2222222-2222-2222-2222-222222222222';
  agent_full constant text := 'a3333333-3333-3333-3333-333333333333';
  agent_report constant text := 'a4444444-4444-4444-4444-444444444444';
  agent_revoked constant text := 'a5555555-5555-5555-5555-555555555555';
  home1 constant text := '40000000-0000-0000-0000-000000000001';
  blocked boolean;
begin
  set local role authenticated;

  -- Owner sees everything
  perform set_config('app.uid', owner1, true);
  select count(*) into n from public.homes where id = home1::uuid;
  if n=1 then raise notice 'PASS  owner sees own home'; else raise notice 'FAIL owner home (n=%)',n; failures:=failures+1; end if;
  select count(*) into n from public.home_records where home_id = home1::uuid;
  if n=1 then raise notice 'PASS  owner sees own records'; else raise notice 'FAIL owner records'; failures:=failures+1; end if;
  select count(*) into n from public.home_expenses where home_id = home1::uuid;
  if n=1 then raise notice 'PASS  owner sees own expenses'; else raise notice 'FAIL owner expenses'; failures:=failures+1; end if;

  -- Unrelated consumer sees nothing
  perform set_config('app.uid', other, true);
  select count(*) into n from public.homes where id = home1::uuid;
  if n=0 then raise notice 'PASS  other cannot see home'; else raise notice 'FAIL other saw home'; failures:=failures+1; end if;
  select count(*) into n from public.home_expenses where home_id = home1::uuid;
  if n=0 then raise notice 'PASS  other cannot see expenses'; else raise notice 'FAIL other saw expenses'; failures:=failures+1; end if;

  -- Other cannot write a record into someone else's home
  blocked := false;
  begin
    insert into public.home_records (home_id, owner_id, title) values (home1::uuid, other::uuid, 'hack');
  exception when others then blocked := true; end;
  if blocked then raise notice 'PASS  other cannot add record'; else raise notice 'FAIL other added record'; failures:=failures+1; end if;

  -- Granted realtor (full) sees home + records + expenses
  perform set_config('app.uid', agent_full, true);
  select count(*) into n from public.homes where id = home1::uuid;
  if n=1 then raise notice 'PASS  full-grant agent sees home'; else raise notice 'FAIL full agent home'; failures:=failures+1; end if;
  select count(*) into n from public.home_records where home_id = home1::uuid;
  if n=1 then raise notice 'PASS  full-grant agent sees records'; else raise notice 'FAIL full agent records'; failures:=failures+1; end if;
  select count(*) into n from public.home_expenses where home_id = home1::uuid;
  if n=1 then raise notice 'PASS  full-grant agent sees expenses'; else raise notice 'FAIL full agent expenses'; failures:=failures+1; end if;

  -- Granted realtor (report scope) sees home + records but NOT expenses
  perform set_config('app.uid', agent_report, true);
  select count(*) into n from public.homes where id = home1::uuid;
  if n=1 then raise notice 'PASS  report-grant agent sees home'; else raise notice 'FAIL report agent home'; failures:=failures+1; end if;
  select count(*) into n from public.home_records where home_id = home1::uuid;
  if n=1 then raise notice 'PASS  report-grant agent sees records'; else raise notice 'FAIL report agent records'; failures:=failures+1; end if;
  select count(*) into n from public.home_expenses where home_id = home1::uuid;
  if n=0 then raise notice 'PASS  report-grant agent CANNOT see expenses'; else raise notice 'FAIL report agent saw expenses'; failures:=failures+1; end if;

  -- Revoked grant = no access
  perform set_config('app.uid', agent_revoked, true);
  select count(*) into n from public.homes where id = home1::uuid;
  if n=0 then raise notice 'PASS  revoked agent cannot see home'; else raise notice 'FAIL revoked agent saw home'; failures:=failures+1; end if;

  -- Owner can update; other cannot
  perform set_config('app.uid', owner1, true);
  update public.homes set nickname='Renamed' where id = home1::uuid;
  get diagnostics n = row_count;
  if n=1 then raise notice 'PASS  owner can update home'; else raise notice 'FAIL owner update'; failures:=failures+1; end if;
  perform set_config('app.uid', other, true);
  update public.homes set nickname='Hijack' where id = home1::uuid;
  get diagnostics n = row_count;
  if n=0 then raise notice 'PASS  other cannot update home'; else raise notice 'FAIL other updated home'; failures:=failures+1; end if;

  reset role;
  if failures > 0 then raise exception '% consent RLS assertion(s) FAILED', failures;
  else raise notice 'ALL MY-HOME CONSENT RLS ASSERTIONS PASSED'; end if;
end $$;
