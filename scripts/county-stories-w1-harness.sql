-- Isolated County Stories Wave 1 proofs. Not production.
-- Session-level (not transaction-local) so later DO blocks keep service_role.
select set_config('request.jwt.claim.role', 'service_role', false);

do $$
declare
  day_before date;
  day_at date;
  reset_before timestamptz;
  reset_at timestamptz;
begin
  day_before := public.county_story_day('2026-09-24 07:59:59.999-05'::timestamptz);
  day_at := public.county_story_day('2026-09-24 08:00:00-05'::timestamptz);
  if day_before <> date '2026-09-23' then
    raise exception 'story_day_before %', day_before;
  end if;
  if day_at <> date '2026-09-24' then
    raise exception 'story_day_at %', day_at;
  end if;
  raise notice 'story_day_0759_0800';

  reset_before := public.county_story_next_reset('2026-09-24 07:59:59.999-05'::timestamptz);
  reset_at := public.county_story_next_reset('2026-09-24 08:00:00-05'::timestamptz);
  if reset_before <> timestamptz '2026-09-24 08:00:00-05' then
    raise exception 'reset_before %', reset_before;
  end if;
  if reset_at <> timestamptz '2026-09-25 08:00:00-05' then
    raise exception 'reset_at %', reset_at;
  end if;
  raise notice 'story_day_rollover';
end
$$;

do $$
begin
  if public.county_story_day('2026-03-08 07:59:00-05'::timestamptz) <> date '2026-03-07' then
    raise exception 'dst_spring_before';
  end if;
  if public.county_story_day('2026-03-08 08:00:00-05'::timestamptz) <> date '2026-03-08' then
    raise exception 'dst_spring_at';
  end if;
  if public.county_story_next_reset('2026-03-08 07:59:00-05'::timestamptz)
       <> timestamptz '2026-03-08 08:00:00-05' then
    raise exception 'dst_spring_reset';
  end if;
  raise notice 'dst_spring';

  if public.county_story_day('2026-11-01 07:59:00-06'::timestamptz) <> date '2026-10-31' then
    raise exception 'dst_fall_before';
  end if;
  if public.county_story_day('2026-11-01 08:00:00-06'::timestamptz) <> date '2026-11-01' then
    raise exception 'dst_fall_at';
  end if;
  if public.county_story_next_reset('2026-11-01 08:00:00-06'::timestamptz)
       <> timestamptz '2026-11-02 08:00:00-06' then
    raise exception 'dst_fall_reset';
  end if;
  raise notice 'dst_fall';

  -- Clock skip 2026-03-08 02:00 CST → 03:00 CDT. Both sides stay on prior Story Day.
  if public.county_story_day('2026-03-08 01:59:00-06'::timestamptz) <> date '2026-03-07' then
    raise exception 'dst_spring_clock_before';
  end if;
  if public.county_story_day('2026-03-08 03:00:00-05'::timestamptz) <> date '2026-03-07' then
    raise exception 'dst_spring_clock_after';
  end if;
  if public.county_story_next_reset('2026-03-08 01:59:00-06'::timestamptz)
       <> timestamptz '2026-03-08 08:00:00-05' then
    raise exception 'dst_spring_clock_reset';
  end if;

  -- Clock repeat 2026-11-01 02:00 CDT → 01:00 CST. Both sides stay on prior Story Day.
  if public.county_story_day('2026-11-01 01:59:00-05'::timestamptz) <> date '2026-10-31' then
    raise exception 'dst_fall_clock_before';
  end if;
  if public.county_story_day('2026-11-01 01:00:00-06'::timestamptz) <> date '2026-10-31' then
    raise exception 'dst_fall_clock_after';
  end if;
  if public.county_story_next_reset('2026-11-01 01:00:00-06'::timestamptz)
       <> timestamptz '2026-11-01 08:00:00-06' then
    raise exception 'dst_fall_clock_reset';
  end if;
  raise notice 'dst_clock_transitions';
end
$$;

do $$
declare
  n int;
