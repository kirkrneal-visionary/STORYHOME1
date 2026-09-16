# Pre-launch engineering plan

**Status:** Planning only. No implementation in this document’s originating assignment.  
**Recorded:** 2026-09-16  
**Code examined:** `origin/main` `ecd47c8` (live expected). Agent also compared prior checkout `6b9ff1d` (domain notes only).  
**Live:** https://www.storyhome.app · ship project `storyhome-1-eqmg`  
**Database project (live):** `ksvllgzsnzyahqsjuove`  
**Applied migrations:** repo has `0001`–`0053`. Live apply list **not verified**. Public `/api/cad/status` fields imply ops-scale columns (≈0031 era) exist.

This file is the authoritative execution plan for the corrections below. Later implementation must follow it. Do not revive superseded decisions (office loses Pro; Suites finished by a “device only” label).

---

## A. Plain-language assessment

Users can already browse, sign in, and — if they are Story Pro or office — research county parcels. Four intended jobs do not hold all the way through:

1. **A realtor can press “Scan MLS for sold” and the site writes Sold on a real listing.** There is no MLS. Marketplace, off-market, and the seller portal then treat that home as gone.
2. **Analyze can show the last county’s answer after the user has already drawn something else.** Save uses the selected frame’s geometry and the server recomputes (`createFarm` / `saveMarketFrame` call `analyzeArea`). The screen can still lie. A user can save what they think they see.
3. **Suites look like account albums and the login page already says data syncs across devices.** Saves still go to `localStorage` (`story-home-suites`). The unused `suites` / `suite_items` tables are never read. A second phone is empty.
4. **We have not proven one account cannot read another’s private Farms, Vault, Prospects, or My Home files** on a disposable database. SQL says owner-only. That is not a live two-user test.

Office **keeps** Story Pro and Archie. That is not a bug. Brokerage listing edit is a different permission from private research rows.

This plan: stop the false Sold write; bind Analyze and Save to the current drawing; put Suites on the account; prove isolation in a **safe** place; then harden county refresh and measure capacity. Billing, Messages, Following, and Referrals stay out of this program.

---

## B. Confirmed requirements (current explicit)

| ID | Requirement | Source |
|---|---|---|
| R1 | Office / managing-broker **keeps** Story Pro and Archie. Landing stays `/office`. Both workspaces remain. | This order; PR #185; `mayUseStoryPro`; `0051` |
| R2 | Workspace access ≠ every agent’s private Farms, Vault, Prospects, homes, or files. Same brokerage does not open those. Office **may** edit listings for **that** brokerage (`is_broker_of`). | This order; `0023`/`0025`/`0026`; `0002` listings |
| R3 | Suites belong to the **authenticated account**. Device A save → device B same login retrieves. Browser-only is incomplete. Keep album structure (name, description, cover tone, ordered homes, player, share). | This order; `b468f36`; `SuitesLibrary` |
| R4 | Displayed analysis and saved record must match the current county + drawing/radius. Late responses must not paint or persist as the new selection. Frozen Vault snapshots stay historical on purpose. | This order |
| R5 | Farms ≠ Study Vault. CAD ≠ live listing ≠ private client row. Owner/value change ≠ sale/appreciation. Failed refresh keeps last-known-good. Montgomery stays optional; not on the daily key list. | Constitution; `88f5306`; `cad-sources.mjs` |
| R6 | Use Labs and the demo **we already have** before buying a new platform. | This order |
| R7 | No production wipe, no production load test, no billing in this program. | Standing |

**Superseded:** Wave 3 “office XOR Pro”; “finish Suites with a device-only sentence”; any suggestion that office should lose Archie.

**Inferred (safe to plan without a new decision):** Share links for Suites stay view-by-URL of public listing cards, not a second user’s private album API. Last-write-wins on album edits is enough (no realtime bus).

**Awaiting (does not block Waves 1–3):** Exact Suites share privacy (public link vs signed-in owner only). Default plan: album **metadata** stays owner-only; a `/saved/[id]` link shows listing cards the visitor can already see on Marketplace.

