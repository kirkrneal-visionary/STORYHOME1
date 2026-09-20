-- Isolated P1C-3A1 proofs. Not production.
\set ON_ERROR_STOP on
create temporary table p1c3a1_proofs (name text primary key);
create or replace function pg_temp.ok(n text)
returns void language plpgsql as $$
begin insert into p1c3a1_proofs values (n); end; $$;
create or replace function pg_temp.as_server()
returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.role', 'service_role', false); end; $$;
create or replace function pg_temp.denied(n text, q text, pat text)
returns void language plpgsql as $$
begin
  begin
    execute q;
    raise exception 'FAIL %', n;
  exception
    when others then
      if sqlerrm ilike '%FAIL %' then raise; end if;
      if sqlerrm not ilike pat then raise exception '% => %', n, sqlerrm; end if;
      perform pg_temp.ok(n);
  end;
end; $$;

do $$
declare n int; pointer uuid; city text; sponsor text;
begin
  perform pg_temp.as_server();
  select brokerage_id into pointer from public.profiles
   where id = 'b2222222-2222-2222-2222-222222222222';
  insert into public.professional_brokerage_relationships
    (professional_id, brokerage_id, relationship_type, status, source, effective_from, effective_end)
    values
    ('b2222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111',
     'sponsored_agent','ended','office_accept', now() - interval '30 days', now() - interval '1 day'),
    ('d4444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222',
     'managing_broker_of','active','create_office', now(), null);
  perform pg_temp.ok('types_and_states_accepted');
  perform pg_temp.denied('unsupported_type_rejected',
    $q$insert into public.professional_brokerage_relationships
      (professional_id, brokerage_id, relationship_type, status) values
      ('b2222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222','office_member','active')$q$,
    '%check%');
  perform pg_temp.denied('unsupported_state_rejected',
    $q$insert into public.professional_brokerage_relationships
      (professional_id, brokerage_id, relationship_type, status) values
      ('b2222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222','sponsored_agent','pending')$q$,
    '%check%');
  insert into public.professional_brokerage_relationships
    (professional_id, brokerage_id, relationship_type, status, source)
    values ('b2222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222',
            'sponsored_agent','active','office_accept');
  perform pg_temp.denied('one_active_relationship',
    $q$insert into public.professional_brokerage_relationships
      (professional_id, brokerage_id, relationship_type, status) values
      ('b2222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','sponsored_agent','active')$q$,
    '%unique%');
  select count(*) into n from public.professional_brokerage_relationships
   where professional_id = 'b2222222-2222-2222-2222-222222222222';
  if n <> 2 then raise exception 'history count %', n; end if;
  perform pg_temp.ok('ended_and_other_brokerage_coexist');
  perform pg_temp.denied('consumer_write_denied',
    $q$insert into public.professional_brokerage_relationships
      (professional_id, brokerage_id, relationship_type, status) values
      ('a1111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','sponsored_agent','active')$q$,
    '%realtor-only%');
  perform pg_temp.denied('other_professional_write_denied',
    $q$insert into public.professional_brokerage_relationships
      (professional_id, brokerage_id, relationship_type, status) values
      ('e5555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111','sponsored_agent','active')$q$,
    '%realtor-only%');
  if (select brokerage_id from public.profiles
        where id = 'b2222222-2222-2222-2222-222222222222') is distinct from pointer then
    raise exception 'pointer mutated';
  end if;
  select primary_market_city, sponsor_name into city, sponsor
    from public.profiles where id = 'b2222222-2222-2222-2222-222222222222';
  if city is distinct from 'Livingston' or sponsor is distinct from 'Old Sponsor' then
    raise exception 'presentation mutated';
  end if;
  perform pg_temp.ok('pointer_and_sponsor_unchanged');
end;
$$;

do $$
begin
  begin
    execute $q$set role authenticated; insert into public.professional_brokerage_relationships
      (professional_id, brokerage_id, relationship_type, status) values
      ('b2222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','sponsored_agent','ended')$q$;
    reset role; raise exception 'FAIL realtor_direct_write_denied';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' then raise; end if;
    perform pg_temp.ok('realtor_direct_write_denied');
  end;
  begin
    execute $q$set role authenticated; insert into public.professional_brokerage_relationships
      (professional_id, brokerage_id, relationship_type, status) values
      ('c3333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','sponsored_agent','active')$q$;
    reset role; raise exception 'FAIL cross_account_write_denied';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' then raise; end if;
    perform pg_temp.ok('cross_account_write_denied');
  end;
  begin
    execute $q$set role anon; select count(*) from public.professional_brokerage_relationships$q$;
    reset role; raise exception 'FAIL anon_read_denied';
  exception when others then
    reset role;
    if sqlerrm not ilike '%permission denied%' then raise; end if;
    perform pg_temp.ok('anon_read_denied');
  end;
end;
$$;
select name from p1c3a1_proofs order by name;
