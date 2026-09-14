-- Office login keeps Story Pro / Archie corridor tools.
-- TREC still cannot grant office. Office power still requires managing_broker.
-- Does NOT delete users, listings, or county/CAD.

create or replace function public.is_individual_pro(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_uid
      and account_purpose in ('individual_pro', 'managing_broker')
  );
$$;

comment on function public.is_individual_pro(uuid) is
  'Story Pro tools. Individual realtor and office (managing broker) logins both qualify.';

comment on function public.open_office_account() is
  'Turns this individual broker login into the office account. Story Pro and Archie stay on this same login.';