begin
  select count(*) into n from public.county_story_activation where is_active;
  if n <> 7 then raise exception 'active_count %', n; end if;
  if exists (
    select 1 from public.county_story_activation
    where county_fips not in (
      '48005','48291','48373','48407','48455','48457','48471'
    )
  ) then
    raise exception 'extra_active';
  end if;
  if exists (
    select 1 from public.county_story_activation where county_fips = '48339'
  ) then
    raise exception 'montgomery_active';
  end if;
  if not exists (
    select 1 from public.tx_counties
    where county_fips = '48339' and canonical_name = 'Montgomery County'
  ) then
    raise exception 'montgomery_missing';
  end if;
  if public.county_story_county_is_active('48373') is not true then
    raise exception 'polk_inactive';
  end if;
  if public.county_story_county_is_active('48339') is not false then
    raise exception 'montgomery_fn_active';
  end if;
  if (select canonical_name from public.tx_counties where county_fips = '48005')
       <> 'Angelina County'
    or (select canonical_name from public.tx_counties where county_fips = '48291')
       <> 'Liberty County'
    or (select canonical_name from public.tx_counties where county_fips = '48373')
       <> 'Polk County'
    or (select canonical_name from public.tx_counties where county_fips = '48407')
       <> 'San Jacinto County'
    or (select canonical_name from public.tx_counties where county_fips = '48455')
       <> 'Trinity County'
    or (select canonical_name from public.tx_counties where county_fips = '48457')
       <> 'Tyler County'
    or (select canonical_name from public.tx_counties where county_fips = '48471')
       <> 'Walker County'
  then
    raise exception 'launch_fips_name_mismatch';
  end if;
  raise notice 'launch_seven_montgomery_denied';
end
$$;

do $$
begin
  if public.county_story_publisher_eligible('b2222222-2222-2222-2222-222222222222')
       is not true then
    raise exception 'agent_without_brokerage_denied';
  end if;
  if public.county_story_publisher_eligible('d4444444-4444-4444-4444-444444444444')
       is not true then
    raise exception 'solo_broker_denied';
  end if;
  if public.county_story_publisher_eligible('e5555555-5555-5555-5555-555555555555')
       is not false then
    raise exception 'other_professional_allowed';
  end if;
  if public.county_story_publisher_eligible('a1111111-1111-1111-1111-111111111111')
       is not false then
    raise exception 'consumer_allowed';
  end if;
  raise notice 'eligibility_foundation';
end
$$;

do $$
begin
  insert into public.county_story_days (county_fips, story_day, accepted_count)
    values ('48373', date '2026-09-24', 1);
  insert into public.county_story_slots (
    professional_owner_id, county_fips, story_day, slot_number, state,
    story_type, listing_id, brokerage_id
  ) values (
    'b2222222-2222-2222-2222-222222222222',
    '48373',
    date '2026-09-24',
    1,
    'accepted',
    'open_house_property',
    null,
    null
  );
  raise notice 'nullable_listing_and_brokerage';
end
$$;

do $$
begin
  begin
    insert into public.county_story_slots (
      professional_owner_id, county_fips, story_day, slot_number, state
    ) values (
      'c3333333-3333-3333-3333-333333333333',
      '48373',
      date '2026-09-24',
      31,
      'accepted'
    );
    raise exception 'slot_31_allowed';
  exception
    when check_violation then null;
    when others then
      if sqlerrm = 'slot_31_allowed' then raise; end if;
      raise;
  end;
  raise notice 'slot_over_30_rejected';
end
$$;

do $$
begin
  begin
    insert into public.county_story_slots (
      professional_owner_id, county_fips, story_day, slot_number, state
    ) values (
      'c3333333-3333-3333-3333-333333333333',
      '48373',
      date '2026-09-24',
      1,
      'accepted'
    );
    raise exception 'duplicate_slot_allowed';
  exception
    when unique_violation then null;
    when others then
      if sqlerrm = 'duplicate_slot_allowed' then raise; end if;
      raise;
  end;
  raise notice 'duplicate_county_day_slot_rejected';
end
$$;

do $$
begin
  begin
    insert into public.county_story_slots (
      professional_owner_id, county_fips, story_day, slot_number, state
    ) values (
      'b2222222-2222-2222-2222-222222222222',
      '48005',
      date '2026-09-24',
      1,
      'accepted'
    );
    raise exception 'second_owner_day_allowed';
  exception
    when unique_violation then null;
    when others then
      if sqlerrm = 'second_owner_day_allowed' then raise; end if;
      raise;
  end;
  raise notice 'one_slot_per_professional_day';
end
$$;

