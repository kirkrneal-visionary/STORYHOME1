-- Isolated County Stories Wave 2 proofs. Not production.
select set_config('request.jwt.claim.role', 'service_role', false);

do $$
declare
  media_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  kept_id uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  n int;
begin
  insert into public.county_story_media (
    id, professional_owner_id, purpose, state, storage_path, expires_at
  ) values (
    media_id,
    'b2222222-2222-2222-2222-222222222222',
    'original',
    'valid',
    'b2222222-2222-2222-2222-222222222222/' || media_id || '/original.mp4',
    now() + interval '6 hours'
  );
  select count(*) into n from public.county_story_slots;
  if n <> 0 then raise exception 'slot_created_on_stage %', n; end if;
  select count(*) into n from public.county_story_days;
  if n <> 0 then raise exception 'capacity_row_on_stage %', n; end if;
  raise notice 'stage_does_not_create_slot';
end
$$;

do $$
begin
  begin
    insert into public.county_story_media (
      professional_owner_id, purpose, state, storage_path, expires_at
    ) values (
      'a1111111-1111-1111-1111-111111111111',
      'original',
      'created',
      'a1111111-1111-1111-1111-111111111111/x/original.mp4',
      now() + interval '6 hours'
    );
    raise exception 'consumer_media_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'consumer_media_allowed' then raise; end if;
      raise;
  end;
  raise notice 'consumer_media_denied';
end
$$;

do $$
begin
  begin
    insert into public.county_story_media (
      professional_owner_id, purpose, state, storage_path, expires_at
    ) values (
      'e5555555-5555-5555-5555-555555555555',
      'original',
      'created',
      'e5555555-5555-5555-5555-555555555555/x/original.mp4',
      now() + interval '6 hours'
    );
    raise exception 'other_professional_media_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'other_professional_media_allowed' then raise; end if;
      raise;
  end;
  raise notice 'other_professional_media_denied';
end
$$;

do $$
begin
  begin
    insert into public.county_story_media (
      professional_owner_id, purpose, state, storage_path, expires_at
    ) values (
      'b2222222-2222-2222-2222-222222222222',
      'original',
      'created',
      'c3333333-3333-3333-3333-333333333333/stolen/original.mp4',
      now() + interval '6 hours'
    );
    raise exception 'owner_path_mismatch_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'owner_path_mismatch_allowed' then raise; end if;
      raise;
  end;
  raise notice 'owner_path_enforced';
end
$$;

do $$
begin
  begin
    set local role anon;
    insert into public.county_story_media (
      professional_owner_id, purpose, state, storage_path, expires_at
    ) values (
      'd4444444-4444-4444-4444-444444444444',
      'original',
      'created',
      'd4444444-4444-4444-4444-444444444444/x/original.mp4',
      now() + interval '6 hours'
    );
    raise exception 'anon_media_write_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'anon_media_write_allowed' then raise; end if;
      raise;
  end;
  reset role;
  perform set_config('request.jwt.claim.role', 'service_role', false);
  raise notice 'anon_media_write_denied';
end
$$;

do $$
begin
  begin
    set local role authenticated;
    insert into public.county_story_media (
      professional_owner_id, purpose, state, storage_path, expires_at
    ) values (
      'd4444444-4444-4444-4444-444444444444',
      'original',
      'created',
      'd4444444-4444-4444-4444-444444444444/y/original.mp4',
      now() + interval '6 hours'
    );
    raise exception 'authenticated_media_write_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'authenticated_media_write_allowed' then raise; end if;
      raise;
  end;
  reset role;
  perform set_config('request.jwt.claim.role', 'service_role', false);
  raise notice 'authenticated_media_write_denied';
end
$$;

do $$
begin
  begin
    set local role anon;
    perform 1 from public.county_story_media;
    raise exception 'anon_media_select_allowed';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm = 'anon_media_select_allowed' then raise; end if;
      raise;
  end;
  reset role;
  perform set_config('request.jwt.claim.role', 'service_role', false);
  raise notice 'anon_media_select_denied';
end
$$;

do $$
declare
  expired_id uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  kept_id uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  slot_id uuid;
  n int;
begin
  insert into public.county_story_days (county_fips, story_day, accepted_count)
    values ('48373', date '2026-09-24', 1);
  insert into public.county_story_slots (
    professional_owner_id, county_fips, story_day, slot_number, state
  ) values (
    'c3333333-3333-3333-3333-333333333333',
    '48373',
    date '2026-09-24',
    1,
    'accepted'
  ) returning id into slot_id;

  insert into public.county_story_media (
    id, professional_owner_id, purpose, state, storage_path, expires_at, slot_id
  ) values (
    kept_id,
    'c3333333-3333-3333-3333-333333333333',
    'original',
    'valid',
    'c3333333-3333-3333-3333-333333333333/' || kept_id || '/original.mp4',
    now() - interval '1 hour',
    slot_id
  );
  insert into public.county_story_media (
    id, professional_owner_id, purpose, state, storage_path, expires_at
  ) values (
    expired_id,
    'd4444444-4444-4444-4444-444444444444',
    'original',
    'valid',
    'd4444444-4444-4444-4444-444444444444/' || expired_id || '/original.mp4',
    now() - interval '1 hour'
  );

  perform * from public.county_story_media_cleanup_expired(now());

  if (select state from public.county_story_media where id = expired_id) <> 'deleted' then
    raise exception 'expired_not_cleaned';
  end if;
  if (select state from public.county_story_media where id = kept_id) <> 'valid' then
    raise exception 'slot_media_cleaned';
  end if;
  select accepted_count into n from public.county_story_days
    where county_fips = '48373' and story_day = date '2026-09-24';
  if n <> 1 then raise exception 'capacity_changed_on_cleanup %', n; end if;
  if (select count(*) from public.county_story_slots) <> 1 then
    raise exception 'slot_changed_on_cleanup';
  end if;
  raise notice 'cleanup_expired_only';
end
$$;

do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'county-story-media' and public is not true
  ) then
    raise exception 'bucket_missing_or_public';
  end if;
  if exists (
    select 1 from storage.buckets
    where id in ('home-docs', 'shi-studies', 'living-marks')
  ) then
    raise exception 'existing_buckets_touched';
  end if;
  raise notice 'private_bucket_only';
end
$$;

select 'wave2_slots_untouched'
where (select count(*) from public.county_story_slots) = 1
  and (select count(*) from public.county_story_activation) = 7
  and (select count(*) from public.county_story_media where state = 'deleted') = 1;
