-- LOCAL RLS ASSERTIONS — run as the authenticated role, impersonating users via
-- the app.uid GUC. Prints PASS/FAIL per rule and errors out if any fail.

do $$
declare
  n int;
  failures int := 0;
  buyer1 constant text := '11111111-1111-1111-1111-111111111111';
  buyer2 constant text := '22222222-2222-2222-2222-222222222222';
  agent1 constant text := '33333333-3333-3333-3333-333333333333';
  agent2 constant text := '44444444-4444-4444-4444-444444444444';
  broker1 constant text := '55555555-5555-5555-5555-555555555555';
  suite1 constant text := 'e0000000-0000-0000-0000-000000000001';
  listing1 constant text := 'f0000000-0000-0000-0000-000000000001';
  chan_team constant text := 'd0000000-0000-0000-0000-000000000002';
  chan_general constant text := 'd0000000-0000-0000-0000-000000000001';
  blocked boolean;
  procedure_note text;
begin
  set local role authenticated;

  -- helper macro via inline: report(label, condition)
  -- 1) Buyer edits OWN suite
  perform set_config('app.uid', buyer1, true);
  update public.suites set name = 'Renamed' where id = suite1::uuid;
  get diagnostics n = row_count;
  if n = 1 then raise notice 'PASS  buyer edits own suite'; else raise notice 'FAIL  buyer edits own suite (n=%)', n; failures := failures + 1; end if;

  -- 2) Buyer CANNOT edit another buyer's suite
  perform set_config('app.uid', buyer2, true);
  update public.suites set name = 'Hacked' where id = suite1::uuid;
  get diagnostics n = row_count;
  if n = 0 then raise notice 'PASS  buyer cannot edit others suite'; else raise notice 'FAIL  buyer edited others suite (n=%)', n; failures := failures + 1; end if;

  -- 3) Buyer CANNOT add an item to someone else's suite (WITH CHECK)
  perform set_config('app.uid', buyer2, true);
  blocked := false;
  begin
    insert into public.suite_items (suite_id, listing_id) values (suite1::uuid, listing1::uuid);
  exception when others then blocked := true;
  end;
  if blocked then raise notice 'PASS  buyer cannot add item to others suite'; else raise notice 'FAIL  buyer added item to others suite'; failures := failures + 1; end if;

  -- 4) Buyer CAN add an item to own suite
  perform set_config('app.uid', buyer1, true);
  blocked := false;
  begin
    insert into public.suite_items (suite_id, listing_id) values (suite1::uuid, listing1::uuid);
    get diagnostics n = row_count;
  exception when others then blocked := true;
  end;
  if (not blocked) and n = 1 then raise notice 'PASS  buyer adds item to own suite'; else raise notice 'FAIL  buyer add own item blocked'; failures := failures + 1; end if;

  -- 5) Agent edits OWN listing
  perform set_config('app.uid', agent1, true);
  update public.listings set price = 510000 where id = listing1::uuid;
  get diagnostics n = row_count;
  if n = 1 then raise notice 'PASS  agent edits own listing'; else raise notice 'FAIL  agent edits own listing (n=%)', n; failures := failures + 1; end if;

  -- 6) Agent CANNOT edit another agent's listing
  perform set_config('app.uid', agent2, true);
  update public.listings set price = 999999 where id = listing1::uuid;
  get diagnostics n = row_count;
  if n = 0 then raise notice 'PASS  agent cannot edit others listing'; else raise notice 'FAIL  agent edited others listing (n=%)', n; failures := failures + 1; end if;

  -- 7) Broker CAN edit a listing in their brokerage (oversight)
  perform set_config('app.uid', broker1, true);
  update public.listings set price = 520000 where id = listing1::uuid;
  get diagnostics n = row_count;
  if n = 1 then raise notice 'PASS  broker edits brokerage listing (oversight)'; else raise notice 'FAIL  broker cannot edit brokerage listing (n=%)', n; failures := failures + 1; end if;

  -- 8) Team member sees team channel
  perform set_config('app.uid', agent1, true);
  select count(*) into n from public.channels where id = chan_team::uuid;
  if n = 1 then raise notice 'PASS  team member sees team channel'; else raise notice 'FAIL  team member cannot see team channel (n=%)', n; failures := failures + 1; end if;

  -- 9) Non-member does NOT see team channel
  perform set_config('app.uid', agent2, true);
  select count(*) into n from public.channels where id = chan_team::uuid;
  if n = 0 then raise notice 'PASS  non-member cannot see team channel'; else raise notice 'FAIL  non-member saw team channel (n=%)', n; failures := failures + 1; end if;

  -- 10) Broker sees team channel (oversight)
  perform set_config('app.uid', broker1, true);
  select count(*) into n from public.channels where id = chan_team::uuid;
  if n = 1 then raise notice 'PASS  broker sees team channel (oversight)'; else raise notice 'FAIL  broker cannot see team channel (n=%)', n; failures := failures + 1; end if;

  -- 11) Any brokerage member sees brokerage-wide channel
  perform set_config('app.uid', agent2, true);
  select count(*) into n from public.channels where id = chan_general::uuid;
  if n = 1 then raise notice 'PASS  member sees brokerage-wide channel'; else raise notice 'FAIL  member cannot see brokerage channel (n=%)', n; failures := failures + 1; end if;

  -- 12) Non-member CANNOT create a thread in a team channel (WITH CHECK)
  perform set_config('app.uid', agent2, true);
  blocked := false;
  begin
    insert into public.threads (channel_id, category, title, author_id)
    values (chan_team::uuid, 'Contracts', 'sneaky', agent2::uuid);
  exception when others then blocked := true;
  end;
  if blocked then raise notice 'PASS  non-member cannot post thread in team channel'; else raise notice 'FAIL  non-member posted in team channel'; failures := failures + 1; end if;

  -- 13) Team member CAN create a thread in the team channel
  perform set_config('app.uid', agent1, true);
  blocked := false;
  begin
    insert into public.threads (channel_id, category, title, author_id)
    values (chan_team::uuid, 'Contracts', 'ok', agent1::uuid);
    get diagnostics n = row_count;
  exception when others then blocked := true;
  end;
  if (not blocked) and n = 1 then raise notice 'PASS  team member posts thread in team channel'; else raise notice 'FAIL  team member blocked from own team channel'; failures := failures + 1; end if;

  reset role;
  if failures > 0 then
    raise exception '% RLS assertion(s) FAILED', failures;
  else
    raise notice 'ALL RLS ASSERTIONS PASSED';
  end if;
end $$;
