# STORY-ANALYTICS-FOUNDATION

## Promise
Named product events for funnel + Archie usage — **privacy-reviewed props only**. No third-party SDK in this wave. No fake dashboards.

## Sink
| Value | Behavior |
|---|---|
| `noop` | Silent |
| `console` | Dev: `console.info("[story-analytics]", event, props)` |
| `remote` (default after destination wave) | `POST /api/analytics` → `product_analytics_events` |

Env: `NEXT_PUBLIC_ANALYTICS_SINK=noop|console|remote`  
See [`STORY-ANALYTICS-DESTINATION.md`](./STORY-ANALYTICS-DESTINATION.md).

## Catalog
- `marketplace_viewed`
- `listing_opened`
- `listing_inquire_submitted`
- `auth_login_succeeded`
- `portal_tab_opened`
- `archie_opened`
- `archie_module_selected`
- `archie_parcel_opened` (county FIPS only)
- `archie_study_reopened`

## Props policy
Allowed: enums, listing UUID, county FIPS, booleans.  
Forbidden: email, name, owner, address, notes, message body, passcodes, CAD prop ids.

## Out of scope
- PostHog / Segment / session replay  
- “Who viewed what” audit logs  
- Replacing seller `listing_analytics` aggregates  
- Fake engagement dashboards  

## Later
Reviewed vendor only with consent UX. Destination wave: first-party ingest + table.
