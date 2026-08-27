# STORY HOME — FULL SYSTEM MAP FOR EXTERNAL ANALYSIS

Copy everything below this line into ChatGPT.

You are analyzing **Story Home**, a live East Texas real-estate product (marketplace + agent workspace). This brief is current as of **27 Aug 2026**. Do not invent features. If something is marked MISSING, SHELL, or DISCONNECTED, treat it as not shipped.

---

## 0. How to use this brief

Answer in this order unless asked otherwise:

1. What is actually connected front → back
2. What looks connected but is not
3. What is missing that a launch product usually needs
4. Highest-risk bugs
5. Security: what we use now vs what you recommend
6. What to fix first vs later

Do not propose rebuilding the product. Do not weaken Archie’s Intelligence as Story Pro–only. Do not treat county CAD / parcel / terrain data as “test data.”

---

## 1. Product identity

**Name:** Story Home  
**Line:** Every home has a story.  
**Live site (canonical):** https://storyhome-1-eqmg.vercel.app  
**Ignore** other Vercel projects named `storyhome-1`. Only `storyhome-1-eqmg` is live.

**What it is:**

Two products in one app:

1. **Consumer marketplace** — browse East Texas listings, map, save suites, My Home vault
2. **Story Pro workspace** — listings, CRM, tools, community, plus **Archie’s Intelligence** (county-records research)

**Archie’s Intelligence is Story Pro only.** Consumers must never get full county intelligence.

**Launch geography:** 7 Texas counties only  
Polk, Angelina, Trinity, Tyler, San Jacinto, Liberty, Walker.

**Stack:**

- Next.js 16.3 / React 19.1 / TypeScript / Tailwind 4
- Vercel hosting
- Supabase: Postgres + Auth + RLS + Storage
- Maps: MapLibre first; optional Mapbox GL engine for Research 3D chrome only
- Story Home–owned parcel MVT, streets, imagery
- USGS 3DEP lidar/DEM, Texas StratMap / NAIP imagery, county CAD / ArcGIS overlays
- No generative AI in Archie. “Similar” is deterministic rules, not a model.

**Scale of codebase (approx):** ~72k src lines, ~89k broader app, 25 page routes, 41 API routes, 40 SQL migrations.

**Payments:** not built. Boost UI is a prototype. No Stripe. No webhooks. Do not grant Story Pro from a client “success” page later.

---

## 2. People and what they are allowed to do

| Persona | How they exist | What they get |
|---|---|---|
| Anyone / logged out | No account | Landing, marketplace, listing detail, agent/brokerage public pages, legal pages, seller code entry |
| Consumer (buyer / homeowner) | Supabase Auth + `profiles.account_kind = consumer` | My Home, Suites (local only), Following (shell), Settings, inquire on listings |
| Agent / Story Pro | `profiles.account_kind = agent` | Story Pro portal + Archie APIs |
| Broker of Record | `profiles.account_kind = broker` | Everything an agent gets + roster/invites + Community Admin |
| Inspector / appraiser / lender | Can sign up as “pro” **without TREC** and still become `agent` | Same Archie access as a realtor today — this is a gap |
| Seller | **Not a real account.** They paste a listing password | Seller portal: listing stats UI + boost prototype. No Archie. No CRM. |

App login kinds: `consumer` | `pro` (DB=`agent`) | `broker` | `seller` (client-only session).

There is a separate **“View as buyer”** toggle (`localStorage story-home-role`). It only changes nav/colors. It does not change the real account.

---

## 3. Front-end pages (every route)

Middleware does **not** protect pages. It only refreshes the auth cookie and rate-limits APIs. Almost all “you must be logged in” checks are **in the browser**.

### Public

| Path | What it is | Data | Connected? |
|---|---|---|---|
| `/` | Landing. Search hero + featured listings | Live listings from Supabase | YES — hero search goes to marketplace; cards go to listing detail |
| `/marketplace` | Browse + filters + map | All listings, no pagination | YES |
| `/marketplace/[id]` | Listing detail | Server load of one listing | YES, but **broken on old production** if listing query still uses `select *` after passcode column hide |
| `/agents/[id]` | Public agent / Living Mark page | Profile + that agent’s listings | YES |
| `/b/[slug]` | Public brokerage page | Brokerage + roster | YES if brokerage exists |
| `/network` | Pro directory | All agent/broker profiles | YES |
| `/about` `/contact` `/privacy` `/terms` `/fair-housing` `/accessibility` | Legal / company | Static | YES (draft legal; TREC license still `[Pending]`) |
| `/login` | Sign in / sign up / seller code | Auth + TREC check for realtor/broker | YES |

