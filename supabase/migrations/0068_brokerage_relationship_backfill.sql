-- P1C-3B: reconstruct current realtor pointers + bounded own-history read.
-- Does not edit 0066/0067 or expose public history.
-- P1C-5A: other-pro invite pointer, office-create overwrite, leftover pending invites.

alter table public.professional_brokerage_relationships
  drop constraint professional_brokerage_relationships_source_check;
alter table public.professional_brokerage_relationships
  add constraint professional_brokerage_relationships_source_check
  check (
    source is null
    or source in (
      'office_accept', 'create_office', 'office_remove', 'server', 'reconstructed_current'
    )
  );

create or replace function public.reconstruct_current_brokerage_relationships()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := current_setting('request.jwt.claim.role', true);
  n int;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'reconstruct_current_brokerage_relationships requires service_role'
      using errcode = '42501';
  end if;
  perform set_config('request.jwt.claim.role', 'service_role', true);
  if exists (
    select 1
      from public.profiles p
      join public.professional_brokerage_relationships r
        on r.professional_id = p.id and r.status = 'active'
     where p.account_purpose in ('individual_pro', 'managing_broker')
       and p.brokerage_id is distinct from r.brokerage_id
  ) then
    perform set_config('request.jwt.claim.role', coalesce(v_role, ''), true);
    raise exception 'brokerage pointer/history mismatch'
      using errcode = '23514';
  end if;
  insert into public.professional_brokerage_relationships (
    professional_id, brokerage_id, relationship_type, status, source, effective_from
  )
  select
    p.id,
    p.brokerage_id,
    case
      when p.account_purpose = 'managing_broker'
       and exists (
         select 1 from public.brokerages b
          where b.id = p.brokerage_id and b.broker_id = p.id
       )
      then 'managing_broker_of'
      else 'sponsored_agent'
    end,
    'active',
    'reconstructed_current',
    now()
    from public.profiles p
   where p.brokerage_id is not null
     and p.account_purpose in ('individual_pro', 'managing_broker')
     and not exists (
       select 1 from public.professional_brokerage_relationships r
        where r.professional_id = p.id and r.status = 'active'
     );
  get diagnostics n = row_count;
  perform set_config('request.jwt.claim.role', coalesce(v_role, ''), true);
  return n;
end;
$$;

revoke all on function public.reconstruct_current_brokerage_relationships()
  from public, anon, authenticated;
grant execute on function public.reconstruct_current_brokerage_relationships()
  to service_role;

create or replace function public.own_brokerage_relationship_history()
returns table (
  brokerage_name text,
  relationship_type text,
  status text,
  effective_from timestamptz,
  effective_end timestamptz,
  is_current boolean,
  recorded boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles
     where id = auth.uid()
       and account_purpose in ('individual_pro', 'managing_broker')
  ) then
    raise exception 'brokerage history is realtor-only' using errcode = '42501';
  end if;
  return query
  select
    b.name,
    r.relationship_type,
    r.status,
    r.effective_from,
    r.effective_end,
    r.status = 'active',
    r.source = 'reconstructed_current'
    from public.professional_brokerage_relationships r
    join public.brokerages b on b.id = r.brokerage_id
   where r.professional_id = auth.uid()
   order by r.effective_from desc, r.created_at desc;
end;
$$;

revoke all on function public.own_brokerage_relationship_history()
  from public, anon;
grant execute on function public.own_brokerage_relationship_history()
  to authenticated, service_role;

do $$
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform public.reconstruct_current_brokerage_relationships();
end;
$$;
