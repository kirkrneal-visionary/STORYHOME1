# STORY-ANALYTICS-DESTINATION

## Promise
First-party destination for the product event catalog — no third-party SDK, no fake dashboards, no cross-user “who viewed what” UI.

## Ships
- Migration `0029_product_analytics_events.sql`
- `POST /api/analytics` — catalog-only, server scrub, soft-ok if table missing
- Client sink `remote` (default) → fire-and-forget to that route
- RLS: anon/authenticated **insert**; authenticated **select own** only (no public feed)

## Ops
1. Apply `supabase/migrations/0029_product_analytics_events.sql` in the SQL editor (or migrate).
2. Apply `supabase/migrations/0030_product_analytics_grants.sql` so anon/authenticated/service_role can INSERT (SQL editor creates tables without role grants).
3. Confirm `NEXT_PUBLIC_ANALYTICS_SINK=remote` (or leave unset — code default is remote).
4. Optional local inspect: `NEXT_PUBLIC_ANALYTICS_SINK=console`.

## Honesty
- Events are usage signals for funnel/Archie product work — not seller probability.
- Seller `listing_analytics*` stays separate.
- No product analytics dashboard in this wave.

## Out of scope
- PostHog / Segment / session replay  
- Admin UI for browsing other users’ events  
- IP / fingerprint storage  
