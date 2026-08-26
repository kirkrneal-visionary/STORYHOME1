# Pre-launch security audit

Canonical production: **storyhome-1-eqmg**. Ignore other Vercel `storyhome-1` projects.

Date: 2026-08-26  
Scope: repository on `main` + this hardening branch.  
**No test users or county/CAD data were deleted.**

Status legend: OPEN = still needs work · SHIPPED = code in this PR · NEEDS SQL = migration 0039 must be applied in Supabase · NEEDS DASHBOARD = Vercel/Supabase console.

---

## Pages

| Route | Auth | Role | Caller | Rate limit | Validation | RLS | Service role | Cache | Expensive | Enumerable | PII | Bot risk | Status | Action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | No | — | Public | — | — | n/a | No | CDN | No | Yes | No | Low | OK | Keep public |
| `/about` `/contact` `/privacy` `/terms` `/fair-housing` `/accessibility` | No | — | Public | — | — | n/a | No | CDN | No | Yes | No | Low | OK | Keep public |
| `/login` | No | — | Public | Auth (Supabase) | Form | n/a | No | No | No | Yes | Email | High (signup/reset) | SHIPPED | Dev login blocked in production; demo passcodes hidden when Supabase is on |
| `/marketplace` `/marketplace/[id]` | No | — | Public | — | id | listings public | No | — | No | Yes | Listing + agent profile | Medium | SHIPPED | App listing select omits `seller_access_code`; 0039 revokes the column |
| `/agents/[id]` `/b/[slug]` | No | — | Public | — | id/slug | profiles/brokerages public | No | — | No | Yes | Name, bio, **email if selected** | Medium | OPEN | Public profile must omit email |
| `/home` `/saved` `/saved/[suiteId]` `/following` `/messages` `/referrals` `/network` `/profile` `/settings` | Client | Consumer+ | Logged-in UI | — | — | Per table | No | No | No | If logged in | Yes | Medium | OPEN | Add server layout guards later |
| `/portal` `/portal/intelligence` | Client only | Pro/broker UI | Story Pro | App API | — | SHI tables | No | No | High | If they know URL | Yes | High | OPEN | Middleware still does not block the page shell; APIs stay Pro-gated |
| `/seller` `/seller/portal/[code]` | Passcode | Seller | Seller | App (medium on APIs) | Code | RPC | No | No | Medium | Yes (code brute) | Listing analytics | High | OPEN | Hash codes + attempt limits after founder reset |

No server actions (`"use server"`) exist.

---

## API routes (41)

### Public / unauthenticated

