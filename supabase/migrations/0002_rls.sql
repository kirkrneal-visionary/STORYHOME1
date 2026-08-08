-- Story Home — Row Level Security
-- Database-enforced access control. Apply after 0001_init.sql.

-- Base grants: RLS (below) is the real gate; these just expose the tables.
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;

-- Enable RLS everywhere
alter table public.brokerages            enable row level security;
alter table public.profiles              enable row level security;
alter table public.teams                 enable row level security;
alter table public.team_members          enable row level security;
alter table public.listings              enable row level security;
alter table public.listing_analytics     enable row level security;
alter table public.listing_analytics_events enable row level security;
alter table public.listing_comments      enable row level security;
alter table public.suites                enable row level security;
alter table public.suite_items           enable row level security;
alter table public.follows               enable row level security;
alter table public.messages              enable row level security;
alter table public.buyers                enable row level security;
alter table public.seller_clients        enable row level security;
alter table public.referrals             enable row level security;
alter table public.inquiries             enable row level security;
alter table public.lead_claims           enable row level security;
alter table public.channels              enable row level security;
alter table public.library_folders       enable row level security;
alter table public.threads               enable row level security;
alter table public.posts                 enable row level security;
alter table public.questions             enable row level security;
alter table public.answers               enable row level security;
alter table public.boost_tiers           enable row level security;
alter table public.listing_boosts        enable row level security;

-- ---------------- profiles ----------------
create policy profiles_read on public.profiles
  for select to anon, authenticated using (true);
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- ---------------- brokerages ----------------
create policy brokerages_read on public.brokerages
  for select to authenticated using (true);
create policy brokerages_insert on public.brokerages
  for insert to authenticated with check (true);
create policy brokerages_update_broker on public.brokerages
  for update to authenticated
  using (public.is_broker_of(id, auth.uid()))
  with check (public.is_broker_of(id, auth.uid()));

-- ---------------- teams ----------------
create policy teams_read_members on public.teams
  for select to authenticated
  using (public.is_brokerage_member(brokerage_id, auth.uid()));
create policy teams_insert on public.teams
  for insert to authenticated
  with check (
    public.is_broker_of(brokerage_id, auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.brokerage_id = teams.brokerage_id
        and p.team_leader_authorized
    )
  );
create policy teams_modify on public.teams
  for update to authenticated
  using (leader_id = auth.uid() or public.is_broker_of(brokerage_id, auth.uid()))
  with check (leader_id = auth.uid() or public.is_broker_of(brokerage_id, auth.uid()));
create policy teams_delete on public.teams
  for delete to authenticated
  using (leader_id = auth.uid() or public.is_broker_of(brokerage_id, auth.uid()));

-- ---------------- team_members ----------------
create policy team_members_read on public.team_members
  for select to authenticated
  using (public.is_team_member(team_id, auth.uid())
         or exists (select 1 from public.teams t
                    where t.id = team_id
                      and public.is_broker_of(t.brokerage_id, auth.uid())));
create policy team_members_write on public.team_members
  for all to authenticated
  using (exists (select 1 from public.teams t
                 where t.id = team_id
                   and (t.leader_id = auth.uid()
                        or public.is_broker_of(t.brokerage_id, auth.uid()))))
  with check (exists (select 1 from public.teams t
                 where t.id = team_id
                   and (t.leader_id = auth.uid()
                        or public.is_broker_of(t.brokerage_id, auth.uid()))));

-- ---------------- listings (marketplace + pro edit) ----------------
create policy listings_read_public on public.listings
  for select to anon, authenticated using (true);
create policy listings_insert_own on public.listings
  for insert to authenticated with check (agent_id = auth.uid());
create policy listings_update_owner_or_broker on public.listings
  for update to authenticated
  using (agent_id = auth.uid()
         or (brokerage_id is not null and public.is_broker_of(brokerage_id, auth.uid())))
  with check (agent_id = auth.uid()
         or (brokerage_id is not null and public.is_broker_of(brokerage_id, auth.uid())));
create policy listings_delete_owner_or_broker on public.listings
  for delete to authenticated
  using (agent_id = auth.uid()
         or (brokerage_id is not null and public.is_broker_of(brokerage_id, auth.uid())));

-- ---------------- listing_analytics (owner/broker only) ----------------
create policy listing_analytics_read on public.listing_analytics
  for select to authenticated
  using (exists (select 1 from public.listings l
                 where l.id = listing_id
                   and (l.agent_id = auth.uid()
                        or (l.brokerage_id is not null
                            and public.is_broker_of(l.brokerage_id, auth.uid())))));

create policy listing_analytics_events_read on public.listing_analytics_events
  for select to authenticated
  using (exists (select 1 from public.listings l
                 where l.id = listing_id and l.agent_id = auth.uid()));
create policy listing_analytics_events_insert on public.listing_analytics_events
  for insert to authenticated with check (true);

-- ---------------- listing_comments ----------------
create policy listing_comments_read on public.listing_comments
  for select to anon, authenticated using (true);
create policy listing_comments_insert on public.listing_comments
  for insert to authenticated with check (user_id = auth.uid());
create policy listing_comments_modify on public.listing_comments
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy listing_comments_delete on public.listing_comments
  for delete to authenticated using (user_id = auth.uid());

-- ---------------- suites (buyer owns their own) ----------------
create policy suites_all_own on public.suites
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy suite_items_all_own on public.suite_items
  for all to authenticated
  using (exists (select 1 from public.suites s
                 where s.id = suite_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.suites s
                 where s.id = suite_id and s.user_id = auth.uid()));

