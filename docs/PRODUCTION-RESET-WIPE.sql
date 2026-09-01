-- Founder approved 2026-09-01: wipe 23 test users + the 1 listing.
-- Does NOT touch county parcels, CAD, maps, or land data.
-- Parcel count is snapshotted (not hardcoded) so a CAD refresh cannot abort the wipe.

begin;

do $$
declare
  n bigint;
begin
  select count(*) into n from public.county_parcels;
  if n < 300000 then
    raise exception 'STOP: county_parcels is % — wrong database? Nothing deleted.', n;
  end if;
  perform set_config('reset.parcels_before', n::text, true);
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'public.billing_webhook_events',
    'public.billing_subscriptions',
    'public.billing_customers',
    'public.agent_world_engagement',
    'public.product_analytics_events',
    'public.listing_analytics_events',
    'public.listing_analytics',
    'public.listing_boosts',
    'public.listing_comments',
    'public.listing_parcels',
    'public.inquiries',
    'public.lead_claims',
    'public.messages',
    'public.referrals',
    'public.follows',
    'public.suite_items',
    'public.suites',
    'public.saved_searches',
    'public.crm_activities',
    'public.crm_campaigns',
    'public.buyers',
    'public.seller_clients',
    'public.shi_prospect_notes',
    'public.shi_prospects',
    'public.shi_farm_baselines',
    'public.shi_farms',
    'public.shi_frame_snapshots',
    'public.shi_market_frames',
    'public.shi_study_folders',
    'public.home_access_audit',
    'public.home_access_grants',
    'public.home_documents',
    'public.home_expenses',
    'public.home_records',
    'public.home_disclosures',
    'public.home_structures',
    'public.home_folders',
    'public.home_parcels',
    'public.homes',
    'public.posts',
    'public.answers',
    'public.questions',
    'public.threads',
    'public.library_folders',
    'public.channels',
    'public.team_members',
    'public.brokerage_invites'
  ]
  loop
    if to_regclass(t) is not null then
      execute format('delete from %s', t);
    end if;
  end loop;
end $$;

update public.brokerages set broker_id = null where broker_id is not null;

delete from public.listings;
delete from public.teams;
delete from public.profiles;
delete from public.brokerages
where not exists (select 1 from public.profiles p where p.brokerage_id = brokerages.id);

do $$
begin
  delete from storage.objects
  where bucket_id in ('home-docs', 'shi-studies', 'living-marks');
exception
  when others then
    raise notice 'storage.objects skip: %', sqlerrm;
end $$;

delete from auth.users;

do $$
declare
  parcels bigint;
  before bigint;
  users bigint;
  listings bigint;
begin
  before := current_setting('reset.parcels_before')::bigint;
  select count(*) into parcels from public.county_parcels;
  select count(*) into users from auth.users;
  select count(*) into listings from public.listings;
  if parcels <> before then
    raise exception 'STOP: county_parcels was % now %. Nothing stays deleted.', before, parcels;
  end if;
  if users <> 0 then
    raise exception 'STOP: auth.users still has %. Nothing stays deleted.', users;
  end if;
  if listings <> 0 then
    raise exception 'STOP: listings still has %. Nothing stays deleted.', listings;
  end if;
end $$;

commit;

select 'auth.users' as item, count(*)::bigint as n from auth.users
union all select 'profiles', count(*) from public.profiles
union all select 'listings', count(*) from public.listings
union all select 'shi_prospects', count(*) from public.shi_prospects
union all select 'shi_farms', count(*) from public.shi_farms
union all select 'shi_study_folders', count(*) from public.shi_study_folders
union all select 'homes', count(*) from public.homes
union all select 'inquiries', count(*) from public.inquiries
union all select 'product_analytics_events', count(*) from public.product_analytics_events
union all select 'county_parcels', count(*) from public.county_parcels;
