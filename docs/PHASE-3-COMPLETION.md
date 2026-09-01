# Phase 3 completion

Phase 3 only. Not a feature build. Not Phase 4.

Canonical project: **storyhome-1-eqmg**. Ignore red Vercel on plain `storyhome-1`.

**100,000 concurrent users is NOT claimed.**

**Production user wipe was NOT executed.**

---

## A. BASELINE COMMIT

`ee3927e8b0ae1d9aff62c7126731787212b8b802` — Phase 2 tip (`Fix TypeScript build: optional county FIPS on analytics events.`).

See `docs/PHASE-3-BASELINE.md`.

## B. SECURITY ISSUES FOUND

Already documented in `docs/PRELAUNCH-FOUNDER-REPORT.md`, plus:

- Seller portal RPC callable by anyone (brute force)
- `/portal` HTML reachable without a session
- `/api/listing-activity` accepted non-UUID ids (medium)
- Auth errors could enumerate accounts
- No payment webhook boundary
- In-memory rate limits are per isolate (WAF still required)
- Signup metadata can still insert `account_kind=agent` (lock is UPDATE-only)
- Corridor RPCs granted to any authenticated user
- `profiles` email readable if a client selects it
- Seller passcodes still plaintext in DB (column hidden from listings select)

## C. CRITICAL ISSUES FIXED

- `/api/cad/status` still has **no** service-role fallback (kept)
- Privilege lock migration 0039 already in tree
- Seller lookup moved to `/api/seller/access` with attempt limits and generic errors
- Migration `0042` revokes public execute on `seller_portal_by_code` (needs SQL)

## D. HIGH ISSUES FIXED

- `/portal` requires a session in middleware (APIs remain Pro-gated)
- Listing-activity UUID validation + medium rate class
- Cross-origin state-changing `/api` POSTs rejected when Origin mismatches
- Auth sign-in / sign-up messages neutralized
- Structured security logging (no secrets)
- Public error helper strips SQL / table names on area / similar / search

## E. REMAINING SECURITY ISSUES

| Item | Severity | Notes |
|---|---|---|
| Signup metadata → first `account_kind` | HIGH | 0039 locks later updates only |
| Seller passcodes plaintext | HIGH | Hash after reset; 0040 hides column |
| 0042 not applied until SQL | HIGH | Direct RPC remains until applied |
| Corridor RPCs any login | HIGH | HTTP still Pro-gated |
| `profiles.email` selectable | MEDIUM | Agent page does not select it |
| In-memory rate store | MEDIUM | Need WAF on eqmg |
| Turnstile not on | MEDIUM | Signup/reset only when added |
| Dev passwords in source | LOW | Hidden unless non-production |
| CAD `last_error` on public status | LOW | Kept for Phase 2 honesty |

## F. RLS RESULTS

Owner-keyed CRM / Prospects / Farms / Studies / My Home: RLS ON.  
Consumer A ↛ B, Agent A ↛ B via policies.  
Anonymous ↛ Archie HTTP: **401** on live eqmg.  
Live JWT pairwise tests were **not** run against production from this agent.

Adversarial ID swaps must still fail at RLS when two real agents exist (post-reset: empty).

## G. SERVICE-ROLE RESULTS

| Use | OK? |
|---|---|
| CAD ingest scripts | Yes — batch |
| Deeds clerk / corridor cache | Yes — after Pro HTTP |
| Listing-activity write | Soft-succeed if missing; no escalate |
| Seller lookup | Prefers SR; anon until 0042 |
| `/api/cad/status` | **No SR** |
| Billing event insert | SR if present; unsigned still rejected |

Missing required config **fails closed** on Pro APIs (503) and billing webhook (503). Listing-activity / analytics stay soft-succeed so Marketplace does not break.

## H. SECRET / ENV RESULTS

- `.env*` gitignored except `.env.example`
- No `NEXT_PUBLIC_` service-role or billing secret
- Burned JWT in old `clear-db.mjs` — rotate if it was live
- `npm audit --omit=dev`: **0** high/critical
- Payment secrets documented SERVER ONLY

## I. WAF RULES

Documented in `docs/PHASE-3-ATTACK-SURFACE.md`. Recommended start: **LOG**. Exclude tiles from challenge. **Not configured from this agent** (dashboard).

## J. BOT DEFENSE

Layers: WAF (pending dashboard) → Auth limits → app rate classes → seller attempts → `requireStoryPro` → input validation → RLS → spatial caps.  
No CAPTCHA on map/search/parcel tap.

## K. RATE LIMITS

| Class | Window | Paths |
|---|---|---|
| None | — | `/api/map/*` tiles, `/api/parcels/*` |
| Low | 90/min/IP | Other `/api/*` (incl. billing webhook) |
| Medium | 30/min/IP | SHI reads, CAD overlay, TREC, analytics, listing-activity, seller |
| High | 10/min/IP | Area, Similar, portfolio, strongest, lidar parcel/profile |
| Seller attempts | 8 fails / 15 min / IP | Code lookup |

## L. SELLER PORTAL SECURITY

UI and page go through `/api/seller/access`. Generic miss. Attempt throttle. One code cannot return a neighbor listing (RPC matches that code). Hashing still OPEN. 0042 removes public RPC.