---

## C. Recommended waves: **6**

Not a template. Six groups because they have different blast radius, different rollback, and different proof:

| Wave | Name | Why its own wave | Launch? |
|---|---|---|---|
| **1** | Stop the false MLS write | Tiny, frontend-only, writes production listings **today**. Must not wait on a test database. | **Blocks launch** |
| **2** | Safe test place + isolation harness | Labs and demo **cannot** take synthetic writes. Without this, Suites and RLS cannot be proven. | **Blocks calling it secure** |
| **3** | Analyze / Save context | Different files from Suites. Server already recomputes; the lie is on screen and Save enablement. | **Blocks launch** of Research save trust |
| **4** | Account Suites | Schema + import + UI. Needs Wave 2 before any write test. | **Blocks Suites as a launched capability** |
| **5** | County refresh reliability | Independent ops. Last-known-good already holds. Do not couple to Suites. | **Does not block** a Suites/Research launch if stale counties stay labeled. Required before claiming “current tax roll.” |
| **6** | Capacity on the isolated stack | After correctness. Account count ≠ load. | **After** Waves 2–4. Not a 100k-user claim. |

**Sequence**

```
Wave 1 ──────────────────────────► can merge alone
         \
          Wave 2 ──► required evidence gate for 3 and 4
          Wave 3 (code) may start after 1; **proof** waits on 2
          Wave 4 implementation waits on 2 (and 0053-class privilege locks understood)
          Wave 5 anytime after 1 (no Suites coupling)
          Wave 6 after 2 + a green 3/4 harness
```

**Do not** put MLS, Suites schema, CAD ingest, and a redesign in one PR.

**Office Pro:** no removal wave. Wave 2 **tests** that office can call `/api/shi/*` and **cannot** read another agent’s `shi_*` / home files.

---

## D. Detailed design by wave

### Labs and demo (inspected — R6)

| Resource | What it actually is | Same production DB? | Safe for synthetic writes? |
|---|---|---|---|
| **Labs inbox** | In-process array in `src/lib/account/notify-security.ts`. `GET/POST /api/account/security-notices`. No Postgres. `/labs` is **404** on www and eqmg. | N/A | **No** — cannot hold users, farms, or Suites |
| **Demo mode** | App when `NEXT_PUBLIC_SUPABASE_URL` or anon key is missing (`isSupabaseConfigured` in `src/lib/supabase/client.ts`). Demo emails `*@storyhome.demo`. Login copy: “Demo mode — pick an account type.” | No backend | **UI only.** No RLS, no account Suites, no CAD writes |
| **Dev login buttons** | `LoginClient.tsx` — `NEXT_PUBLIC_ENABLE_DEV_LOGIN` + hardcoded Gmail test users. **Forbidden on eqmg** (constitution / prelaunch docs). | If pointed at live Supabase, **yes — production** | **Unsafe** on live |
| **plain `storyhome-1`** | Standing rule: ignore red Vercel. `https://storyhome-1.vercel.app` → **DEPLOYMENT_NOT_FOUND** (2026-09-16) | Unknown / dead | **Not a test lab** |
| **www / eqmg** | Production | Yes | **No writes for this program** |

**Recommendation:** Do **not** buy a new vendor before we reuse the **app** (same repo, preview deploy) against a **second Supabase project** (or local Supabase once Docker exists). That is the missing piece — not a second product. Cost: one extra Supabase project (often free tier) + one Vercel preview env (`NEXT_PUBLIC_SUPABASE_*` + service role **only** on that project). CAD: **read-only** copy or shared public `county_parcels` **without** ingest credentials on the preview. Never point preview service role at `ksvllgzsnzyahqsjuove`.

If Kirk already has a unused Supabase project, Wave 2 uses that. If not, create one — do not use Labs-as-inbox or demo-mode as the isolation proof.

