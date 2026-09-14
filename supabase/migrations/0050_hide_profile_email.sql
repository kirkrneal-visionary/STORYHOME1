-- Hide profile email (and verification stamps) from PostgREST clients.
-- Does NOT delete users, listings, or county/CAD.
-- Service role keeps full access. App email comes from Auth, not this table.

revoke select on table public.profiles from anon, authenticated;
grant select (
  id,
  full_name,
  legal_full_name,
  initials,
  account_kind,
  account_purpose,
  professional_role,
  brokerage_id,
  credential,
  license_number,
  team_leader_authorized,
  primary_market_city,
  bio,
  avatar_url,
  photo_url,
  phone,
  website,
  specialties,
  service_areas,
  languages,
  designations,
  socials,
  reputation_score,
  star_rating,
  review_count,
  created_at,
  living_mark_video_url,
  trec_license,
  trec_status,
  sponsor_license_number,
  sponsor_name
) on table public.profiles to anon, authenticated;

grant select, insert, update, delete on table public.profiles to service_role;
