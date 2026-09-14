-- Let seller-code functions see pgcrypto (hmac/crypt live in extensions).
-- Does NOT delete users, listings, or county/CAD truth data.

alter function public.seller_portal_by_code(text)
  set search_path = public, extensions;
alter function public.ensure_seller_access_code(uuid)
  set search_path = public, extensions;
alter function public.rotate_seller_access_code(uuid)
  set search_path = public, extensions;