What staging can prove: RLS, Suites A→B, Analyze race, office vs agent rows, cleanup.  
What still needs scoped production verification after ship: unauth gates (already 401/307), CAD last-known-good (already live), one founder Suites save on www, one founder Analyze/Save on www. Not a second 1,000-user run on production.

---

### Wave 1 — Stop the false MLS write

**Objective / benefit:** A listing’s Sold status is only what a person chose, or a future real MLS (not in scope).

**Issues:** `scanMls` in `src/components/broker/MyListingsView.tsx` calls `updateListingStatus` → `src/lib/supabase/listings.ts` updates `listings.status` + `updated_at`. Downstream: `isLiveStatus` / `SOLD_LIKE_STATUSES` in `src/lib/pro-listings.ts`; Marketplace sold filter; seller portal sold-like; red Sold badge.

**Prerequisites:** None.

**Affected:** `MyListingsView.tsx` only for removal. Do **not** change `updateListingStatus` or card `onStatus` (legitimate manual change).

**Frontend:** Remove the button and `scanMls`. Keep per-listing status control.

**Backend / data:** None.

**Security:** Manual status still RLS (`agent_id` or `is_broker_of`).

**Tests / evidence:** Isolated source-read: no “Scan MLS for sold”; `onStatus` still present. No production listing writes in the test.

**Done when:** Button gone on eqmg preview; a Pro can still set Sold on one listing on purpose.

**Deploy:** App-only. No SQL.

**Rollback:** Restore the button from git. Does not undelete history.

**Historical Sold review:** `listing_analytics_events` records view/save, **not** status. No `changed_by_scan` flag. **Do not mass-revert Sold.** After ship, optional review: listings whose status is Sold and `updated_at` clusters with a session that used the button — founder eyeball only. If unsure, leave Sold.

**Effort:** Very small (hours). **Independent.**

**Urgent containment (not done in planning):** same as this wave. Ship first.

---

### Wave 2 — Safe test environment + isolation harness

**Objective / benefit:** We can prove “your stuff is yours” without touching live customers.

**Issues:** No Docker/Postgres in the Cloud agent; live service key in that agent is not a usable PostgREST JWT; two-user RLS never executed.

**Prerequisites:** A second Supabase project **or** local `supabase start`. Preview env vars. Test mailbox (Supabase Inbucket locally, or plus-address on a mailbox Kirk controls — not real clients).

**Synthetic matrix (provision with service role; **test as user JWTs**):**

| Actor | Purpose |
|---|---|
| Homeowner A, Homeowner B | My Home + Suites isolation |
| Individual Pro A, Pro B | Farms / Vault / Prospects / listings |
| Office M of brokerage M (keeps Pro) | Both workspaces; listing edit for M; **no** Pro A farms if A is not M |
| Pro C in brokerage M | Same-brokerage: cannot read A’s farms; office may edit C’s **listing** if `brokerage_id` is M |
| Office N + Pro D in brokerage N | Cross-brokerage deny |
| Other-professional E | Archie 403 |
| Unconfirmed / AAL1 Pro | Ready-gate 403; settings rules |

Distinguishable names (`WAVE2-A-farm-polk`, unique JPEG bytes). Manifest of IDs. Cleanup **only** those IDs.

**CAD for map tests:** Use **read-only** production public CAD **or** a tiny fixture county. Do not run `cad-refresh.yml` against staging with production service role. Prefer a 50-parcel fixture for Analyze tests (reproducible). Optional: staging anon may read live `county_parcels` if that project is a replica — only if it cannot write.

**Jobs:** Disable GitHub CAD schedule on the staging project. No billing webhook.

**Tests (authorized success AND deny):**

- Pro A GET `/api/shi/farms` sees A; GET B’s farm id → empty/403/404, not B’s body.
- Same for vault frames, prospects, `home-docs` signed URL.
- Office M GET `/api/shi/farms` works (R1) and does not list Pro A’s farms (R2).
- Office M can update a listing with `brokerage_id = M` and cannot update brokerage N.
- Consumer A cannot call SHI (403).
- After logout, `/api/shi/farms` 401; browser must not keep the other user’s farm JSON in a shared cache key.

