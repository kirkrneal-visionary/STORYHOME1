-- New accounts are always consumers. Metadata cannot self-promote to agent/broker.
-- TREC / founder promotion is a later server write (service_role).
-- Does NOT delete users, listings, or county/CAD truth data.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_lic  text := nullif(new.raw_user_meta_data->>'trec_license', '');
begin
  insert into public.profiles (
    id, email, full_name, initials, account_kind, professional_role,
    license_number, trec_license, trec_status, trec_verified_at,
    sponsor_license_number, sponsor_name
  )
  values (
    new.id,
    new.email,
    v_name,
    upper(left(v_name, 1)) ||
      upper(coalesce(nullif(split_part(v_name, ' ', 2), ''), '')),
    'consumer',
    nullif(new.raw_user_meta_data->>'professional_role', ''),
    v_lic,
    v_lic,
    null,
    null,
    nullif(new.raw_user_meta_data->>'sponsor_license_number', ''),
    nullif(new.raw_user_meta_data->>'sponsor_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates a consumer profile. Ignores account_kind and trec_status in signup metadata.';
