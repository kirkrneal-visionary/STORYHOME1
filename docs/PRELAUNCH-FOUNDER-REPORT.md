# Pre-launch founder report

**Nothing was deleted.** This is the report required before any test-user reset.

Canonical live project: **storyhome-1-eqmg**. Ignore the other Vercel check.

---

## A. CRITICAL SECURITY ISSUES

1. **Anyone logged in could promote themselves to Story Pro** by updating `profiles.account_kind`. That unlocks every Archie API.  
   *Fix in repo:* migration `0039_prelaunch_security.sql` locks `account_kind` / TREC fields on update. **Not live until that SQL is applied.**

2. **`boost_county_slot_overrides` had no RLS** — any authenticated user could change boost economics.  
   *Fix:* 0039 enables RLS (no client policies).

3. **Committed wipe script** (`clear-db.mjs`) held a live-looking Supabase URL + anon JWT.  
   *Fix:* script disabled; secrets removed. **Rotate that key if it was ever the production project.**

---

## B. HIGH PRIORITY ISSUES

1. Signup still trusts `account_kind` in user metadata (inspector/appraiser/lender can become `agent` without TREC). Lock stops *later* escalation, not the first insert.  
2. Seller passcodes are still stored in plaintext on `listings`. This PR stops the app and (after 0039) PostgREST from selecting that column. Hashing + attempt limits still needed.  
3. `seller_portal_by_code` is callable by logged-out users — brute-force risk.  
4. `clerk_deed_transfers` / `clerk_county_coverage` had no RLS — any login could read the deed index. 0039 enables RLS.  
5. Dev login emails/passwords exist in client code (now hidden in production builds). Never set `NEXT_PUBLIC_ENABLE_DEV_LOGIN` on eqmg.  
6. Unauthenticated tile / lidar / CAD overlay proxies can be crawled for cost. Tiles are not naively rate-limited (that would break the map). WAF LOG + cache next.  
7. County parcels are world-readable (public record). Archie HTTP is Pro-gated; PostgREST is not a second gate for CAD.  
8. Marketplace map popups interpolated CAD text into HTML — now escaped.

---

## C. MEDIUM PRIORITY ISSUES

1. `/portal` is only gated in the browser. APIs still require Pro.  
2. `profiles` email is readable under the public read policy if a client asks for it.  
3. Corridor RPCs granted to all `authenticated` users (not only Pro).  
4. `/api/analytics` accepts catalog events from anyone (now rate-limited).  
5. No durable (multi-instance) rate store — in-memory + WAF required.  
6. No CSP/HSTS existed — added in `next.config.ts`.  
7. Portal / consumer pages need server-side layout guards.

---

## D. LOW PRIORITY ISSUES

1. Client `localStorage` role toggle is UI-only.  
2. Static `dangerouslySetInnerHTML` boot script (no user input).  
3. Launch-7 status exposes light ops metadata.

---

## E. BOT / ABUSE PLAN

Layers: Vercel WAF (LOG first) → app rate classes → Supabase Auth limits → Turnstile on signup/reset → geometry caps (already on frames) → no giant CAD export.

Turnstile: use Cloudflare on signup + password reset only. Not on every map pan.

---

## F. API RATE-LIMIT PLAN

| Class | Window | Examples |
|---|---|---|
| None | — | `/api/map/*` tiles, `/api/parcels/*` tiles |
| Low | 90 / min / IP | Other `/api/*` |
| Medium | 30 / min / IP | SHI reads, CAD overlay, TREC, analytics |
| High | 10 / min / IP | Area, Similar, portfolio, strongest sites, lidar parcel/profile |

429 body: `Too many requests. Wait a moment and try again.`

---

## G. RLS RESULTS

| Table | RLS | Notes |
|---|---|---|
| User CRM / SHI / My Home / messages | ON | Owner-keyed |
| `profiles` | ON | Update locked by 0039 trigger |
| `listings` | ON | Public read — passcode column revoked after 0039 |
| `county_parcels` | ON | Public read (truth data) |
| `boost_county_slot_overrides` | ON after 0039 | Was OFF |
| `clerk_deed_transfers` / coverage | ON after 0039 | Was OFF |
| Consumer A ↛ Consumer B private rows | Pass (owner policies) | |
| Agent A ↛ Agent B Prospects/Farms | Pass (owner policies) | Unless they hit PostgREST as themselves only |
| Consumer ↛ Archie HTTP | Pass (`requireStoryPro`) | Until account_kind lock is applied, DB self-promote was the hole |
| Logged-out ↛ private CRM | Pass | |
| Seller passcode ↛ neighbor listings | Column hidden after 0039; hashing still OPEN | |