**Done when:** Written report with two JWTs, request/response (no customer PII), cleanup log.

**Deploy:** Staging only. No production migration.

**Rollback:** Delete staging project or wipe **test schema only**.

**Effort:** Medium (2–5 focused days), assuming a spare Supabase exists. Longer if local Docker must be added to the Cloud environment.

**Gate for Waves 3–4 evidence:** harness green.

---

### Wave 3 — Analyze and Save match the current drawing

**Lifecycle (current, verified in code)**

1. County: `source` in `PropertyIntelligenceView` / overlays.
2. Draw: Box / Freehand / Radius in `ShiResearchMap.tsx`. Radius: 0.25–10 miles (Research default 1); **click center**; then `setTool("pan")`.
3. Analyze: `runAreaAnalyze` → `POST /api/shi/area` → `analyzeArea` (`src/lib/shi/area.ts`): county required; bbox scan; centroid in polygon/radius; cap 1500.
4. Display: `setAnalysis(result)` **without** a generation token (defect).
5. Save Farm: client requires `active.analysis`; `POST /api/shi/farms` → `createFarm` **recomputes** `analyzeArea` from submitted `boundary` + `countySource`. Photo optional (`shi-studies/{agent}/farms/{id}.jpg`).
6. Save Vault: `POST /api/shi/studies/frames` → `saveMarketFrame` **recomputes** the same way. Snapshot is the freeze. Photo `{owner}/{frameId}.jpg`.

**Inputs that define the result:** `countySource`, `DrawnBoundary` (type + geometry/radius), CAD rows present at request time, cap flag. Not client totals.

**Frontend**

- `analyzeGen` (or request id) increments when county, active frame, boundary, or radius changes, and on navigate-away.
- Each in-flight Analyze carries that id. `setAnalysis` only if ids match.
- `AbortController` on `shiFetch` — nice to have. **Not sufficient.** Late HTTP must still be dropped by id.
- Save Farm / Save Vault disabled unless `analysis.requestId === currentId` and the analysis’s county + boundary hash match the active frame.
- While pending or stale: show “Analyzing…” or “Draw or Analyze this frame” — never another frame’s numbers.
- Save while snap pending: keep PR 193 (row without photo). Save while Analyze pending: **blocked**.

**Backend (required — client cancel is not enough)**

- `POST /api/shi/area` already ignores client metrics. Return `{ analysis, context: { countySource, boundaryFingerprint } }`.
- `createFarm` / `saveMarketFrame`: already recompute. **Add:** reject if the client’s claimed `countySource` / boundary fingerprint does not match the body used to recompute (tamper / confused client).
- Do **not** replace an existing Vault snapshot’s metrics with a later Analyze unless the user saves again on purpose. Reopen stays frozen (`shi_frame_snapshots`).
- Retries: same name may create a **second farm** today. Leave that unless a later product decision wants unique names. Vault update-by-frame-id stays upsert on `frame_id`.

**Required scenarios**

| Scenario | Expected | Evidence |
|---|---|---|
| Analyze A, switch to B, A returns last | B shows empty/pending, not A’s totals. B’s `analysis` field unchanged | Isolated unit on apply helper + Wave 2 delayed mock |
| Redraw / radius change | New gen; old result discarded | Same |
| Switch county during Analyze | Old result discarded; Save off | Same |
| Navigate away and back | No paint of old result onto a new frame | Browser test on staging |
| Save while Analyze incomplete | Save disabled; no farm/vault row | Staging |
| Save while snap fails | Row exists; Photo pending (PR 193) | Existing `test-vault-snap-save` + staging |
| Error after newer success | Newer result stays | Staging |
| Retry save after dropped response | One farm if we add idempotency key later; **until then** retry may duplicate farm (document in UI). Vault retry same `frameId` upserts | Staging count |

**Security:** `requireStoryPro` unchanged. Office still allowed (R1). `agent_id` from session, not body.