### Consumer (client-gated)

| Path | What it is | Connected? |
|---|---|---|
| `/home` | My Home vault (homes, records, expenses, docs, grants) | YES to Supabase home tables |
| `/saved` | Suites (albums of listings) | **DISCONNECTED from DB.** Uses `localStorage` only. `suites` tables exist and are unused |
| `/saved/[suiteId]` | Suite player | Same localStorage problem. Will not work on another phone |
| `/following` | “People you follow” | **SHELL.** Always empty. Follow heart on cards is local `useState`. `follows` table unused |
| `/profile` | Account home | YES for identity; links to Messages/Referrals that are paused |
| `/settings` | Profile, Living Mark, brokerage roster | YES |

### Story Pro (client-gated page; APIs are server-gated)

| Path | What it is | Connected? |
|---|---|---|
| `/portal` | Agent cockpit tabs | YES for listings/CRM/tools; Community needs a brokerage |
| `/portal?tab=tools` | Mortgage + cap-rate calculators | Local math only. Fine |
| `/portal?tab=listings` | Create/edit listings, CAD pin, seller password | YES |
| `/portal?tab=buyers` | Buyer CRM + inbound inquire leads | YES |
| `/portal?tab=sellers` | Seller-client CRM | YES |
| `/portal?tab=homes` | Homes a consumer granted to the agent | YES |
| `/portal?tab=community` | Brokerage channels / Q&A | YES if `brokerage_id` set; empty otherwise |
| `/portal/intelligence` | Archie’s Intelligence | YES to `/api/shi/*` |

### Seller

| Path | What it is | Connected? |
|---|---|---|
| `/seller` | Paste the password the agent sent | YES — checks code, then opens portal |
| `/seller/portal/[code]` | Listing stats + boost buttons | **HALF.** Page loads from a server function using the password. The **numbers do not go up** because marketplace views are not written into listing analytics |

### Paused (URL works, product does not)

| Path | Status |
|---|---|
| `/messages` | Honest “not shipping” screen. `messages` table exists. No UI reads it |
| `/referrals` | Honest “not shipping” screen. `referrals` table exists. No UI reads it |

These two are **hidden from the main nav** but still mentioned on Profile / old login copy.

---

## 4. Navigation, landing, transitions, touch

### Header / dock

- Overlay header + floating bottom dock (glass).
- Hidden on seller pages.
- Landing (`/`): Buy / Rent / Sell / Agents.
- Consumer: Marketplace, My Home, Suites, Following.
- Pro: Marketplace, Story Pro, Network, plus an **Archie** node.
- Dock consumer: Home, Suites, Search, Profile/Login.
- Dock pro: Home, Story Pro, Archie, Profile/Login.

### Motion

- Story Continuum: route enter, swipe-back from the left edge, press states, safe-area padding, living header compact/minimal.
- Swipe-back is **disabled on maps**, sliders, and unsaved forms so pan/zoom is not stolen.
- Listing photo uses View Transitions between card and detail.
- Sound cues exist; respect reduced motion.

### Touch / phone known issues (already patched in places)

- Marketplace map resize after expand
- iOS chrome / Research bottom sheet settle
- Imagery DPR cap on phones
- Research `touchPitch`
- Sheet layout under 1079px

### Landing page connections

Landing search → marketplace with query.  
Featured cards → listing detail.  
Sell CTA → `/seller`.  
Agents CTA → `/network`.  
If listings fail to load, hero silently shows no cards (no crash).

---

## 5. Maps — what talks to what

| Surface | Engine | Parcels | Streets / photos | Terrain / lidar | County CAD overlays |
|---|---|---|---|---|---|
| Marketplace map | MapLibre | `/api/parcels/{z}/{x}/{y}` → PostGIS `parcels_mvt` | Owned Launch-7 streets + imagery | No | Yes — `/api/cad/overlay` (public) |
| Listing CAD pin (agent form) | MapLibre | Same parcels | Launch-7 | No | Yes |
| Archie Research | Mapbox GL if public Mapbox token exists, else MapLibre | Same parcels | Launch-7 + NAIP/USGS | Yes — `/api/map/lidar/*` USGS 3DEP | No |
| Archie Corridors | MapLibre | Parcels | Launch-7 | No | No |

