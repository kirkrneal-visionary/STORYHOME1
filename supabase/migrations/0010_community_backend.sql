-- ---------------------------------------------------------------------------
-- Wave C — Community Backend
--
-- The community content tables (channels, threads, posts, questions, answers,
-- library_folders, teams, team_members) and their broker-authority RLS already
-- exist from 0001/0002. This wave only needs one privileged helper: a broker
-- authorizing an agent as a team leader means writing to ANOTHER profile row,
-- which the self-only profiles RLS forbids — so we do it through a SECURITY
-- DEFINER function gated to the brokerage's broker.
-- ---------------------------------------------------------------------------

create or replace function public.set_team_leader_authorized(
  p_agent uuid,
  p_authorized boolean
)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_brok uuid;
begin
  select brokerage_id into v_brok from public.profiles where id = p_agent;
  if v_brok is null then return false; end if;
  if not public.is_broker_of(v_brok, auth.uid()) then return false; end if;
  update public.profiles set team_leader_authorized = p_authorized where id = p_agent;
  return true;
end;
$$;
grant execute on function public.set_team_leader_authorized(uuid, boolean) to authenticated;