**Affected:** `PropertyIntelligenceView.tsx`, `src/lib/shi/client.ts`, `area` route, `farms.ts`, `studies.ts`. Not CAD tables.

**Deploy:** App first (display token) can ship before server fingerprint reject. Prefer **same PR** for display + save reject so they cannot drift.

**Rollback:** Revert app. Existing farms/vault rows stay. No delete.

**Effort:** Small–medium (1–2 days) once Wave 2 mocks exist.

---

### Wave 4 — Suites on the account

**Intended user:** Signed-in consumer (and any signed-in user who curates homes). Album of Marketplace listings — not a Farm, not My Home documents.

**Current entry:** `/saved`, `/saved/[suiteId]`, `SaveToSuiteModal` from listing cards. All via `SuitesContext` → `localStorage`.

**Authoritative today:** browser. **Intended:** Postgres owned by `auth.uid()`.

#### Reuse vs change

| Existing | Reuse? |
|---|---|
| `public.suites` (`0001`: `id`, `user_id`, `name`, `cover_url`, `created_at`) | **Yes** as the album header. **Needs** `description`, `cover_tone` (UI uses CSS tones, not `cover_url`), `updated_at`. Optional `cover_url` later. |
| `public.suite_items` (`suite_id`, `listing_id`, `note`, unique pair) | **Yes.** Add `sort_order` (album order). `ON DELETE CASCADE` from listing already drops a home that is deleted — keep; UI shows a missing card. |
| RLS `suites_all_own` / `suite_items_all_own` (`0002`) | **Yes** if applied. Verify on Wave 2. `FOR ALL` is coarse — Wave 4 should split SELECT/INSERT/UPDATE/DELETE so we can test each. |
| Client `StorySuite` | Keep fields; persist `id` as uuid after first server save. |
| `from("suites")` in `src/` | **None today** — add a small client or `/api/suites` that uses the **user** session, not service role. |

**Simplest sync (recommended):** on login / focus / Suites mount → `GET` list; every create/rename/add/remove → server then update UI from the response. **Last `updated_at` wins** if two devices edit. No Websocket, no CRDT. Limitation: device B may be up to one focus-interval stale (refresh on visibility + after mutation). That meets “sign in on another device and retrieve.”

#### Frontend

- Same library, album cards, player, modal. No bookmark-bar redesign.
- States: **Loading** (first fetch); **Empty account** (zero server rows — not “error”); **Failed** (retry); **Deleted** (row gone, not a blank album).
- Optimistic UI optional; **Saved** only after `201/200`. Pending = dim + “Saving…”.
- Auth expired: 401 → login with `next=/saved`; do not write local as if it were the account.
- Offline: queue **one** retry; if it fails, keep a **local draft lane** clearly labeled “Not on your account yet” — never merge that lane into another login automatically (see import).
- Device B: fetch on load. After edit on A, B sees it on next load/focus. No live push.
- Share: keep `/saved/[id]`. Owner sees full album. Others see public listing cards if we keep the current share URL; **do not** expose another user’s notes via API.

#### Backend / data (describe, no SQL in the implementation sense — planning)

- Ownership: `user_id = auth.uid()` on insert. Updates cannot change `user_id`.
- Items: `listing_id` must exist; unique (`suite_id`, `listing_id`); order integer.
- Indexes: (`user_id`, `updated_at desc`); items by `suite_id`.
- Caps: reuse a modest cap (e.g. 50 albums, 80 homes each) in the API, similar to SHI caps.
- Duplicate save: unique item pair → treat as success (idempotent add).
- Concurrent delete: 404 on item → UI removes card; not an error storm.
- Listing Sold/removed: item may vanish (cascade) or remain with a “No longer listed” placeholder if we switch listing FK to `ON DELETE SET NULL` — **prefer SET NULL + listing_id nullable** so albums do not silently shrink. That is a Wave 4 schema choice; default in `0001` is CASCADE. Plan: **change to SET NULL** so the album slot remains and the player can say the home left the market. Manual Sold (Wave 1) then shows in-suite as off-market, not deleted.

