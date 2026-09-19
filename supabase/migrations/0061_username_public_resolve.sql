-- P1A-4: public alias resolution for /u/[username].
-- Username remains a public alias. It is not authorization.
-- resolve_username still returns no row for reserved, tombstoned, or unknown.
-- Does NOT grant SELECT on username_registry.
-- Does NOT change account privilege, Story Pro, Office, TREC, or MFA.

grant execute on function public.resolve_username(text) to anon;

comment on function public.resolve_username(text) is
  'Active usernames only. Tombstoned, reserved, and unknown return no row. Public /u/ alias.';