## M. STORAGE SECURITY

`home-docs` / `shi-studies` private + owner folder. `living-marks` public by design. No change to bucket policies in this phase.

## N. PAYMENT READINESS

Boundary only. No provider. No card storage.  
`POST /api/billing/webhook` rejects unsigned / unconfigured.  
Idempotency table `billing_webhook_events`.  
`on delete restrict` — payment rows cannot cascade-wipe users.  
Client redirect is not entitlement. Failed payment must not delete user data.  
Do not connect live charges until this PR is live and a provider is chosen (test mode first).

## O. DATABASE PERFORMANCE

Likely walls: PostGIS `parcels_mvt`, frame analyze (capped 1500 / 0.45°), serverless connection count. HTML is not the first wall. No blind index rewrite.

## P. POSTGIS PERFORMANCE

Spatial indexes already used on parcels. Frame analyze is bbox + county + cap. Large polygons rejected. Statewide geometry is not computed for a local frame.

## Q. CACHE / CDN STATUS

Tiles unclassified for 429 (CDN/cache). Private CRM/SHI not shared-cached. CAD overlay short TTL — not presented as newly verified.

## R. LOAD TEST RESULTS

`scripts/phase-3-capacity-probe.mjs` against live eqmg (public GETs: `/`, `/marketplace`, `/login`, `/api/cad/status`, `/api/map/launch7/status`). 2026-08-31.

| Concurrency | Samples | p50 | p95 | p99 | 5xx | Note |
|---|---|---|---|---|---|---|
| 20 | 20 | 200ms | 915ms | 915ms | 0 | All 200 |
| 50 | 50 | 164ms | 957ms | 1071ms | 0 | All 200 |
| 100 | 100 | 203ms | 967ms | 1061ms | 0 | All 200 |

Stages 100 → 100,000 simulated users were **not run**. Production was not attacked at those levels.

## S. MAXIMUM SUCCESSFULLY TESTED CONCURRENCY

**100 concurrent public GET requests** on live eqmg (0 errors). That is not 100,000 users.

## T. FIRST BOTTLENECK

Expected (not measured at 100k): parcel MVT + imagery origin, then Supabase connections / PostGIS analyze, then Vercel SHI concurrency.

## U. COST BEHAVIOR UNDER LOAD

Not measured at scale. Tile origin + PostGIS minutes are the cost risk. Do not extrapolate.

## V. PRODUCTION RESET BEFORE COUNTS

Founder SQL 2026-09-01: 23 auth users (10 consumer, 10 agent, 3 broker), 1 listing, 4 prospects, 6 farms, 3 studies, 3 frames, 7 homes, 1 inquiry, 1,904 product analytics events, 0 messages/referrals/buyers/seller_clients/suites/follows/listing analytics. `county_parcels` = 345,387. Wipe **not** executed.

## W. PRODUCTION RESET AFTER COUNTS

Counts recorded. Reset **not** run. Waiting for founder **APPROVE RESET** and a backup.

## X. PLATFORM DATA VERIFIED PRESERVED

No delete SQL in Phase 3 migrations. CAD status still readable on eqmg. Founder SQL `county_parcels` = 345,387. Live county status sum = 345,385. Preserve table updated in `docs/PRODUCTION-RESET-PLAN.md`.

## Y. PHASE 1 REGRESSION RESULTS

`npm run test:phase-1` — must pass after edits.

## Z. PHASE 2 REGRESSION RESULTS

`npm run test:phase-2` — must pass after edits.

## AA–AC. MOBILE / TABLET / DESKTOP

No Phase 3 UI redesign. Portal session redirect and seller generic errors are the only user-visible changes. Continuum / Glass / sound not wrapped out.

## AD. MAP RESULTS

Tile paths remain unclassified. No new tile 429. Live `/api/cad/status` 200.

## AE. SOUND / TOUCH / MOTION RESULTS

No new sounds on rate-limit, analytics, or security events.

## AF. LAUNCH BLOCKERS

- [ ] Phase 1 + 2 PRs merged / eqmg green for this branch  
- [ ] Apply 0041 + 0042 in Supabase (after service-role confirmed on eqmg)  
- [ ] WAF rules in LOG on eqmg  
- [ ] Seller passcode hashing after reset  
- [ ] Turnstile on signup/reset only  
- [ ] Backup + founder **APPROVE RESET** + wipe + post-reset smoke  
- [ ] Staged load beyond the public GET probe  
- [ ] Payment provider chosen (test mode) — not required to finish Phase 3 docs  

**Not launch-ready** until the gate in the Phase 3 brief is checked. Next step is **launch readiness review**, not Phase 4.

---

## Launch checklist (honest)

- [x] Attack surface inventoried  
- [x] Critical cad/status fail-closed preserved  
- [x] Archie HTTP Pro boundary (live 401 anonymous)  
- [x] Service-role audit written  
- [x] Payment boundary ready (no live charges)  
- [x] Reset plan written — **STOP before delete**  
- [x] Rollback / incident notes written  
- [x] Capacity probe documented as what was actually tested  
- [x] Map tile 429 not added  
- [ ] Test-user reset approved and completed  
- [ ] 100k load — **NOT claimed**