#### Import of existing local albums (do not auto-assign)

A browser may hold albums from a guest, a previous family member, or demo leftovers (`suite-lake` already dropped).

1. After **confirmed** login, if `localStorage` has non-empty non-demo suites, show **“Add albums from this browser?”** with names + listing counts. Default **Don’t add**.
2. User picks albums. Server creates **new** uuids (never reuse `suite-xxx` as another user’s id).
3. Skip listings that are not visible to this user (missing id).
4. Dedup: same name + same listing-id set as an existing account album → skip or “already on account.”
5. Interrupted import: progress list; retry is idempotent (unique items).
6. Only **clear local keys for imported albums** after server confirms. Unimported stay local, still not attached to the next login until that person confirms.
7. Never overwrite a newer server `updated_at` with older local.

#### Security

- Middleware: `/saved` can stay public shell; **API** requires signed-in + `canAccessPrivateApp` (email; MFA if this account type requires it). Same as My Home intent.
- RLS owner-only. No `is_broker_of` on suites.
- Privilege fields unchanged. Client cannot set `user_id` to someone else (trigger or `with check`).
- Cache keys include `user_id`. Logout clears Suites React state.
- Signed listing photos stay whatever Marketplace already uses (public listing URLs).

#### Acceptance

Device A save → Device B same account sees it. Account C cannot GET/PATCH A’s suite id. Import requires a click. Empty account ≠ failed fetch.

**Effort:** Medium (3–6 days) plus Wave 2.

**Deploy:** Additive columns first → RLS verified on staging → app cutover → import prompt. Old app tabs keep writing localStorage until refresh; after cutover, local is import-only.

**Rollback:** App back to localStorage reader; **do not delete** server suites. Dual-read: if API fails, do not clobber server by uploading local blindly.

---

### Wave 5 — County refresh reliability

**Diagnosis (live `/api/cad/status` 2026-09-16 + code; Action **logs not downloadable** from this agent)**

| County | Evidence | Mechanism |
|---|---|---|
| Liberty, Angelina, San Jacinto | `last_error` statement timeout; `last_success_at` older; parcel counts still present | Ingest/upsert ran long; `ingest-cad.mjs` does **not** promote `last_success_at` when not proven |
| Polk | last success = last attempt 2026-09-13; then aged past 72h | Daily job skips fresh; job started while still &lt;72h |
| Trinity, Tyler, Walker | Inside window, no error | Healthy |
| Montgomery | 0 parcels, no `last_attempt` | `optional: true`, **not** in `LAUNCH_COUNTY_KEYS` (`scripts/cad-sources.mjs`). Daily refresh never starts it. **Keep.** |

Refresh is **sequential** (`refresh-cad.mjs`) — good (no overlap between counties in one process). Workflow `timeout-minutes: 180`. One failed county fails the job (`exit 1`) after others may have run.

**Do not** only raise the statement timeout. That can leave a half-written upsert cooking until the Action kills the lot.

**Plan:**

1. **Bounded pages** of ArcGIS + **chunked upserts** (already pageSize on sources; ensure upsert commits per chunk).
2. **Checkpoint** last successful `prop_id` page in status (new field, additive) so retry resumes; incomplete ≠ absence pass.
3. **Per-county schedule:** continue others if one fails; job can be “partial success.”
4. **One run lock** (GitHub concurrency group already possible; add if missing) so a manual `--force` cannot overlap the cron.
5. Completeness: existing under-fetch (≥85% of last verified) stays; no absence on fail (`88f5306`).
6. Keep `last_attempt_at` vs `last_success_at` (already separate).
7. UI already has stale / source_failed via `observation-readiness.ts` — keep copy honest.
8. Indexes: only if `EXPLAIN` on staging ingest shows a sequential scan on `county_parcels` during upsert — measure first.
9. Montgomery: still `--force` / `--include-optional` only.

**Effort:** Medium ops (2–4 days). **Independent** of Suites.

**Rollback:** revert ingest script; parcels stay.

---

### Wave 6 — Capacity (isolated only)