Adversarial JWT tests need a live project — not run against production from this agent.

---

## H. SERVICE-ROLE RESULTS

| Use | OK? |
|---|---|
| CAD ingest scripts | Yes — batch, not request path |
| Deeds clerk reader | Yes — after Pro HTTP gate |
| Corridor traffic cache write | Yes — after Pro HTTP gate |
| `/api/cad/status` fallback | **Removed** — missing anon no longer escalates |
| Missing anon key | SHI returns 503 — does not use service role |

---

## I. SECRET / ENV RESULTS

- `.env*` is gitignored except `.env.example`.  
- No `NEXT_PUBLIC_` service-role.  
- Burned: JWT inside old `clear-db.mjs` — rotate if it matches live.  
- Mapbox `pk.` token is public by design; lock it to eqmg in the Mapbox account.  
- Payment secrets: none yet; keep server-only when added.

---

## J. PAYMENT-READINESS RESULTS

Ready as a **boundary**, not a product:

- No card numbers in our DB.  
- Future webhook: verify signature, store provider event id, idempotent entitlement.  
- Client “payment success” page must not grant Story Pro.  
- Failed payment ≠ delete user data.

---

## K. 100K LOAD-TEST PLAN

Do **not** fire 100k at production.

Stages: 100 → 500 → 1k → 5k → 10k → 25k → 50k → 100k **simulated** users on a staging mix:

- 40% marketplace + tiles  
- 25% listing detail  
- 15% login/refresh  
- 10% Pro search / parcel click  
- 8% frame analysis  
- 2% writes (prospect/farm)

Measure p50/p95/p99, 429s, DB CPU, connections, tile latency, cost. Stop at first failure.

---

## L. EXPECTED FIRST BOTTLENECKS

1. Parcel MVT + imagery origin (bandwidth)  
2. Supabase connection count / PostGIS on frame analyze  
3. Vercel function concurrency on SHI POST  
4. Auth signup if bots hit `/login`  

The HTML app will not be the first wall.

---

## M. TEST ACCOUNT COUNT

**UNKNOWN** — needs the read-only SQL in `TEST-DATA-RESET-PLAN.md`.

Assume every current Auth user is a test account unless you name one to keep.

---

## N. TEST DATA COUNT

**UNKNOWN** until the same snapshot. County parcel counts must be recorded *before* any user wipe so we can prove truth data was not touched.

---

## O. UNKNOWN / REQUIRES APPROVAL

- Every **listing** (TEST vs REAL)  
- Any Auth user you want to **keep**  
- Whether `product_analytics_events` should be wiped  
- Whether public signup stays open during the rest of hardening

---

## P. EXACT DELETION PLAN

See `docs/TEST-DATA-RESET-PLAN.md`. Backup → inventory → founder list → children rows → storage → profiles → Auth users → recount `county_parcels` unchanged → result doc.

---

## Q. EXACT ROLLBACK PLAN

Restore the Supabase backup taken immediately before the wipe. Git cannot roll back the database.

---

## Launch checklist (now)

- [x] Security audit written  
- [x] App rate classes on non-tile APIs  
- [x] Security headers + CSP  
- [x] Service-role audit (status route fixed)  
- [x] Demo passcodes out of production UI  
- [x] clear-db secrets removed  
- [x] Archie HTTP still Pro-only  
- [x] Spatial frame caps already present (not weakened)  
- [x] Payment boundary documented (no provider built)  
- [x] 100k plan written (not executed)  
- [ ] Migration 0039 applied in Supabase  
- [ ] WAF rules in LOG on eqmg  
- [ ] Turnstile on signup/reset  
- [ ] Seller passcodes hashed  
- [ ] Backup + founder approval + test-user reset  
- [ ] Staged load test  
- [ ] Post-reset smoke tests  

**The platform is not launch-ready until the unchecked boxes are done.**