do $$
begin
  begin
    insert into public.county_story_slots (
      professional_owner_id, county_fips, story_day, slot_number, state
    ) values (
      'e5555555-5555-5555-5555-555555555555',
      '48373',
      date '2026-09-24',
      2,
      'accepted'
    );
    raise exception 'other_professional_slot_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'other_professional_slot_allowed' then raise; end if;
      raise;
  end;
  raise notice 'other_professional_denied';
end
$$;

do $$
begin
  begin
    insert into public.county_story_slots (
      professional_owner_id, county_fips, story_day, slot_number, state
    ) values (
      'c3333333-3333-3333-3333-333333333333',
      '48339',
      date '2026-09-24',
      1,
      'accepted'
    );
    raise exception 'montgomery_slot_allowed';
  exception
    when check_violation then null;
    when others then
      if sqlerrm = 'montgomery_slot_allowed' then raise; end if;
      raise;
  end;
  raise notice 'montgomery_slot_denied';
end
$$;

do $$
begin
  insert into public.county_story_slots (
    professional_owner_id, county_fips, story_day, slot_number, state,
    listing_id
  ) values (
    'c3333333-3333-3333-3333-333333333333',
    '48471',
    date '2026-09-24',
    1,
    'accepted',
    '11111111-1111-1111-1111-111111111111'
  );
  insert into public.county_story_publish_intents (
    professional_owner_id, idempotency_key, operation, result_code
  ) values (
    'c3333333-3333-3333-3333-333333333333',
    'intent-walker-1',
    'publish',
    'ACCEPTED'
  );
  begin
    insert into public.county_story_publish_intents (
      professional_owner_id, idempotency_key, operation
    ) values (
      'c3333333-3333-3333-3333-333333333333',
      'intent-walker-1',
      'publish'
    );
    raise exception 'duplicate_intent_allowed';
  exception
    when unique_violation then null;
    when others then
      if sqlerrm = 'duplicate_intent_allowed' then raise; end if;
      raise;
  end;
  raise notice 'idempotency_unique';
end
$$;

do $$
begin
  begin
    set local role anon;
    insert into public.county_story_slots (
      professional_owner_id, county_fips, story_day, slot_number, state
    ) values (
      'd4444444-4444-4444-4444-444444444444',
      '48291',
      date '2026-09-24',
      1,
      'accepted'
    );
    raise exception 'anon_write_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'anon_write_allowed' then raise; end if;
      raise;
  end;
  reset role;
  perform set_config('request.jwt.claim.role', 'service_role', false);
  raise notice 'anon_write_denied';
end
$$;

do $$
begin
  begin
    set local role authenticated;
    insert into public.county_story_slots (
      professional_owner_id, county_fips, story_day, slot_number, state
    ) values (
      'd4444444-4444-4444-4444-444444444444',
      '48291',
      date '2026-09-24',
      1,
      'accepted'
    );
    raise exception 'authenticated_write_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'authenticated_write_allowed' then raise; end if;
      raise;
  end;
  reset role;
  perform set_config('request.jwt.claim.role', 'service_role', false);
  raise notice 'authenticated_write_denied';
end
$$;

do $$
begin
  begin
    set local role authenticated;
    update public.county_story_slots
       set slot_number = 2
     where professional_owner_id = 'b2222222-2222-2222-2222-222222222222';
    raise exception 'authenticated_mutate_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'authenticated_mutate_allowed' then raise; end if;
      raise;
  end;
  reset role;
  perform set_config('request.jwt.claim.role', 'service_role', false);
  raise notice 'authenticated_mutate_denied';
end
$$;

do $$
begin
  begin
    set local role anon;
    perform 1 from public.county_story_slots;
    raise exception 'anon_select_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'anon_select_allowed' then raise; end if;
      raise;
  end;
  reset role;
  perform set_config('request.jwt.claim.role', 'service_role', false);
  raise notice 'anon_select_denied';
end
$$;

do $$
begin
  begin
    set local role authenticated;
    perform 1 from public.county_story_slots;
    raise exception 'authenticated_select_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'authenticated_select_allowed' then raise; end if;
      raise;
  end;
  reset role;
  perform set_config('request.jwt.claim.role', 'service_role', false);
  raise notice 'authenticated_select_denied';
end
$$;

select 'service_slots_consistent'
where (select count(*) from public.county_story_slots) = 2
  and (select count(*) from public.county_story_activation) = 7;