| Route | Methods | Auth | Rate | Validation | Service role | Cache | Expensive | PII | Bot | Status | Action |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/api/map/launch7/imagery/{z}/{x}/{y}` | GET | No | **None (tiles)** | z/x/y | No | Tile CDN | Upstream fill | No | Tile crawl | OPEN | Cache + WAF pattern, not per-tile 429 |
| `/api/map/launch7/streets/{z}/{x}/{y}` | GET | No | None | z/x/y | No | Tile | Upstream | No | Tile crawl | OPEN | Same |
| `/api/map/launch7/status` | GET | No | Low | — | No | No | No | Ops flags | Low | OPEN | Trim ops metadata |
| `/api/map/lidar/{z}/{x}/{y}` | GET | No | None | tile valid | No | Tile + `ACAO *` | USGS global | No | High | OPEN | Geographic cap + WAF |
| `/api/map/lidar/dem/{z}/{x}/{y}` | GET | No | None | tile valid | No | Tile + `ACAO *` | USGS | No | High | OPEN | Same |
| `/api/map/lidar/parcel` | POST | No | High (before tile exemption) | polygon | No | No | Raster | No | High | SHIPPED | Keep geometry caps |
| `/api/map/lidar/read` | GET | No | Medium | lat/lng | No | No | Point | No | Medium | SHIPPED | Classified medium |
| `/api/map/lidar/profile` | GET | No | High (before tile exemption) | 2 points | No | No | Slice | No | High | SHIPPED | Classified high |
| `/api/parcels/{z}/{x}/{y}` | GET | No | None | z/x/y | No | 1h | PostGIS MVT | **Owner names z≥13** | High scrape | OPEN | Public-record by design; WAF + zoom/pattern |
| `/api/cad/overlay` | GET | No | Medium | bbox ≤1.5° | No | 120s | ArcGIS proxy | CAD attrs | High | SHIPPED | Rate class medium |
| `/api/cad/status` | GET | No | Low | — | **Was fallback — removed** | No | No | No | Low | SHIPPED | Anon key only; fail closed |
| `/api/verify-trec` | GET | No | Medium | license | No | 1h | TREC | License name | High enum | SHIPPED | Safe error; rate class |
| `/api/analytics` | POST | Optional | Medium | Catalog only | No | No | Insert | Scrubbed | High spam | SHIPPED | Rate class |

### Story Pro (`requireStoryPro` on every `/api/shi/*`)

| Route | Methods | Role | Rate | PII | Expensive | Status |
|---|---|---|---|---|---|---|
| `/api/shi/search` | GET | agent/broker | Medium | Owner/address | Search | Gate OK |
| `/api/shi/property` | GET | Pro | Medium | Full parcel | Low | Gate OK |
| `/api/shi/area` | POST | Pro | High | Owners | Frame scan | Caps exist |
| `/api/shi/portfolio` | GET | Pro | High | Owner portfolio | Yes | Gate OK |
| `/api/shi/owner-matches` | GET | Pro | High | Owner | Yes | Gate OK |
| `/api/shi/similar` | POST | Pro | High | Parcels | Yes | Gate OK |
| `/api/shi/freshness` `/changes` `/neighbors` `/deeds` `/flood` `/environment` `/utilities` | GET | Pro | Medium | Varies | Medium | Gate OK |
| `/api/shi/prospects` `.../[id]` `.../notes` | GET/POST/PATCH/DELETE | Pro | Medium | CRM | Low | RLS owner |
| `/api/shi/farms` `.../[id]` | GET/POST/PATCH/DELETE | Pro | Medium | Farms | Low | RLS owner |
| `/api/shi/studies/folders` `/studies/frames` | CRUD | Pro | Medium | Studies | Low | RLS owner |
| `/api/shi/corridors/analyze` `/strongest-sites` | POST | Pro | High | Owners | Yes | Caps |
| `/api/shi/corridors/traffic` `/projects` `/parcel-location` | GET | Pro | Medium | Low | TxDOT | Gate OK |
| `/api/shi/research/worth-a-look` | POST | Pro | High + 8/min in-memory | Owners | Yes | Dual limit |
| `/api/shi/multifamily/review` | POST | Pro | High | Snapshots | Yes | Cap 120 |
| `/api/shi/multifamily/parcel` | GET | Pro | Medium | Address | Low | Gate OK |

Expected caller: authenticated Story Pro. Consumers get 403. Anonymous get 401.  
**Caveat:** `account_kind` was client-updatable until migration 0039. Direct PostgREST can still call some RPCs as any logged-in user.

No webhook routes exist.

---

## Supabase RPCs / functions (selected)

| Function | Grant | Auth | Risk | Action |
|---|---|---|---|---|
| `seller_portal_by_code` | anon + auth | Code only | Brute force + analytics | Rate-limit wrapper; hash later |
| `ensure_seller_access_code` | auth | Agent | OK | Keep |
| `parcels_mvt` | anon + auth | Public | Owner scrape via tiles | WAF + cache |
| `parcel_neighbors` | authenticated | Any login | Consumer bypass of SHI HTTP | Assert Pro inside RPC (follow-up) |
| `corridor_parcel_frontage` / `corridor_parcel_intersection_distance` | authenticated | Any login | Same | Same |
| `handle_new_user` | trigger | Signup metadata | Client can request agent/broker | Lock after insert (0039); signup still trusts metadata |
| `county_boost_availability` | anon | Public | Low | OK |

---

## Storage buckets

| Bucket | Public | Policies | Status |
|---|---|---|---|
| `home-docs` | No | Owner folder | OK |
| `shi-studies` | No | Owner folder | OK |
| `living-marks` | Yes | Public read | By design — treat as public brand media |

---

## Map / tile endpoints

Public by product design (marketplace + Research first paint). Do **not** apply naive per-request 429. Protect with CDN cache, WAF pattern detection, and geographic/zoom caps on lidar/imagery upstream.

---

## Demo / debug leakage (this PR)

| Item | Was | Now |
|---|---|---|
| `NEXT_PUBLIC_ENABLE_DEV_LOGIN` + hardcoded passwords | Could show in production | Hidden unless `NODE_ENV !== production` |
| Demo seller codes in login UI | Always shown | Hidden when Supabase is configured |
| `WILLOW-875` placeholder | Seller form | Removed |
| `clear-db.mjs` | Hardcoded anon JWT + wipe | Disabled, no secrets |
| Service-role fallback on `/api/cad/status` | Privilege escalate if anon missing | Removed |

---

## Env classification

| Variable | Class | Browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | PUBLIC | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | PUBLIC (RLS-bound) | Yes |
| `NEXT_PUBLIC_ANALYTICS_SINK` | PUBLIC flag | Yes |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | PUBLIC token — restrict URL in Mapbox | Yes |
| `NEXT_PUBLIC_ENABLE_DEV_LOGIN` | PUBLIC flag — **never on eqmg** | Yes |
| `NEXT_PUBLIC_SITE_URL` / `LAUNCH7_CDN_BASE` | PUBLIC | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | HIGH-PRIVILEGE | **Never** |
| `LAUNCH7_R2_*` keys | HIGH-PRIVILEGE | **Never** |
| Future payment secret / webhook secret | HIGH-PRIVILEGE | **Never** |

Rotate: the anon JWT that was committed in `clear-db.mjs` (old project). Treat as burned. Confirm it is not the live eqmg key; if it is, rotate anon + review RLS.

---

## WAF (recommend LOG first on storyhome-1-eqmg)

| Name | Match | Action (later) | Why | Legit rate | False-positive |
|---|---|---|---|---|---|
| `api-burst` | `/api/*` except tiles | LOG → RATE LIMIT | Abuse | Hundreds/min tiles; tens/min SHI | Medium if tiles included — **exclude tiles** |
| `auth-login` | `/login` POST + Supabase auth | LOG → CHALLENGE on burst | Signup/reset bots | Low | Low |
| `seller-code` | `/seller/portal/*` + RPC | LOG → RATE LIMIT | Brute passcodes | Few/min | Low |
| `trec-enum` | `/api/verify-trec` | LOG → RATE LIMIT | License scrape | Few/min | Low |
| `shi-spatial` | `/api/shi/area` `/similar` `/portfolio` `/corridors/analyze` | LOG → RATE LIMIT | Cost | 10/min/user | Low if Pro only |
| `tile-anomaly` | `/api/parcels` `/api/map` extreme RPS | LOG only | Scrape | Thousands/min OK | High if challenged |

Do not challenge every visitor.

---

## Payment readiness (no provider chosen)

- No card storage in this repo.
- No webhook route yet — when added: signature, event-id idempotency, no Pro grant from client redirect.
- Entitlement table later: account, provider customer, status, plan, period, cancel, last event id.
- Failed payment must not delete Farms/Studies/Prospects.

---

## 100k concurrency (plan only — not claimed)

See `docs/PRELAUNCH-LOAD-TEST.md`. First likely bottlenecks: PostGIS `parcels_mvt` + imagery origin + Supabase connections — not the Next.js HTML.
