# Story Home analytics

One first-party product analytics layer. Do not invent random event names. Do not add PostHog / Segment / Mixpanel / gtag.

## Why this approach

Story Home already stores catalog events in Supabase `product_analytics_events` (migrations 0029 / 0030) via `track()` → `POST /api/analytics`.

That fits:

- Next.js + Vercel + Supabase
- Privacy (scrub + forbidden keys)
- Cost (no second vendor)
- Scale later without rewriting call sites

Phase 2 **extends the catalog**. It does not add a second stack.

## Architecture

```
UI action (after success when required)
  → track(event, props)     // never throws, never awaited
  → POST /api/analytics     // keepalive, fire-and-forget
  → ingestProductAnalyticsEvent()
  → product_analytics_events
```

Sink: `NEXT_PUBLIC_ANALYTICS_SINK=noop|console|remote` (default remote).

If analytics fails, Marketplace / Research / Farm save / listing save still work.

## Privacy exclusions

Never send:

- email, name, owner, owner_name, address
- passcode, password, phone
- notes, message text
- legal_description, cad_owner_id, prop_id
- My Home document contents
- seller private documents
- raw search query text that may contain personal information

Allowed: listing UUID, county FIPS, enums, booleans, IDs, result buckets.

## Event taxonomy

All names live in `src/lib/analytics/events.ts`.

### Session / entry

| Event | When | Props |
|---|---|---|
| `marketplace_viewed` | Marketplace mounts (once, ref-guarded) | `network: "marketplace"` |
| `listing_opened` | Listing detail render | `listing_id` |
| `auth_login_succeeded` | Login succeeds | `account_kind` |
| `portal_tab_opened` | Story Pro tab change | `tab` |
| `archie_opened` | Archie shell mounts (once) | `network: "archie"` |
| `my_home_opened` | My Home mounts (once) | `network: "my_home"` |
| `seller_portal_opened` | Seller portal mounts (once) | `network: "seller"` |

### Marketplace

| Event | When | Props |
|---|---|---|
| `listing_inquire_submitted` | Inquire succeeds | `listing_id` |
| `listing_saved` | Listing added to a Suite | `listing_id`, `source_surface` |

### Archie / Research

| Event | When | Props |
|---|---|---|
| `archie_module_selected` | Module changes **after** first paint | `module` |
| `archie_parcel_opened` | Parcel detail loaded | `county_fips` |
| `research_mode_changed` | User picks a research mode (not restore) | `research_mode` |
| `archie_study_reopened` | Saved frame reopened | `has_folder` |
| `prospect_created` | Prospect **created** (not “already exists”) | `county_fips`, `source_surface`, `created` |
| `farm_created` | Farm saved after server OK | `county_fips?`, `source_surface` |
| `study_saved` | Study / frame saved after server OK | `source_surface` |

### Living Mark / Agent World / Story Walk

Unchanged: `living_mark_*`, `agent_world_*`, `story_walk_*`.

## Implementation locations

| Event | File |
|---|---|
| `marketplace_viewed` | `src/components/MarketplaceView.tsx` |
| `listing_opened` | `src/app/marketplace/[id]/page.tsx` (`AnalyticsPageBeacon`) |
| `listing_saved` | `src/components/suites/SaveToSuiteModal.tsx` |
| `listing_inquire_submitted` | `src/components/marketplace/InquireButton.tsx` |
| `auth_login_succeeded` | `src/components/AuthContext.tsx` |
| `portal_tab_opened` | `src/components/broker/BrokerPortal.tsx` |
| `archie_opened` / `archie_module_selected` / `research_mode_changed` / `archie_study_reopened` | `src/components/broker/intelligence/ShiWorkspace.tsx` |
| `archie_parcel_opened` | `src/components/broker/intelligence/PropertyIntelligenceView.tsx` |
| `prospect_created` / `farm_created` / `study_saved` | Research, Discover, Corridors (after success) |
| `my_home_opened` | `src/components/home/MyHomeView.tsx` |
| `seller_portal_opened` | `src/components/seller/SellerPortalView.tsx` |

## Funnels (measure, do not dashboard)

**Pro / Archie**

`archie_opened` → `research_mode_changed` / search → `archie_parcel_opened` → `study_saved` → `prospect_created` → `farm_created` → `archie_study_reopened`

**Consumer belonging**

`marketplace_viewed` → `listing_opened` → `listing_saved` / `listing_inquire_submitted` → `auth_login_succeeded` → `my_home_opened`

Return is inferred from repeat `marketplace_viewed` / `my_home_opened` / `listing_opened` on later sessions (same `user_id` when signed in).

## Intentionally not tracked

- Every map pan / zoom frame / sheet drag / terrain camera move
- Private Prospect note text
- My Home document names or contents
- Message / referral bodies
- Raw search strings
- CAD owner names / addresses / prop ids
- Background CAD refresh
- Analytics transmission itself

## Failure behavior

`track()` swallows all errors. `POST /api/listing-activity` and `/api/analytics` soft-succeed when the table or service role is missing.

Core product never waits on telemetry.

## Reporting

Phase 2 does **not** add a founder chart UI. Query `product_analytics_events` in SQL when needed:

```sql
select event_name, count(*)
from product_analytics_events
group by 1
order by 2 desc;
```

Pretty dashboards come after events are proven.
