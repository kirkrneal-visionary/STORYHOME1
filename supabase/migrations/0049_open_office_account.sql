-- Wave 3: explicit office-account conversion.
-- TREC promote still never grants managing_broker.
-- Does NOT delete users, listings, or county/CAD.

create or replace function public.open_office_account()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text;
  v_purpose text;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  select account_kind, account_purpose
    into v_kind, v_purpose
    from public.profiles
   where id = auth.uid();

  if v_purpose = 'managing_broker' then
    return true;
  end if;

  if v_kind is distinct from 'broker' or v_purpose is distinct from 'individual_pro' then
    raise exception 'Only a Story Pro broker login can become the office account';
  end if;

  perform set_config('story.allow_profile_privilege_write', '1', true);
  update public.profiles
     set account_purpose = 'managing_broker',
         verified_purpose = 'managing_broker'
   where id = auth.uid();

  return true;
end;
$$;

comment on function public.open_office_account() is
  'Turns this individual broker login into the office account. Story Pro stays on a separate realtor login.';

grant execute on function public.open_office_account() to authenticated;

revoke execute on function public.open_office_account() from public, anon;