Rules:

- Do **not** load Mapbox/Google street or satellite **tiles**. Engine may be Mapbox; photos/streets/DEM stay Story Home / USGS.
- Tile APIs are public and **not** per-request rate-limited (pan/zoom would break).
- Tile APIs send `Access-Control-Allow-Origin: *` so the map worker can read them.
- Imagery outside the 7-county footprint often returns empty tiles (looks blank, not a crash).
- R2/CDN for tiles is planned; MapLibre still hits the Next API first because worker CORS is not finished.

---

## 6. Back-end APIs (41)

### Public / unauthenticated

- `/api/map/launch7/imagery/{z}/{x}/{y}` — photos
- `/api/map/launch7/streets/{z}/{x}/{y}` — streets
- `/api/map/launch7/status` — light ops
- `/api/map/lidar/{z}/{x}/{y}` and `/dem/{z}/{x}/{y}` — terrain skins
- `/api/map/lidar/read` — one elevation point
- `/api/map/lidar/profile` — elevation slice (expensive)
- `/api/map/lidar/parcel` — parcel terrain sample (expensive)
- `/api/parcels/{z}/{x}/{y}` — parcel polygons; owner names appear at close zoom
- `/api/cad/overlay` — county appraisal overlay
- `/api/cad/status` — which counties have CAD loaded
- `/api/verify-trec` — Texas license lookup
- `/api/analytics` — product event ingest (optional login)

### Story Pro only (`requireStoryPro`: real session + `account_kind` in `agent`/`broker`)

Search, property, area, similar, portfolio, owner-matches, freshness, changes, neighbors, deeds, flood, environment, utilities, corridors (analyze / strongest-sites / traffic / projects / parcel-location), prospects CRUD + notes, farms CRUD, study folders/frames, research worth-a-look, multifamily parcel/review.

**Consumers calling these get 403. Logged-out get 401.**  
Role is read from the server profile, not from a client “I am an agent” flag.

### No API routes for (browser talks to Supabase directly)

Listings CRUD, CRM buyers/sellers, community, My Home, inquire/leads, suites (but suites don’t use DB), follows (unused), messages (unused), referrals (unused).

There are **no** Next.js `"use server"` actions.

---

## 7. Database — what is wired vs leftover

### Wired and used

- `profiles`, `brokerages`, roster invites
- `listings` + `listing_parcels` (CAD pin on a listing)
- `buyers`, `seller_clients`, `crm_activities`, `crm_campaigns`
- `inquiries` + lead claim RPCs
- `homes` + documents/records/expenses/grants
- `shi_prospects`, `shi_farms`, `shi_study_folders` / frames / snapshots
- `county_parcels` + values + change events + `cad_county_status` (truth; do not delete)
- `product_analytics_events` (site events, not seller-portal numbers)
- `agent_world_engagement` (Living Mark plays)
- Storage: `home-docs` (private), `shi-studies` (private), `living-marks` (public read)

### Tables that exist but the UI does not really use

| Table | Why it looks dead |
|---|---|
| `suites`, `suite_items` | UI uses localStorage |
| `follows` | Following page is a shell |
| `messages` | Pause page |
| `referrals` | Pause page |
| `listing_analytics` / `listing_analytics_events` | Seller portal reads them; marketplace never writes views/clicks |
| `listing_boosts` | Boost button is a prototype; no Stripe |
| `channels` / `threads` / `posts` | Only if the agent has a brokerage |

### County truth (never treat as test-user data)

`county_parcels` (~345,000 rows live), values, change events, CAD status, corridor road/traffic cache, clerk deed index (server-only), flood/PUCT/NWI/TIGER/TxDOT facts, tile caches.

---

## 8. Connection map (front → back)

