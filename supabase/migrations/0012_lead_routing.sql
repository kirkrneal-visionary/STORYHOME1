-- ---------------------------------------------------------------------------
-- Wave E — Leads Inbox & 15-minute Claim Routing
--
-- Consumer inquiries + lead_claims tables and their RLS already exist
-- (0001/0002). RLS limits an agent to inquiries on their own listings, but fair
-- routing needs the consumer's FULL cross-agent inquiry order. Two SECURITY
-- DEFINER helpers bridge that safely:
--   * agent_lead_feed()  — returns the inquiries + claims for every consumer who
--     inquired on one of the calling agent's listings, so the client can run the
--     (pure, tested) routing algorithm and render each agent's own windows.
--   * claim_lead()       — enforces the 15-minute sequential-window rule server-
--     side so an agent can only claim during their active window, first-come.
-- No paid services; pure Postgres.
-- ---------------------------------------------------------------------------

create or replace function public.agent_lead_feed()
returns jsonb language sql stable security definer set search_path = public as $$
  with relevant as (
    select distinct consumer_id from public.inquiries where agent_id = auth.uid()
  )
  select jsonb_build_object(
    'inquiries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'consumerId', i.consumer_id,
        'consumerName', cp.full_name,
        'listingId', i.listing_id,
        'listingLabel', l.address_serif,
        'agentId', i.agent_id,
        'agentName', ap.full_name,
        'createdAt', (extract(epoch from i.created_at) * 1000)::bigint
      ))
      from public.inquiries i
      join public.profiles cp on cp.id = i.consumer_id
      join public.listings l on l.id = i.listing_id
      join public.profiles ap on ap.id = i.agent_id
      where i.consumer_id in (select consumer_id from relevant)
    ), '[]'::jsonb),
    'claims', coalesce((
      select jsonb_agg(jsonb_build_object(
        'consumerId', c.consumer_id,
        'listingId', c.listing_id,
        'agentId', c.agent_id,
        'claimedAt', (extract(epoch from c.claimed_at) * 1000)::bigint
      ))
      from public.lead_claims c
      where c.consumer_id in (select consumer_id from relevant)
    ), '[]'::jsonb)
  );
$$;
grant execute on function public.agent_lead_feed() to authenticated;

create or replace function public.claim_lead(p_consumer uuid, p_listing uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  rec record;
  v_agent uuid := auth.uid();
  v_now timestamptz := now();
  v_cursor timestamptz := null;
  v_opens timestamptz;
  v_expires timestamptz;
  v_window interval := interval '15 minutes';
begin
  if exists (select 1 from public.lead_claims where consumer_id = p_consumer) then
    return case
      when exists (select 1 from public.lead_claims where consumer_id = p_consumer and agent_id = v_agent)
      then 'already_yours' else 'taken' end;
  end if;

  for rec in
    with firsts as (
      select distinct on (listing_id) listing_id, agent_id, created_at
      from public.inquiries
      where consumer_id = p_consumer
      order by listing_id, created_at
    )
    select * from firsts order by created_at
  loop
    v_opens := greatest(coalesce(v_cursor, rec.created_at), rec.created_at);
    v_expires := v_opens + v_window;
    if rec.listing_id = p_listing and rec.agent_id = v_agent then
      if v_now >= v_opens and v_now < v_expires then
        insert into public.lead_claims (consumer_id, listing_id, agent_id)
          values (p_consumer, p_listing, v_agent)
          on conflict (consumer_id) do nothing;
        return case
          when exists (select 1 from public.lead_claims where consumer_id = p_consumer and agent_id = v_agent)
          then 'claimed' else 'taken' end;
      else
        return 'not_your_window';
      end if;
    end if;
    v_cursor := v_expires;
  end loop;
  return 'not_found';
end;
$$;
grant execute on function public.claim_lead(uuid, uuid) to authenticated;
