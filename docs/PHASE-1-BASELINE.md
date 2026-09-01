# Phase 1 baseline

Recorded **before** Phase 1 product-coherence edits.

Canonical production project: **storyhome-1-eqmg**  
Live: https://storyhome-1-eqmg.vercel.app  
Ignore red Vercel checks on plain `storyhome-1`.

## Current commit

- Branch: `cursor/phase-1-coherence-6cf4` (created from `origin/main`)
- Commit: `c2ad0a6bc353155e9a73ff150f1c5bdd18e2560f`
- Message: `Merge pull request #167 from kirkrneal-visionary/cursor/prelaunch-security-6cf4`

Untracked leftover (not part of this phase): `data/shi/tiles/imagery-n60/`

## Tests run (pre-edit)

| Script | Result |
|---|---|
| `scripts/test-story-messages-referrals.mjs` | PASS |
| `scripts/test-story-glass-g.mjs` | PASS |
| `scripts/test-story-glass-ab.mjs` | FAIL (pre-existing) |
| `scripts/test-story-glass-c.mjs` | PASS |
| `scripts/test-story-glass-d.mjs` | FAIL (pre-existing) |
| `scripts/test-story-glass-e.mjs` | PASS |
| `scripts/test-story-glass-f.mjs` | PASS |
| `scripts/test-story-shell-nav.mjs` | PASS |
| `scripts/test-story-shell-header.mjs` | PASS |
| `scripts/test-motion-routes.mjs` | PASS |
| `scripts/test-research-modes.mjs` | PASS |
| `scripts/test-story-walk-sw1.mjs` | PASS |
| `scripts/test-story-walk-sw3.mjs` | FAIL (pre-existing) |
| `scripts/test-shi-discover-act.mjs` | PASS |
| `scripts/test-shi-farms.mjs` | PASS |
| `scripts/test-shi-prospects.mjs` | PASS |
| `scripts/test-corridor-nav-lock.mjs` | PASS |
| `scripts/test-research-workspace.mjs` | PASS |
| `scripts/test-prelaunch-security.ts` | PASS |

## Pre-existing failures (not caused by Phase 1)

1. **`test-story-glass-ab.mjs`** — expects `--story-bottom-nav-h` inside `GlobalNav.tsx`. Token lives in `src/app/globals.css` (`--story-bottom-nav-h`). Armor is stale against the overlay-header + dock shell.
2. **`test-story-glass-d.mjs`** — expects `--story-header-h|--story-safe-top` in `src/app/agents/[id]/page.tsx`. Agent World page no longer repeats that token string. Home / Suites / Following still use the inset tokens.
3. **`test-story-walk-sw3.mjs`** — expects `SW-3` in `src/lib/shi/waves.ts`. Wave table no longer contains that id.

Do not treat these as Phase 1 regressions.

## Major routes checked (implementation audit)

### Public / consumer

| Route | What it is | Notes |
|---|---|---|
| `/` | Entry / home search | Overlay header, no giant chrome |
| `/marketplace` | Marketplace map + list | Client nav; own MapLibre instance |
| `/marketplace/[id]` | Listing | Client nav; separate from marketplace map |
| `/home` | My Home | Consumer room |
| `/saved` | Suites | Real localStorage albums |
| `/following` | Following | **SHELL** — always empty; Follow on cards is local `useState` |
| `/network` | Agents | |
| `/agents/[id]` | Agent World | |
| `/profile` | Profile | Copy still promises messages / referrals |
| `/settings` | Settings | No sound mute (always-on + reduced-motion) |
| `/login` | Auth | Demo copy still mentions Messages |
| `/messages` | Messages | Route exists; **hidden from nav**; honest pause view |
| `/referrals` | Referrals | Route exists; **hidden from nav**; honest pause view |

### Story Pro

| Route | What it is |
|---|---|
| `/portal` | Story Pro desk |
| `/portal/intelligence` | Archie’s Intelligence |
| `/portal/intelligence?section=prospects` | Prospects |
| `/portal/intelligence?section=farms` | Farms |
| `/portal/intelligence?section=vault` | Study Vault |
| `/portal/intelligence?section=corridors` | Soft-redirects into Research Access desk |

### Seller

| Route | What it is |
|---|---|
| `/seller` | Seller entry |
| `/seller/portal/[code]` | Seller portal — UI implies live marketplace analytics that are not captured |

## Known existing issues (pre-Phase 1)

- Following is in consumer header + drawer but does not persist. Follow button is theater.
- Profile / login / Agent World insight copy still mention Messages or Referrals.
- Seller portal headline: “Live Story Home activity for buyers viewing your listing.” Marketplace does not write those analytics.
- Prospects / Farms failed loads can also show “No prospects/farms yet” (empty + failed collapse).
- User-facing farm/prospect/vault errors mention migration file numbers.
- Nearby-parcels copy mentions “RPC soft-fail.”
- Inquire Send plays `tap` (attribute) and `success` (after send) — overlap.
- Research mode tiles and 2D/3D lack Story Glass sound / press language.
- Farm / prospect / study save success does not play the existing `success` cue.
- Research map is kept mounted after first visit (`researchVisited`). Marketplace ↔ listing remounts the map (intentional separate rooms; not changing architecture this phase).

## Continuum already in place (preserve)

- `MotionProvider` + `RouteTransition` + swipe-back
- Story Glass tokens (`.story-glass`, `.story-press`, `.story-surface`, `.story-well`)
- Story Glass sound engine (`cues.ts` / `engine.ts` / `SoundProvider`) — one system
- Overlay header (not a conventional oversized site header)
- Archie Research map stays mounted when leaving Research for Prospects / Farms / Vault
- Messages / Referrals already hidden from `GlobalNav` and `PRIMARY_NAV`
- Energy REI remains Coming Soon
- Discover lives inside Research (`#archie-discover`)
- Honesty language (KNOWN / CALCULATED / ESTIMATED / OBSERVED / VERIFY / UNKNOWN) is product law — do not strip