```
LANDING / MARKETPLACE
  → Supabase listings (public columns)
  → /api/parcels + /api/map/launch7 + /api/cad/overlay
  → Inquire → inquiries table → agent lead feed

MY HOME
  → homes* tables + home-docs storage
  → optional grant → agent Client Homes tab

SUITES / FOLLOWING
  → localStorage / fake heart
  → DB tables sit unused

STORY PRO PORTAL
  → listings / CRM / community via browser Supabase + RLS
  → Listing CAD map → parcels + CAD overlay (not full Archie)

ARCHIE
  → /api/shi/* → requireStory Pro
  → county_parcels / PostGIS / FEMA / PUCT / TxDOT / clerk (service role)
  → private prospects / farms / studies (RLS owner)

SELLER TAB
  → seller types password
  → RPC seller_portal_by_code
  → listing + analytics row
  → marketplace does NOT increment those numbers

AUTH
  → Supabase Auth
  → trigger creates profiles from signup metadata
  → TREC check only in the browser for realtor/broker
```

---

## 9. Accidentally unconnected (looks real, is not)

1. **Following** — nav exists, page always empty, heart does not save.
2. **Suites** — looks like a product; stays on that phone only.
3. **Seller listing stats** — dashboard exists; browse/open listing does not write the events.
4. **Like / save / review counts** on cards — read from DB, never updated. Stay zero.
5. **Boost / “pay to feature”** — buttons exist; no card charge, no real slot lock.
6. **Messages / Referrals** — Profile still talks like they work.
7. **Login demo text** — still says messages unlock after login.
8. **Clerk deeds desk** — API path exists; ingest is mostly sample/fixture; often shows nothing.
9. **Energy REI research mode** — listed, `enabled: false`, coming soon.
10. **Map Memory** in Study Vault — labeled pending.
11. **Launch-7 CDN** — objects may exist; MapLibre still uses the API, not the CDN.
12. **Product analytics** — events can be stored; there is no dashboard (no PostHog/GA).

---

## 10. Missing that should not be missing for launch

1. Server-side lock on `/portal` and `/home` (not just a browser check).
2. Signup that cannot become Story Pro without a real server check (TREC for realtors; do not give inspectors full Archie unless that is the business rule).
3. Seller listing-stat capture **or** remove the promise.
4. Either wire Suites/Following to the database **or** hide them.
5. Either ship Messages/Referrals **or** stop mentioning them.
6. Real payment later: server webhook, no Pro grant from a thank-you page.
7. Footer TREC broker name/license still `[Pending]`.
8. Privacy/Terms still draft / `[pending]` dates.
9. Pagination on marketplace, network, agent listings (all listings load at once).
10. Durable rate limits (today: memory per server instance + future Vercel WAF).
11. Hashed seller passwords + attempt limits (today: plaintext column; portal is “whoever has the password”).
12. Test-account wipe still **not done**. Founder has not approved a backup + delete. County data must stay.

---

## 11. Likely bugs

| Risk | Why |
|---|---|
| Listing detail 404 on live | Production JS still asked for every listing column after we hid the seller password column. Fix = ship the app that lists columns on purpose |
| Marketplace gets slower as listings grow | `fetchMarketplaceListings()` has no limit |
| Network / agent pages load everyone | No pagination |
| Rate limit easy to bypass | In-memory, one Vercel instance at a time |
| `/portal` URL works logged out until JS runs | Client-only gate |
| Inspector signup → full Archie | No TREC, still `agent` |
| Anyone logged in can call some PostgREST RPCs (`parcel_neighbors`, corridor helpers) | HTTP Archie is Pro-only; raw database functions are wider |
| Anyone can read `county_parcels` via Supabase | Public record by design; Archie HTTP is not the only door |
| Tile / lidar cost if scraped | Public, no naive per-tile 429 |
| Seller password brute force | RPC is public; no attempt cap |
| Huge drawn shapes | Frame caps exist (span / vertices / parcel count) — keep them |
| CSP still allows `unsafe-inline` / `unsafe-eval` | Needed for Next today; weaker than ideal |
| Empty CAD observation / stability | Looks “broken” if county refresh has not been run |
| Demo mode if env vars missing | Local impersonation of Pro in the UI |

Honesty rules that prevent fake-data bugs if kept:

- CAD value ≠ list price ≠ sale
- Stability index ≠ will-sell
- CAD observation ≠ deed date
- Missing from a CAD file ≠ sold
- No phone/email scraping from CAD

---

## 12. Security — current vs recommended

### What we are using now

Layers (some live, some in repo, some not on the live site yet):

