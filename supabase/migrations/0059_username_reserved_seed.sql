-- P1A-1 reserved username seed.
-- Taken / reserved / tombstoned all resolve as unavailable to callers.
-- Not an exhaustive trademark or celebrity list.
-- Does NOT delete users, listings, or county/CAD.

insert into public.username_registry (
  normalized,
  display,
  state,
  reserved_kind
)
select
  v.normalized,
  v.normalized,
  'reserved',
  v.reserved_kind
from (
  values
    -- system routes / first-path segments
    ('about', 'system_route'),
    ('accessibility', 'system_route'),
    ('agents', 'system_route'),
    ('api', 'system_route'),
    ('app', 'system_route'),
    ('auth', 'system_route'),
    ('b', 'system_route'),
    ('cdn', 'system_route'),
    ('contact', 'system_route'),
    ('fairhousing', 'system_route'),
    ('following', 'system_route'),
    ('home', 'system_route'),
    ('login', 'system_route'),
    ('marketplace', 'system_route'),
    ('messages', 'system_route'),
    ('network', 'system_route'),
    ('office', 'system_route'),
    ('portal', 'system_route'),
    ('privacy', 'system_route'),
    ('profile', 'system_route'),
    ('referrals', 'system_route'),
    ('rent', 'system_route'),
    ('saved', 'system_route'),
    ('seller', 'system_route'),
    ('settings', 'system_route'),
    ('static', 'system_route'),
    ('terms', 'system_route'),
    ('u', 'system_route'),
    ('www', 'system_route'),
    -- brand / product
    ('archie', 'brand'),
    ('cad', 'brand'),
    ('help', 'brand'),
    ('legal', 'brand'),
    ('mls', 'brand'),
    ('shi', 'brand'),
    ('status', 'brand'),
    ('story', 'brand'),
    ('storyhome', 'brand'),
    ('storyhomenews', 'brand'),
    ('trec', 'brand'),
    -- professional / account role words
    ('agent', 'role_word'),
    ('broker', 'role_word'),
    ('brokerage', 'role_word'),
    ('buyer', 'role_word'),
    ('consumer', 'role_word'),
    ('homeowner', 'role_word'),
    ('professional', 'role_word'),
    ('realtor', 'role_word'),
    -- journalism / news (Coming Soon)
    ('breaking', 'journalism'),
    ('editor', 'journalism'),
    ('journalism', 'journalism'),
    ('localnews', 'journalism'),
    ('media', 'journalism'),
    ('news', 'journalism'),
    ('press', 'journalism'),
    ('reporter', 'journalism'),
    ('stories', 'journalism'),
    -- support / security / impersonation / community
    ('admin', 'impersonation'),
    ('administrator', 'impersonation'),
    ('community', 'impersonation'),
    ('moderator', 'impersonation'),
    ('official', 'impersonation'),
    ('root', 'impersonation'),
    ('security', 'impersonation'),
    ('staff', 'impersonation'),
    ('support', 'impersonation'),
    ('verified', 'impersonation')
) as v(normalized, reserved_kind)
on conflict (normalized) do nothing;