**After** Waves 2–4 correctness.

**Not:** creating 1,000 accounts and marking them online.

**Mix** (from `docs/PRELAUNCH-LOAD-TEST.md`, scaled down): 40% marketplace+tiles z≥13, 25% listing, 15% auth refresh, 10% SHI search, 8% analyze, 2% writes (prospect/farm/suite).

**Stages:** 20 functional → 100 → 1,000 simulated **active** users. Pace think-time 3–10s. Duration 10–15 min per stage. Warm then cold tile cache.

**Stop:** error rate &gt; 1%, HTML p95 &gt; 3s, tile p95 &gt; 800ms, DB connections saturating, or cost ceiling (set before run).

**Measure:** latency p50/p95, 429s, analyze dupes, Suites save success, tile hit ratio, estimated $ per 1k user-minutes.

**Claims allowed:** “This isolated stack held N concurrent scripted users.”  
**Not allowed:** 10M monthly visitors or 100k paying users as proven.

**Effort:** 1–3 days once Wave 2 exists.

---

## Access matrix (affected resources)

Legend: ✓ allow · ✗ deny · ◐ scoped · **NV** = policy in repo, not proven on a live/staging JWT

| Resource | Anon | Homeowner | Ind. Pro | Office (same brokerage) | Other brokerage | Other pro | Service role |
|---|---|---|---|---|---|---|---|
| CAD `county_parcels` | ✓ read | ✓ | ✓ | ✓ | ✓ | ✓ | ingest write |
| Listings read | ✓ public | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Listings write | ✗ | ✗ | own `agent_id` | own **or** `is_broker_of` | ✗ | ✗ | bypass |
| Suites / items (intended) | ✗ | own | own | own albums only | ✗ | own | bypass |
| `shi_farms` / vault / prospects | ✗ | ✗ | own | **own rows only** (R1+R2) | ✗ | ✗ | bypass |
| `homes` / `home-docs` | ✗ | owner | owner / grantee | owner | ✗ | owner | bypass |
| `/api/shi/*` | 401 | 403 | ✓ if ready | ✓ if ready | ✓ if their own ready login | 403 | not for CRUD |
| Privilege columns | — | lock | lock | lock | lock | lock | write |
| CAD ingest | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | Action only |

**Enforcement layers:** middleware (session + email on portal/office/settings) · `requireStoryPro` / `canAccessPrivateApp` · RLS · storage folder = `auth.uid()` · privilege trigger (`0053` in repo).

**Privileged bypasses:** CAD ingest; `promoteSignedInPro`; seller RPC; account delete; clerk deeds read (dark); listing-activity insert. None of these should write Suites.

**MFA:** current session AAL2 required for Pro/office settings and SHI readiness — test in Wave 2 with an AAL1 token.

**File links:** Vault signed URLs prefix-check owner. Plan: short TTL; logout does not revoke an already-issued URL until expiry — document that lifetime.

**Repo vs deployed:** treat 0001–0053 as **intended**. Wave 2 first query is “which versions are applied on staging/prod.”

---

## E. Coverage and evidence matrix

| Workflow | Intended | Have now | Missing | Wave test | Pass |
|---|---|---|---|---|---|
| Office + Archie | R1 | Code + unit `test-office-keep-story-pro` | Live/staging JWT | W2 | Office SHI 200; dest `/office` |
| Office ≠ other farms | R2 | SQL owner-only | Two JWT | W2 | Body not leaked |
| MLS scan | No fake Sold | Persist traced | — | W1 | Button gone; manual Sold works |
| Analyze late | No stale paint/save | Race in `runAreaAnalyze` | Staging delay | W3 | A-after-B does not display A |
| Farm/Vault save | Server geometry+county | Server recomputes | Context reject + UI disable | W3 | Save off until match |
| Suites A→B | Account | localStorage | Server + import | W4 | B sees A’s album; C 401/empty |
| Suites import | Confirm, no auto | — | — | W4 | Default don’t import |
| My Home isolation | Owner | SQL | Two JWT | W2 | B cannot read A’s file |
| CAD fail | Last-good | Live counts held | Action logs; chunked ingest | W5 | Timeout does not drop `last_success` or mark absence |
| Nav first tap | One tap | Contracts + 2026-09-15 phone | New miss only | out of scope unless regresses | — |
| Capacity | Measured N | Single public GETs | Isolated 100/1000 | W6 | Stop rules honored |
| Billing / Messages | Not this program | Paused / 503 | — | — | Stay unavailable |