1. Vercel host + planned WAF (LOG first; not fully configured in dashboard)
2. Supabase Auth + cookie session refresh
3. `requireStoryPro()` on every `/api/shi/*`
4. RLS on user tables (owner-keyed)
5. Privilege lock trigger: a logged-in user **cannot** change themselves to agent/broker after signup (applied live)
6. Clerk deed + boost-override tables: RLS on, no client policies (applied live)
7. Listing password column hidden from public `select *` (applied live) — this is what broke old listing pages
8. App rate classes: tiles unlimited; other APIs low/medium/high; 429 message is clean
9. Security headers: CSP, HSTS, nosniff, same-origin frames, referrer, permissions
10. Marketplace map popups escape HTML
11. `/api/cad/status` no longer falls back to the all-powerful service key
12. Demo seller passwords hidden when Supabase is on
13. Wipe script disabled; old committed key treated as burned
14. Service role used only for ingest + a few Pro-gated server jobs (deeds, corridor cache)
15. `npm audit --omit=dev` was clean at last check

### What is still weak

- Signup still trusts “I am an agent” in signup metadata (first insert)
- Seller passwords still stored as readable text; hashing not done
- Seller portal has no lockout
- `/portal` not locked on the server
- Some Archie RPCs callable by any logged-in user if they skip the UI
- Profile emails readable if someone asks the profiles table for them
- Tile/lidar/CAD overlay public (cost / scrape)
- No Cloudflare Turnstile / captcha on signup or reset yet
- No durable (shared) rate store
- Payments not designed in schema yet (boundary only)

### Recommended (do not implement in this analysis — just rank)

1. Keep Archie HTTP Pro-only. Add the same check **inside** neighbor/corridor RPCs.
2. Server-render gate for `/portal`, `/home`, `/settings`.
3. Force new accounts to `consumer` unless a **server** TREC (or founder) promotion happens.
4. Hash seller passwords; wrap the check in an API with attempt limits.
5. Turnstile on signup + password reset only (not on every map pan).
6. Vercel WAF on eqmg: LOG first on `/api/*` except tiles, login, seller portal, TREC, Archie spatial posts.
7. Hide profile email from public reads.
8. When payments exist: provider-hosted cards, signed webhooks, idempotent event IDs, never grant Pro from a browser redirect. Failed pay must not delete Farms/Prospects.
9. Paginate and cap expensive list/search.
10. Do **not** claim 100,000 concurrent users. First likely walls: parcel tiles + imagery bandwidth, then Supabase connections / PostGIS, then Vercel on Archie POSTs.

---

## 13. Test accounts / launch wipe (status)

A wipe plan exists. **Nothing has been deleted.**

Must never delete: county parcels, CAD history, maps, terrain, corridor facts, migrations.

Must classify listings as real vs test before deleting any listing. Unknown listings stay.

Founder must approve backup + wipe. Until then, assume every current Auth user is test unless named to keep.

---

## 14. What “good” looks like vs today

| Area | Today | Honest launch bar |
|---|---|---|
| Archie Research / Prospects / Farms / Vault | Real, Pro-gated | Keep; deepen, don’t rebuild |
| Marketplace browse + map | Real | Paginate; keep maps owned |
| My Home | Real | Keep |
| Suites / Following | Fake / local | Wire or hide |
| Messages / Referrals | Pause screens | Hide until built |
| Seller tab | Password works; stats don’t increment | Wire counts or change the copy |
| Payments | None | Add later, server-truth only |
| Security | Partial live locks + app headers/limits | Finish signup lock, seller hash, WAF, portal server gate |
| Analytics | Event sink, no product dashboard | Optional; not required to sell Archie |

---

## 15. One-sentence truth

Story Home is a real East Texas marketplace with a much stronger Story Pro county-research cockpit (Archie). Several consumer and seller screens **look** finished but are not wired. Security has started (no self-promote to Pro; some tables locked; listing passwords hidden from public dumps) but is not launch-complete. Do not delete county data. Do not give consumers Archie.

---

## 16. Questions for the analyst

1. What should we hide before launch vs finish?
2. What is the smallest seller-portal truth (wire counts vs remove the numbers)?
3. How should inspector/appraiser/lender sit vs realtor Archie access?
4. What is the first security move that is not “more product”?
5. What would break first at high traffic?