-- ---------------- follows ----------------
create policy follows_all_own on public.follows
  for all to authenticated
  using (follower_id = auth.uid()) with check (follower_id = auth.uid());

-- ---------------- messages ----------------
create policy messages_read on public.messages
  for select to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy messages_insert on public.messages
  for insert to authenticated with check (sender_id = auth.uid());
create policy messages_update_receiver on public.messages
  for update to authenticated
  using (receiver_id = auth.uid()) with check (receiver_id = auth.uid());

-- ---------------- buyers / seller_clients (owner agent) ----------------
create policy buyers_all_own on public.buyers
  for all to authenticated
  using (agent_id = auth.uid()) with check (agent_id = auth.uid());
create policy seller_clients_all_own on public.seller_clients
  for all to authenticated
  using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- ---------------- referrals ----------------
create policy referrals_read on public.referrals
  for select to authenticated using (true);
create policy referrals_insert on public.referrals
  for insert to authenticated with check (poster_id = auth.uid());
create policy referrals_update on public.referrals
  for update to authenticated
  using (poster_id = auth.uid() or claimer_id = auth.uid())
  with check (poster_id = auth.uid() or claimer_id = auth.uid());

-- ---------------- inquiries / lead_claims ----------------
create policy inquiries_read on public.inquiries
  for select to authenticated
  using (consumer_id = auth.uid() or agent_id = auth.uid());
create policy inquiries_insert on public.inquiries
  for insert to authenticated with check (consumer_id = auth.uid());

create policy lead_claims_read on public.lead_claims
  for select to authenticated
  using (agent_id = auth.uid() or consumer_id = auth.uid());
create policy lead_claims_insert on public.lead_claims
  for insert to authenticated with check (agent_id = auth.uid());

-- ---------------- channels (team-private visibility) ----------------
create policy channels_read on public.channels
  for select to authenticated
  using (public.can_view_channel(id, auth.uid()));
create policy channels_write on public.channels
  for all to authenticated
  using (public.is_broker_of(brokerage_id, auth.uid())
         or (team_id is not null and public.is_team_member(team_id, auth.uid())))
  with check (public.is_broker_of(brokerage_id, auth.uid())
         or (team_id is not null and public.is_team_member(team_id, auth.uid())));

-- ---------------- library_folders (broker curates) ----------------
create policy library_folders_read on public.library_folders
  for select to authenticated
  using (public.is_brokerage_member(brokerage_id, auth.uid()));
create policy library_folders_write on public.library_folders
  for all to authenticated
  using (public.is_broker_of(brokerage_id, auth.uid()))
  with check (public.is_broker_of(brokerage_id, auth.uid()));

-- ---------------- threads ----------------
create policy threads_read on public.threads
  for select to authenticated
  using (public.can_view_channel(channel_id, auth.uid()));
create policy threads_insert on public.threads
  for insert to authenticated
  with check (author_id = auth.uid() and public.can_view_channel(channel_id, auth.uid()));
create policy threads_modify on public.threads
  for update to authenticated
  using (author_id = auth.uid()
         or exists (select 1 from public.channels c
                    where c.id = channel_id
                      and public.is_broker_of(c.brokerage_id, auth.uid())))
  with check (true);
create policy threads_delete on public.threads
  for delete to authenticated
  using (author_id = auth.uid()
         or exists (select 1 from public.channels c
                    where c.id = channel_id
                      and public.is_broker_of(c.brokerage_id, auth.uid())));

-- ---------------- posts ----------------
create policy posts_read on public.posts
  for select to authenticated
  using (exists (select 1 from public.threads t
                 where t.id = thread_id
                   and public.can_view_channel(t.channel_id, auth.uid())));
create policy posts_insert on public.posts
  for insert to authenticated
  with check (author_id = auth.uid()
              and exists (select 1 from public.threads t
                          where t.id = thread_id
                            and public.can_view_channel(t.channel_id, auth.uid())));
create policy posts_modify on public.posts
  for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy posts_delete on public.posts
  for delete to authenticated using (author_id = auth.uid());

-- ---------------- questions / answers (public Q&A) ----------------
create policy questions_read on public.questions
  for select to authenticated using (true);
create policy questions_insert on public.questions
  for insert to authenticated with check (author_id = auth.uid());
create policy questions_update on public.questions
  for update to authenticated
  using (author_id = auth.uid() or public.account_kind(auth.uid()) = 'broker')
  with check (author_id = auth.uid() or public.account_kind(auth.uid()) = 'broker');

create policy answers_read on public.answers
  for select to authenticated using (true);
create policy answers_insert on public.answers
  for insert to authenticated with check (author_id = auth.uid());
create policy answers_modify on public.answers
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy answers_delete on public.answers
  for delete to authenticated using (author_id = auth.uid());

-- ---------------- boosts ----------------
create policy boost_tiers_read on public.boost_tiers
  for select to anon, authenticated using (true);
create policy listing_boosts_read on public.listing_boosts
  for select to authenticated
  using (exists (select 1 from public.listings l
                 where l.id = listing_id
                   and (l.agent_id = auth.uid()
                        or (l.brokerage_id is not null
                            and public.is_broker_of(l.brokerage_id, auth.uid())))));
-- Writes to listing_boosts go through the server (service_role) with the
-- assert_boost_slot_available() check; no authenticated write policy on purpose.