---

## F. Release and rollback

- **Wave 1:** app-only. Old tabs can still press Scan until refresh. After merge, no new fake writes. Rollback = revert commit.
- **Wave 3:** display token + server fingerprint in one PR. Old tabs may still stale-paint until refresh; server still recomputes the submitted boundary. Rollback keeps farms.
- **Wave 4:** add columns (nullable) → deploy API that writes new columns → deploy UI. Old UI ignores new columns. Rollback UI; **keep** server albums. Import prompt is additive.
- **Policies before paths:** Wave 4 RLS verified on staging before www points at the new API.
- **Required check:** keep GitHub job name `verify`. Add Wave 2/3/4 scripts **into** `test:project-memory` / `test:phase-3` only when they stay isolated or hit **staging** secrets, never live write keys.
- **Detect regression:** unauth SHI 401 probe; office purpose unit; Suites empty-vs-error; Analyze unit; CAD status last_success not wiped.

Do not roll back by deleting customer Suites or farms.

---

## G. Remaining decisions and blockers

| Item | Missing | Smallest unblock | Can proceed anyway |
|---|---|---|---|
| Prod migration list | `schema_migrations` | One SQL list of versions (no customer rows) | Waves 1 and 3 display work |
| Spare Supabase / Docker | Isolated project | Create or point preview env | Wave 1 |
| Action CAD logs | `gh` log download empty | Open [run 35087176543](https://github.com/kirkrneal-visionary/STORYHOME1/actions/runs/35087176543) | Wave 5 design still valid from `/api/cad/status` |
| Suites share privacy | Public `/saved/id` vs owner-only | Default: public listing cards, private notes | Wave 4 data model |
| Farm duplicate names | Product | Leave allowed | Wave 3 |
| `/home` middleware | Email on My Home | Leave RLS-only unless you want `/home` gated | Waves 1–4 |
| “Open radius” extra gesture | Not in repo | Click-center + pan is the plan | Wave 3 |

---

## H. Pre-launch recommendation

**Must complete before calling this launch “the intended product”:**

- Wave 1 merged (no fake MLS Sold).
- Wave 3 merged (screen and Save follow the current drawing).
- Wave 4 merged **if Suites is in the launch story** (it is, per R3).
- Wave 2 harness green for isolation + office keeps Pro + Suites C cannot read A.

**May stay unavailable / labeled:**

- Messages, Following, Referrals, billing, Montgomery daily ingest, live deeds.
- “Current tax roll” for Liberty / Angelina / San Jacinto until Wave 5 or honest stale badges (already in observation readiness).

**Evidence to clear each blocker:**

| Blocker | Evidence |
|---|---|
| Fake MLS | Code + preview: button gone; manual status still updates one listing |
| Stale Analyze | Wave 2 delayed A-after-B + Save disabled |
| Suites not on account | A save, B login, album present; C denied |
| Isolation | Two JWT report |
| Office Pro | Office session SHI 200 and farm list ≠ other agents |

**Out of this program:** Phase 4, AI orchestrator, people-copy, production reset, paid new region.

---

## Environment snapshot (this plan)

| | |
|---|---|
| Examined commit | `ecd47c8` `origin/main` |
| Public live | www.storyhome.app = eqmg CAD payload |
| Prior investigation | `/opt/cursor/artifacts/correction_plan_2026-09-16.md` (agent artifacts; this file supersedes the “device-only Suites” completion idea) |
| Chat exports | Not available. Used this order, memory, constitution, PR 185, git |
