-- ---------------------------------------------------------------------------
-- Wave B — grants cleanup
--
-- Wave A granted the roster table to `authenticated` (the app) but not to the
-- admin service role, so server-side/admin tooling couldn't read it. This adds
-- the missing grant. No behavior change for end users.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.brokerage_invites to service_role;
