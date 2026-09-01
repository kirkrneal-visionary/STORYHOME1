# Phase 2 baseline

Recorded **before** Phase 2 data-truth / analytics / seller / consumer edits.

Canonical production project: **storyhome-1-eqmg**  
Live: https://storyhome-1-eqmg.vercel.app  
Ignore red Vercel checks on plain `storyhome-1`.

Phase 1 is already on this branch (`cursor/phase-2-truth-6cf4` created from Phase 1 `393f3b9`).  
**Do not undo Phase 1.** Following / Messages / Referrals stay hidden from nav.

## Current commit

- Branch: `cursor/phase-2-truth-6cf4`
- Commit: `393f3b91d7c3bc4c0cff0906e3ff9a85d6be1578`
- Message: `Make Story Home feel like one finished product.`

Untracked leftover (not part of this phase): `data/shi/tiles/imagery-n60/`

## Tests run (pre-edit / Phase 1 armor)

| Script | Result |
|---|---|
| `npm run test:phase-1` | PASS (run during Phase 2 implementation) |
| `scripts/test-shi-obs-ops.mjs` | Updated for Phase 2 statuses — see completion |
| `scripts/test-shi-ownership-churn.mjs` | PASS (pure-history path unchanged) |
| `scripts/test-story-analytics-foundation.mjs` | Extended for new catalog events |
| `scripts/test-story-walk-sw3.mjs` | FAIL (pre-existing: `SW-3` missing from waves) |

Pre-existing failures from Phase 1 baseline remain: `test-story-glass-ab.mjs`, `test-story-glass-d.mjs`, `test-story-walk-sw3.mjs`. Not Phase 2 regressions.

## Live CAD snapshot (eqmg `/api/cad/status`, 2026-08-27)

Refresh interval: **72 hours**. Montgomery is optional / not a launch county.

| County | Source | Last verified | Last attempt | Last error | DB count | Health |
|---|---|---|---|---|---|---|
| Polk | `polk_cad` ArcGIS | 2026-08-25 08:14Z | same | none | 57,578 | Healthy (~55h) |
| Angelina | `angelina_cad` ArcGIS | 2026-08-25 08:18Z | same | none | 54,251 | Healthy |
| Trinity | `trinity_cad` ArcGIS | 2026-08-25 08:20Z | same | none | 24,593 | Healthy |
| San Jacinto | `san_jacinto_cad` ArcGIS | 2026-08-25 08:23Z | same | none | 35,158 | Healthy |
| Walker | `walker_cad` ArcGIS | 2026-08-26 08:26Z | same | none | 35,601 | Healthy |
| Liberty | `liberty_cad` ArcGIS | 2026-08-22 08:16Z | 2026-08-26 08:21Z | statement timeout | 114,501 | Source degraded / delayed |
| Tyler | `tyler_cad` file zip | 2026-08-22 08:01Z | 2026-08-26 08:09Z | Download 403 | 23,508 | Source degraded / delayed |

## Phase 1 features verified (must remain)

- Marketplace / listing / My Home / Story Pro / Archie / Research / Corridors / Prospects / Farms / Study Vault routes intact
- Story Glass press + sound on user actions
- Failed Prospects/Farms/Vault loads do not look like empty lists
- Following / Messages / Referrals hidden from nav
- Seller portal still says figures are not live marketplace traffic for unmeasured metrics
- `playStorySound` never throws
- Map workspace cache exists (filters / boundary / scroll). Map center/zoom was **not** persisted before Phase 2.

## Known gaps this phase addresses

1. Observation readiness defaulted stale window to **168h** vs DB **72h**.
2. Failed / capped pulls could still set `last_success_at`.
3. Under-fetched full pulls could mark false DISAPPEARED.
4. Change events were not idempotent on replay.
5. Farms “since last review” did not show county health.
6. Ownership Stability could score 820 on a failed/stale county.
7. Product analytics catalog missing core Pro / belonging events.
8. Seller clicks / time / repeat were shown as **0** when unmeasured.
9. My Home empty state did not point to Suites.
10. Marketplace return did not restore map position.
