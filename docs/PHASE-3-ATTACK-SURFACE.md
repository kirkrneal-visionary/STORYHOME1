# Phase 3 attack surface

Canonical production: **storyhome-1-eqmg**.  
Assume attackers call APIs directly. Hidden UI is not security.

Extends `docs/PRELAUNCH-SECURITY-AUDIT.md`. Status: SHIPPED = this Phase 3 PR unless noted.

---

## Pages

| Route | Public? | Auth | Role | Expected caller | Validation | Rate | RLS | Service role | PII | Expensive | Cache | Bot | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` `/about` `/contact` `/privacy` `/terms` `/fair-housing` `/accessibility` | Yes | No | — | Browser | — | — | n/a | No | No | No | CDN | Low | OK |
| `/login` | Yes | No | — | Browser | Form | Supabase Auth | n/a | No | Email | No | No | High | Neutral errors SHIPPED |
| `/marketplace` `/marketplace/[id]` | Yes | No | — | Browser | id | — | listings public | No | Listing | No | — | Medium | Passcode omitted from select |
| `/agents/[id]` `/b/[slug]` | Yes | No | — | Browser | id/slug | — | public profile | No | Name/bio (email omitted on agent page) | No | — | Medium | Email not selected |
| `/home` `/saved` `/following` `/messages` `/referrals` `/network` `/profile` `/settings` | No | Client | Consumer+ | Logged-in UI | — | — | Per table | No | Yes | No | No | Medium | RLS owner; following/messages/referrals hidden |
| `/portal` `/portal/intelligence` | No | **Session (middleware)** | Pro UI | Story Pro | — | — | SHI tables | No | Yes | High | No | High | Session redirect SHIPPED; APIs still Pro-gated |
| `/seller` | Yes | No | — | Seller | — | — | — | No | No | No | No | Medium | Form posts to `/api/seller/access` |
| `/seller/portal/[code]` | Code | Code | Seller | Seller | Code format | Medium + attempts | RPC | Optional SR | Listing analytics | Medium | No | High | Attempt limit + generic 404 SHIPPED |

No `"use server"` actions exist.

---

## API routes

### Public / unauthenticated

| Route | Methods | Auth | Rate | Validation | Service role | Cache | Expensive | PII | Bot | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| `/api/map/launch7/imagery\|streets/{z}/{x}/{y}` | GET | No | **None (tiles)** | z/x/y | No | Tile CDN | Upstream | No | Tile crawl | Do not 429 |
| `/api/map/launch7/status` | GET | No | Low | — | No | No | No | Ops flags | Low | Keep |
| `/api/map/lidar/{z}/{x}/{y}` `/dem/` | GET | No | None | tile valid | No | Tile + `ACAO *` | USGS | No | High | Public tiles; CORS * OK |
| `/api/map/lidar/parcel` | POST | No | High | polygon | No | No | Raster | No | High | Caps |
| `/api/map/lidar/read` | GET | No | Medium | lat/lng | No | No | Point | No | Medium | OK |
| `/api/map/lidar/profile` | GET | No | High | 2 points | No | No | Slice | No | High | OK |
| `/api/parcels/{z}/{x}/{y}` | GET | No | None | z/x/y | No | 1h | PostGIS MVT | Owner names z≥13 | High scrape | Public record; WAF LOG |
| `/api/cad/overlay` | GET | No | Medium | bbox ≤1.5° | No | 120s | ArcGIS | CAD attrs | High | OK |
| `/api/cad/status` | GET | No | Low | — | **Forbidden** | No | No | last_error (coverage honesty) | Low | Fail closed. Keep last_error for Phase 2 truth |
| `/api/verify-trec` | GET | No | Medium | license | No | 1h | TREC | License name | High enum | OK |
| `/api/analytics` | POST | Optional | Medium | Catalog only | No | No | Insert | Scrubbed | High spam | Soft-succeed |
| `/api/listing-activity` | POST | No | **Medium** | UUID + view\|save | Soft SR write | No | Insert | Fingerprint hash | Medium | UUID SHIPPED; missing SR does not escalate |
| `/api/seller/access` | POST | Code | Medium + 8/15min | Code charset | SR preferred | No | RPC | Listing label | High brute | SHIPPED |
| `/api/billing/webhook` | POST | Signature | Low | HMAC | SR for event id | No | No | Event id | Replay | Unsigned rejected |

CORS `*` is only on tile/lidar responses. CORS is not authorization.

### Story Pro (`requireStoryPro` on every `/api/shi/*`)

Anonymous → 401. Consumer/seller → 403. Role query params and localStorage are ignored.

| Route | Methods | Rate | PII | Expensive | Notes |
|---|---|---|---|---|---|
| `/api/shi/search` `/property` `/freshness` `/changes` `/neighbors` `/deeds` `/flood` `/environment` `/utilities` | GET | Medium | Owner/address | Medium | Gate OK |
| `/api/shi/area` `/similar` `/portfolio` `/owner-matches` `/corridors/analyze` `/strongest-sites` `/research/worth-a-look` `/multifamily/review` | POST | High | Owners | Yes | Geometry/parcel caps |
| `/api/shi/prospects` `.../[id]` `.../notes` `/farms` `.../[id]` `/studies/*` | CRUD | Medium | CRM / studies | Low | RLS `agent_id = auth.uid()` |
| `/api/shi/corridors/traffic` `/projects` `/parcel-location` `/multifamily/parcel` | GET | Medium | Low | TxDOT | Gate OK |

---

## RPCs / functions

| Function | Grant (after 0042) | Risk | Status |
|---|---|---|---|
| `seller_portal_by_code` | **service_role only** | Brute + analytics | Revoke in 0042 (needs SQL) |
| `ensure_seller_access_code` | authenticated | Owner/broker | OK |
| `parcels_mvt` | anon + auth | Owner scrape via tiles | WAF + cache |
| `parcel_neighbors` / corridor RPCs | authenticated | Any login, not Pro-only | Remaining HIGH |
| `handle_new_user` | trigger | Signup metadata can request agent | Remaining HIGH |
| `county_boost_availability` | anon | Low | OK |

---

## Storage

| Bucket | Public | Policy | Status |
|---|---|---|---|
| `home-docs` | No | Owner folder `auth.uid()` | OK — signed access only |
| `shi-studies` | No | Owner folder | OK |
| `living-marks` | Yes | Public read | Brand media by design |

Private documents must not get permanent public URLs.

---

## Env classification

| Variable | Class | Browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | PUBLIC | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | PUBLIC (RLS-bound) | Yes |
| `NEXT_PUBLIC_ANALYTICS_SINK` | PUBLIC flag | Yes |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | PUBLIC `pk.` — restrict URL | Yes |
| `NEXT_PUBLIC_ENABLE_DEV_LOGIN` | PUBLIC — **never on eqmg** | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | HIGH-PRIVILEGE | **Never** |
| `LAUNCH7_R2_*` | HIGH-PRIVILEGE | **Never** |
| `BILLING_WEBHOOK_SECRET` / `BILLING_SECRET_KEY` | HIGH-PRIVILEGE | **Never** |

Secret history: a JWT once lived in `clear-db.mjs` (removed). Treat as burned; rotate if it matched live.

---

## WAF (recommend LOG first on storyhome-1-eqmg)

| Name | Match | Start | Later | Why | Normal | False positive |
|---|---|---|---|---|---|---|
| `api-burst` | `/api/*` except `/api/map/*` `/api/parcels/*` | LOG | RATE LIMIT | Abuse | Tens/min SHI | High if tiles included |
| `auth-login` | `/login` POST | LOG | CHALLENGE on burst | Signup/reset bots | Low | Low |
| `seller-code` | `/seller/portal/*` `/api/seller/*` | LOG | RATE LIMIT | Passcode brute | Few/min | Low |
| `trec-enum` | `/api/verify-trec` | LOG | RATE LIMIT | License scrape | Few/min | Low |
| `shi-spatial` | area / similar / portfolio / analyze | LOG | RATE LIMIT | Cost | ≤10/min Pro | Low |
| `tile-anomaly` | `/api/parcels` `/api/map` extreme RPS | **LOG only** | never challenge | Scrape vs pan | Thousands/min OK | **Do not challenge tiles** |

Do not CAPTCHA parcel taps, search, or map movement.

---

## Cache classes

| Class | Examples | Rule |
|---|---|---|
| A shared | Street/imagery/terrain/parcel tiles, county metadata | CDN OK |
| B controlled | CAD overlay (short TTL) | Do not present as newly verified |
| C private | Prospects, Farms, Studies, CRM, My Home, seller, billing | **Never shared cache** |
