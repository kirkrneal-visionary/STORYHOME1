# ACCOUNTS evidence pack — Story Home

**Purpose:** Independent review of how Story Home creates accounts, checks licenses, assigns roles, and keeps private data behind the interface.

**Review date:** 2026-09-14  
**Reviewed code:** `origin/main` commit `801061e9068155dd0af0fc3b9b377376984aba55` (merge of PR #176, portal server gate). Workspace HEAD at review time was `c775e38` (same portal-gate content).  
**Live app observed:** https://storyhome-1-eqmg.vercel.app  
**Live database project (from repo docs / env URL shape):** `ksvllgzsnzyahqsjuove.supabase.co`  
**This pack does not include:** `.env` files, passwords, keys, tokens, customer rows, or `node_modules`.

**How to read this document**

| Label | Meaning |
|---|---|
| **IN REPO** | Source or a migration file exists. That is not proof the live project is running that version. |
| **PROVEN LIVE** | Observed on the live app this review, with a read-only request. No login, no writes, no attack tests. |
| **UNKNOWN** | Needs the Supabase dashboard, a SQL catalog read, or a signed-in test account. Not available in this review. |

Repo docs (`docs/PRELAUNCH-FOUNDER-REPORT.md`) still say some SQL is “not live until pasted.” A prior operator session claimed `0043`–`0047` were pasted on live. **This review did not re-read live Postgres catalogs**, so those claims are **UNKNOWN** here.

No application code, settings, permissions, or production data were changed to produce this pack.

---

## 1. Answers to the four investigation questions

### 1. Does changing a name, license, or account type after verification keep the approval?

**Name — IN REPO: yes, approval is kept.**  
`updateMyProfile` in `src/lib/supabase/profile.ts` can write `full_name`. The lock trigger in `supabase/migrations/0039_prelaunch_security.sql` does **not** lock `full_name`. After a person is already `agent` or `broker`, `promoteSignedInPro` in `src/lib/account/promote-pro.ts` returns immediately and does **not** re-check TREC. There is no job in the repo that demotes a license that later expires or is revoked.

**License number — IN REPO: client UI cannot change `trec_license`; approval is kept.**  
`0039` blocks client updates to `trec_license` and `trec_status`. The settings form does not send those fields. `license_number` and `trec_verified_at` are **not** in that lock list. A direct PostgREST update of `license_number` by the signed-in owner is not blocked by `0039`. That path was **not** tested live (no mutation tests).

**Account type — IN REPO: client cannot change `account_kind` if `0039` is applied.**  
The same trigger raises if a non–`service_role` write changes `account_kind`. The only promote path in app code is `promoteSignedInPro` (service role). There is no demote path in app code.

**PROVEN LIVE:** none of the after-verify change cases. That would need a real verified account and a write. Not done.

**UNKNOWN:** whether `0039` is actually installed on live Postgres.

### 2. Can an unverified email activate an account?

**IN REPO: the app does not require a confirmed email.**  
Search of `src/` and migrations found **no** `email_confirmed_at` check. Sign-in is `supabase.auth.signInWithPassword` in `src/components/AuthContext.tsx`. The client hydrates from `getSession()`, not `getUser()`. `LoginClient.tsx` only *mentions* confirmation “if email confirmation is enabled.”

Signup uses `supabase.auth.signUp`. Whether that returns a session before confirm is a **Supabase Auth project setting**, not an app setting.

**PROVEN LIVE:** none. Confirm-email toggle, SMTP, and “unconfirmed user gets a session” were not read from the dashboard.

**UNKNOWN:** live Auth “Confirm email” on/off; whether an unconfirmed user can use `/portal` or APIs.

### 3. Can a managing-broker session use individual Agent / Broker functions?

There is **no separate “managing broker” account kind**. Closest ideas in code:

- `profiles.account_kind = 'broker'`
- `brokerages.broker_id` plus `is_broker_of()` in `supabase/migrations/0001_init.sql`
- `team_leader_authorized` via `set_team_leader_authorized` in `supabase/migrations/0010_community_backend.sql`

**IN REPO: a broker session is allowed on the same Story Pro functions as an agent.**

| Surface | Agent (`account_kind=agent`) | Broker (`account_kind=broker`) |
|---|---|---|
| `/portal` after `portalPageAccess` | allow | allow |
| `/api/shi/*` via `requireStoryPro` | allow | allow |
| Own CRM (`buyers`, `seller_clients`, `crm_*`) | own rows only (`agent_id = auth.uid()`) | own rows only — **not** the other agent’s CRM |
| Listings | own, plus brokerage read/write where `is_broker_of` | own + brokerage listings |
| Roster / team-leader flag | no | yes, if `is_broker_of` |

So a broker is **not locked out** of Agent/Broker Story Pro tools. They get the same Archie APIs. They do **not** automatically read another agent’s buyers/sellers CRM. They **do** get brokerage listing oversight and roster RPCs.

`verifyTrecLicense` returns `designatedSupervisor`. Nothing in authorize code uses that flag.

**PROVEN LIVE:** none for signed-in broker vs agent (no test accounts used).

### 4. Do direct API, database-function, or storage requests bypass the screens?

**HTTP Story Pro APIs — IN REPO and partly PROVEN LIVE: the UI is not the only gate.**  
`requireStoryPro` (`src/lib/shi/require-pro.ts`) checks a real session (`getUser`) and `profiles.account_kind` in `{agent, broker}`. Unsigned live check this review:

- `GET https://storyhome-1-eqmg.vercel.app/api/shi/search` → **401** `{"error":"Sign in required"}`
- `POST https://storyhome-1-eqmg.vercel.app/api/account/promote-pro` → **401** `{"ok":false,"error":"Sign in required."}`
- `GET https://storyhome-1-eqmg.vercel.app/portal` → **307** `location: /login?next=%2Fportal`

A signed-in **consumer** hitting `/api/shi/*` was **not** tested live (would need a real session). In repo, that path is **403**.

**Database functions (PostgREST) — IN REPO: some grants are wider than the Story Pro screens.**  
`0002_rls.sql` grants `execute` on all public functions to `anon` and `authenticated`. Later files grant specific corridor/parcel functions to **any logged-in user**, not only Pro:

- `corridor_parcel_frontage` — `0034_corridor_road_segments.sql`
- `corridor_parcel_intersection_distance` — `0037_corridor_intersection_distance.sql`
- `parcel_neighbors` — `0038_parcel_neighbors.sql`
- `parcels_mvt` — `anon` + `authenticated` (`0022_shi_parcels_mvt_source.sql`)

Those RPCs are **not** wrapped by `requireStoryPro`. A logged-in consumer who calls PostgREST directly can, **if those grants are live**, run corridor/parcel functions the Archie UI would hide.

`seller_portal_by_code` is revoked from browser roles in `0042_seller_portal_rpc_lock.sql` (service_role only). App path is `POST /api/seller/access`.

**Profiles email — IN REPO: public read policy can return email even if the public page does not show it.**  
`profiles_read` in `0002_rls.sql` is `using (true)` for `anon` and `authenticated`. Public agent page `src/app/agents/[id]/page.tsx` does **not** select `email`. A client that asks for `email` is not stopped by RLS. **Not proven live** (no profile rows queried).

**Storage — IN REPO only.**  
- `home-docs`: private; owner folder = `auth.uid()` (`0004_storage.sql`)  
- `shi-studies`: private owner folder (`0023_shi_market_frames.sql`)  
- `living-marks`: **public bucket** + public read (`0032_living_marks.sql`)

**UNKNOWN:** live RLS/policy catalog, live storage policies, live RPC grants. A consumer JWT was not used against PostgREST.

---

## 2. Area-by-area findings

### Signup

| Item | Path / symbol | Status |
|---|---|---|
| Client always sends metadata `account_kind: "consumer"` | `AuthContext.signUp` in `src/components/AuthContext.tsx` | IN REPO |
| Client still accepts `opts.accountKind` but **ignores** it | same | IN REPO |
| License UI check before realtor signup | `LoginClient` → `GET /api/verify-trec` | IN REPO |
| Trigger always inserts consumer | `handle_new_user` in `0047_signup_account_kind_lock.sql` | IN REPO |
| Older trigger **trusted** metadata `account_kind` / `trec_status` | `0007_profiles_brokerage.sql` | IN REPO (superseded **if** 0047 applied) |
| Trigger on `auth.users` | `on_auth_user_created` in `0001_init.sql` | IN REPO |

**Tests:** `npm run test:signup-account-lock` → **ok** this review (source assertions only; does not hit live Auth).

### Email confirmation

No app enforcement. See question 2. **UNKNOWN** on live Auth settings. No `supabase/config.toml` in this repo.

### License / identity (TREC)

| Item | Path / symbol | Status |
|---|---|---|
| Public Texas dataset lookup | `verifyTrecLicense` in `src/lib/trec.ts` | IN REPO |
| HTTP wrapper (no auth) | `src/app/api/verify-trec/route.ts` | IN REPO |
| Server promote | `promoteSignedInPro` in `src/lib/account/promote-pro.ts`; `POST /api/account/promote-pro` | IN REPO |
| Promote uses last word of `full_name` as last name | `promote-pro.ts` | IN REPO |
| Already Pro → no re-verify | early return when `account_kind` is agent/broker | IN REPO |
| Public TREC lookup is unauthenticated | anyone who can hit `/api/verify-trec` | IN REPO; not abused in this review |

Rate class for `/api/verify-trec` is **medium** in `src/lib/security/rate-limit.ts` (in-memory per isolate, not a shared store).

### Role assignment

Roles are `consumer` | `agent` | `broker` on `profiles.account_kind`.  
`professional_role` (inspector, appraiser, lender, realtor_broker) is **display / signup metadata**. It does not pass `requireStoryPro` or `portalPageAccess`.

UI role mapping: `kindFromAccount` in `AuthContext.tsx` (agent → `"pro"`, broker → `"broker"`).

Demo `loginAs` / localStorage roles exist for when Supabase is missing. Production login hides those when `NODE_ENV === "production"` and Supabase is configured (`LoginClient.tsx`).

### Managing-broker authority / brokerage membership

| Item | Path / symbol | Status |
|---|---|---|
| Broker of record helper | `is_broker_of` in `0001_init.sql` | IN REPO |
| Invite + accept + remove | `0008_broker_roster.sql` (`accept_brokerage_invite`, `remove_agent_from_brokerage`) | IN REPO |
| Team leader flag | `set_team_leader_authorized` in `0010_community_backend.sql` | IN REPO |
| Settings roster UI | `src/components/settings/SettingsView.tsx` | IN REPO |
| Public brokerage page | `src/app/b/[slug]/` via `BrokeragePublicView.tsx` | IN REPO |

**Gap (IN REPO):** `profiles_update_own` allows a user to update **their own** row, including `brokerage_id`, unless another trigger blocks it. `0039` does **not** lock `brokerage_id`. Roster comments say join/remove should go through SECURITY DEFINER RPCs so you cannot edit **another** profile. Self-assign of `brokerage_id` is **not** proven blocked. **Not tested live.**

### Two-factor authentication

**None in repo.** Search for MFA / TOTP / AAL / two-factor across the tree: no matches. `package.json` has no MFA library. **UNKNOWN** whether Supabase Auth MFA is enabled in the dashboard (no evidence it is used by the app).

### Password recovery

**No forgot-password UI or `resetPasswordForEmail` in `src/`.** Recovery, if any, is raw Supabase Auth hosted flow. Turnstile is **docs-only** (`docs/PRELAUNCH-FOUNDER-REPORT.md` section E), not implemented. **UNKNOWN** live Auth recovery settings.

### Sessions

| Layer | Mechanism | Status |
|---|---|---|
| Cookie session | `@supabase/ssr` in `src/middleware.ts`, `src/lib/supabase/server.ts` | IN REPO |
| Portal logged-out | middleware `getUser()` → `/login?next=…` | IN REPO + **PROVEN LIVE** (307 on `/portal`) |
| Portal not-Pro | `src/app/portal/layout.tsx` + `portalPageAccess` | IN REPO |
| Server APIs | `getUser()` | IN REPO + unsigned **PROVEN LIVE** 401s |
| Client chrome | `getSession()` + `onAuthStateChange` | IN REPO |
| Logout | `supabase.auth.signOut()` | IN REPO |
| Origin check | POST `/api/*` (billing webhook excepted) | IN REPO |

Middleware does **not** check `account_kind`. That is intentional so a new realtor can be promoted on the portal layout hit.

### Private-data access (summary)

Already covered in question 4. Extra notes:

- County parcels are world-readable by product design (`0006_county_parcels.sql`).
- Listing seller codes: hide + hash migrations `0040`, `0043`–`0046`. App lookup `src/lib/seller/lookup.ts` + `src/app/api/seller/access/route.ts`.
- `/api/analytics` accepts catalog events; rate-limited; optional session.
- Rate limits are in-memory (`src/lib/security/rate-limit.ts`). **UNKNOWN** Vercel WAF LOG state.

---

## 3. Existing test results (this review)

All of these are **source / unit checks**. They do not log into live Auth or write to live Postgres.

| Command | Result (2026-09-14) |
|---|---|
| `npm run test:signup-account-lock` | ok |
| `npm run test:portal-server-gate` | ok |
| `npm run test:prelaunch-security` | ok |
| `npm run test:seller-passcode-hash` | ok |

Raw tails are in the zip under `evidence-logs/`.

`supabase/test/20_assert.sql` covers local RLS for suites, listings, broker oversight, channels. It is **not** a live-prod test and was not re-run here (no local Postgres harness in this review).

There is **no** automated test for: email confirmation, MFA, password recovery, post-verify name change, consumer JWT vs corridor RPCs, or brokerage_id self-assign.

---

## 4. Live observations (read-only, no session)

Target: `https://storyhome-1-eqmg.vercel.app`

| Request | Result |
|---|---|
| `GET /portal` | HTTP 307 → `/login?next=%2Fportal` |
| `GET /api/shi/search` | HTTP 401 `{"error":"Sign in required"}` |
| `POST /api/account/promote-pro` | HTTP 401 `{"ok":false,"error":"Sign in required."}` |

These prove the **unsigned** door. They do **not** prove consumer-vs-Pro, email confirm, or database policies.

---

## 5. Missing production evidence (must come from dashboard / SQL read)

1. Live Postgres: which of `0039`, `0040`, `0042`, `0043`–`0047` are installed (`handle_new_user` body, `profiles_lock_privilege_columns`, RPC grants).  
2. Auth settings: confirm email, password recovery, leaked-password protection, MFA, rate limits, redirect URLs.  
3. Whether an unconfirmed user receives a JWT.  
4. Storage bucket policies as deployed.  
5. Whether `profiles.email` is selectable by `anon` on live.  
6. Vercel WAF / Turnstile (app has neither Turnstile nor a durable rate store).  
7. Historical users created under the old `0007` trigger (founder wipe notes said auth users were 0 on 2026-09-01; **not re-counted** here).  
8. Service-role presence on eqmg (required for promote and seller lookup after `0042`). Not inspected.

---

## 6. Source index (also in the zip)

### App

- `src/components/AuthContext.tsx` — signup metadata lock, session hydrate, promote call  
- `src/components/LoginClient.tsx` — login / signup UI, TREC pre-check, no reset form  
- `src/lib/account/promote-pro.ts` — server TREC promote  
- `src/lib/account/portal-gate.ts` — login / refuse / allow  
- `src/app/portal/layout.tsx` — server Story Pro door  
- `src/app/api/account/promote-pro/route.ts`  
- `src/app/api/verify-trec/route.ts`  
- `src/lib/trec.ts`  
- `src/lib/shi/require-pro.ts`  
- `src/middleware.ts`  
- `src/lib/supabase/server.ts`, `client.ts`, `profile.ts`, `brokerage.ts`, `roster.ts`  
- `src/lib/security/rate-limit.ts`, `origin.ts`  
- `src/app/agents/[id]/page.tsx` — public profile columns (no email)  
- `src/components/settings/SettingsView.tsx`  
- `package.json`, `package-lock.json`  
- `next.config.ts`

### Migrations (accounts-relevant)

- `0001_init.sql` — trigger, `is_broker_of`  
- `0002_rls.sql` — profiles public read, own update, function execute grants  
- `0004_storage.sql` — `home-docs`  
- `0007_profiles_brokerage.sql` — old metadata-trusting `handle_new_user`  
- `0008_broker_roster.sql` — invites  
- `0010_community_backend.sql` — team leader  
- `0011_crm.sql` — own-only CRM  
- `0014_seller_portal.sql` + `0042`–`0046` — seller code surface  
- `0022`, `0034`, `0035`, `0037`, `0038` — parcel/corridor RPC grants  
- `0032_living_marks.sql` — public media bucket  
- `0039_prelaunch_security.sql` — privilege column lock  
- `0047_signup_account_kind_lock.sql` — signup always consumer  

### Tests / prior docs

- `scripts/test-signup-account-lock.ts`  
- `scripts/test-portal-server-gate.ts`  
- `scripts/test-prelaunch-security.ts`  
- `scripts/test-seller-passcode-hash.ts`  
- `docs/PRELAUNCH-FOUNDER-REPORT.md`  
- `docs/PRELAUNCH-SECURITY-AUDIT.md`  

---

## 7. Methods and limits

- Read repository files and ran the four npm scripts above.  
- Three unsigned HTTPS calls to the live eqmg host. No passwords, no account creation, no UPDATE/INSERT/DELETE, no token guessing, no storage listing of customer objects, no dump of `profiles`.  
- Did not open the Supabase SQL editor or Auth settings.  
- Embedded secrets in exported copies were scanned and redacted if present. No `.env` files were copied.

Independent reviewers who have dashboard access should treat section 5 as the first checklist.
