-- Take seller_portal_by_code off the public PostgREST surface.
-- Callers must go through /api/seller/access (attempt-limited).
-- Apply after SUPABASE_SERVICE_ROLE_KEY is set on storyhome-1-eqmg.
-- Does NOT delete users, listings, or county/CAD truth data.

revoke execute on function public.seller_portal_by_code(text)
  from anon, authenticated, public;

grant execute on function public.seller_portal_by_code(text)
  to service_role;

comment on function public.seller_portal_by_code(text) is
  'Seller portal lookup. Execute revoked from anon/authenticated — use the rate-limited server route.';
