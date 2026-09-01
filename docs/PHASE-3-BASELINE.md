# Phase 3 baseline

Recorded **before** Phase 3 hardening edits on `cursor/phase-3-launch-6cf4`.

Canonical production project: **storyhome-1-eqmg**  
Live: https://storyhome-1-eqmg.vercel.app  
Ignore red Vercel checks on plain `storyhome-1`.

Phase 1 + Phase 2 are already on this branch (created from Phase 2 `ee3927e`).  
**Do not undo Phase 1 or Phase 2.**

## Current commit (branch start)

- Branch: `cursor/phase-3-launch-6cf4`
- Commit: `ee3927e8b0ae1d9aff62c7126731787212b8b802`
- Message: `Fix TypeScript build: optional county FIPS on analytics events.`
- Parent lineage: Phase 2 ← Phase 1 ← prelaunch-security (`c2ad0a6` on `origin/main`)

`origin/main` is still pre-Phase-1. Live eqmg may not yet include Phase 1/2 until those PRs merge.

## Rollback / checkpoint

| Item | Status |
|---|---|
| Git rollback | This commit (`ee3927e`). Revert Phase 3 commits or reset the branch to it. |
| Production deployment | https://storyhome-1-eqmg.vercel.app — do not treat this branch as live until merged + eqmg green |
| Database backup | **NOT verified from this agent.** Founder must snapshot Supabase before any reset. |
| Storage inventory | `home-docs` (private), `shi-studies` (private), `living-marks` (public brand) |
| Migration head in repo | `0040_listings_hide_seller_passcode.sql` (Phase 3 adds `0041`, `0042`) |
| Env inventory | See `.env.example`. No `NEXT_PUBLIC_` service-role. Payment secrets not set. |

Recovery: restore Git to `ee3927e`; restore Supabase from the snapshot taken before reset. Git cannot restore the database.

## Tests run at baseline (this branch, Phase 1/2 armor)

| Script | Result |
|---|---|
| `npm run test:phase-1` | Run during Phase 3 — must still pass |
| `npm run test:phase-2` | Run during Phase 3 — must still pass |
| `scripts/test-prelaunch-security.ts` | Must still pass |

Pre-existing failures (not Phase 3): `test-story-glass-ab.mjs`, `test-story-glass-d.mjs`, `test-story-walk-sw3.mjs`.

## Live CAD snapshot (eqmg `/api/cad/status`, 2026-08-31)

Refresh interval: **72 hours**. Montgomery is optional / not a launch county.

| County | DB count | Last verified | Health |
|---|---|---|---|
| Polk | 57,578 | 2026-08-28 21:34Z | Healthy |
| Angelina | 54,251 | 2026-08-28 21:38Z | Healthy |
| Trinity | 24,593 | 2026-08-28 21:40Z | Healthy |
| Tyler | 23,508 | 2026-08-28 21:41Z | Healthy |
| San Jacinto | 35,158 | 2026-08-28 21:44Z | Healthy |
| Liberty | 114,678 | 2026-08-29 06:19Z | Healthy (recovered vs Phase 2 delay) |
| Walker | 35,607 | 2026-08-30 06:09Z | Healthy |
| Montgomery | 0 | none | Optional / empty |

These parcel counts are **platform truth**. They must be unchanged after any user-data reset.

## Live anonymous probes (eqmg, before this PR deploys)

| Call | Result |
|---|---|
| `GET /` `/marketplace` `/login` | 200 |
| `GET /api/shi/search` | **401** Sign in required |
| `GET /api/shi/prospects` | **401** Sign in required |
| `GET /api/cad/status` | 200 (anon key only) |
| `GET /portal` | 200 HTML (client-gated today; Phase 3 adds session redirect) |

## Already shipped (PR #167, in this tree)

- App rate classes; tiles not 429’d
- Security headers + CSP
- `/api/cad/status` fail-closed (no service-role fallback)
- `requireStoryPro()` session + `account_kind`
- Dev login hidden unless non-production
- Demo seller codes removed from UI
- Map popup HTML escaped
- Migrations 0039 / 0040

## Known open items this phase addresses (without feature build)

1. Seller-code brute force (public RPC)
2. `/portal` page shell without a session
3. `/api/listing-activity` UUID + rate class
4. Payment webhook / entitlement boundary (no provider)
5. Auth error enumeration
6. Attack-surface + reset + incident docs
7. Honest capacity probe (not a 100k claim)

## Phase 1 / 2 must remain

- Continuum, Story Glass, sound, touch, motion
- Following / Messages / Referrals hidden from nav
- Observation health, last-known-good, Farms/Stability gates
- Seller views/saves measured; clicks/repeat/avg-time show `—`
- No new Archie tools, Research modes, counties, or map rewrite
