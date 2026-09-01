# Phase 1 completion

Phase 1 of 3 — product coherence, Continuum, interaction/sound audit, shell cleanup.

**STOP.** Do not begin Phase 2 (security, payments, analytics, CAD ops, county expansion, new Archie tools).

Canonical production: **storyhome-1-eqmg** — https://storyhome-1-eqmg.vercel.app

## WHAT CHANGED

- Hid Following from production navigation (header + drawer). Route kept with an honest “not shipping yet” page.
- Removed the fake Follow button on listing cards (local `useState` theater). Suites save is unchanged.
- Removed Messages / Referrals promises from Profile, demo login copy, and Agent World insights.
- Seller portal no longer claims “live” marketplace buyer activity. Preview copy only — no new analytics.
- Story Glass sound: mode pick, 2D/3D, and save-success after the server confirms. Inquire Send no longer double-fires tap + success.
- Press / 44px touch on mode change, Discover actions, Save Prospect / Farm / Study, corridor parcel actions, profile CTAs.
- Failed Prospects / Farms / Vault loads no longer look like empty lists. Retry is available. Migration file names removed from user-facing errors.
- Nearby-parcels copy no longer says “RPC soft-fail.”
- Community header states empty rooms mean no posts — not a public network.
- Sound engine `playStorySound` now no-ops on Web Audio failure (UI never depends on audio).
- Armor: `scripts/test-phase-1-coherence.mjs` + `npm run test:phase-1`. Glass A/B and D armor now read the components that actually wear the tokens.

## WHAT WAS PRESERVED

- Marketplace, listing, My Home, Suites, Agent World, Story Pro, Archie Research, modes, Corridors (no new algorithms), Prospects, Farms, Study Vault, Discover-inside-Research.
- Overlay header (no giant website header).
- Story Glass visual system (tokens only; no redesign).
- One sound engine. No mute toggle. Always-on except `prefers-reduced-motion`.
- Research MapLibre instance stays mounted after first visit.
- Archie remains Pro-only. Consumer cannot reach Intelligence from consumer nav.
- Honesty chips / qualification language (KNOWN, CALCULATED, ESTIMATED, OBSERVED, VERIFY, UNKNOWN).
- Energy REI Coming Soon. CAD ingest, county truth, parcel identity, RLS, auth architecture.
- `/messages` and `/referrals` code and tables — hidden, not deleted.

## MESSAGES STATUS

**HIDDEN** from normal production navigation. Route + honest pause view kept.

## REFERRALS STATUS

**HIDDEN** from normal production navigation. Route + honest pause view kept.

## FOLLOWING STATUS

**HIDDEN** from normal production navigation. Route kept as an honest pause (not “you’re not following anyone yet”).

## CONTINUUM IMPROVEMENTS

- Documented actual transitions in `docs/PHASE-1-CONTINUUM-MAP.md`.
- Research map already stays mounted across Archie modules — left that architecture in place.
- Mode change keeps parcel / frames in memory (picker overlays; map not remounted).
- Farm / Study / Prospect reopen paths unchanged (`openFrame`, `propId`, saved `researchMode`).
- No new global map instance (would couple Marketplace to listing incorrectly).

## SOUND AUDIT

- Engine: `src/lib/sound/engine.ts` (synthesized Web Audio).
- Cues: enter · back · study · select · tap · success.
- Provider: route travel + Archie section `select` + `[data-story-sound]` + `useStorySoundOptional`.
- Preference: always on; silent under reduced motion; no Settings mute.
- Failure: unlock / play catch and return — buttons still work.

## NEW SOUND INTERACTIONS

- Research mode tile select (`select`)
- Change research mode (`select`)
- 2D / 3D (`select`)
- Save Prospect after server success (`success`)
- Save Farm / Study after server success (`success`)
- Discover bulk prospect / farm save after server success (`success`)
- Corridor Save study after Vault success (`success`)

## INTENTIONALLY SILENT INTERACTIONS

- Typing, keystrokes
- Map pan / continuous zoom / pitch
- Hover
- Every parcel encounter
- Discover Find Similar / View Portfolio (load, not save)
- Filter chips, routine text links
- Background / data refresh
- Inquire Send tap (removed so only post-success `success` plays)

## TOUCH IMPROVEMENTS

- Removed 28px Follow control (it was theater).
- Mode change, Discover actions, save CTAs, corridor parcel actions, profile primary CTAs: `story-press` and ~44px min height.
- Mobile still cannot depend on hover.

## MOTION IMPROVEMENTS

- No new animation system. Existing Continuum temperatures and 180ms Archie module enter kept.
- Mode / 2D–3D now have press + sound aligned with the state change.
- Did not add motion that delays Research work.

## MOBILE ISSUES FIXED

- Tiny Follow target removed.
- Archie save / mode / Discover / corridor actions large enough to tap without fighting the map as badly.

## TABLET ISSUES FIXED

- Same press language as phone; desktop drawers unchanged in structure.

## DESKTOP ISSUES FIXED

- Following / Messages / Referrals no longer appear as finished header items.
- Profile / login copy no longer promises unfinished rooms.

## MAP REGRESSIONS

**NONE** from this phase. No map algorithm, layer, or remount architecture change. Research map still kept mounted after first visit.

## ARCHIE REGRESSIONS

**NONE** intended. Modes, calculations, Corridors math, CAD, parcel identity untouched.

## CONSUMER REGRESSIONS

**NONE** intended. Suites save remains. Follow theater removed (was never real).

## STORY PRO REGRESSIONS

**NONE** intended. Community not expanded. Seller analytics not built.

## TEST RESULTS

| Script | Result |
|---|---|
| `scripts/test-phase-1-coherence.mjs` | PASS |
| `scripts/test-story-messages-referrals.mjs` | PASS |
| `scripts/test-story-glass-g.mjs` | PASS |
| `scripts/test-story-glass-ab.mjs` | PASS (armor pointed at dock class) |
| `scripts/test-story-glass-c.mjs` | PASS |
| `scripts/test-story-glass-d.mjs` | PASS (armor reads `AgentWorldView`) |
| `scripts/test-story-glass-e.mjs` | PASS |
| `scripts/test-story-glass-f.mjs` | PASS |
| `scripts/test-story-shell-nav.mjs` | PASS |
| `scripts/test-story-shell-header.mjs` | PASS |
| `scripts/test-motion-routes.mjs` | PASS |
| `scripts/test-research-modes.mjs` | PASS |
| `scripts/test-shi-discover-act.mjs` | PASS |
| `scripts/test-shi-farms.mjs` | PASS |
| `scripts/test-shi-prospects.mjs` | PASS |
| `scripts/test-shi-backlog.mjs` | PASS |
| `scripts/test-corridor-nav-lock.mjs` | PASS |
| `scripts/test-research-workspace.mjs` | PASS |
| `scripts/test-prelaunch-security.ts` | PASS |
| `scripts/test-story-walk-sw3.mjs` | FAIL — **pre-existing** (`SW-3` missing from `waves.ts`). Not a Phase 1 change. |

## UNRESOLVED ITEMS

- Following / Messages / Referrals product still not built (correctly hidden).
- Seller live analytics still not captured (copy is honest; Phase later).
- Suites remain localStorage-only.
- Marketplace ↔ listing still remounts MapLibre (intentional separate rooms).
- Phone Research sheet / desktop drawer: audited, not redesigned.
- Discover stays inside Research after a property is selected (not a top-level room).
- `test-story-walk-sw3.mjs` still stale.

Seller portal still shows numeric preview tiles. Phase 1 only stopped the live-traffic claim. Do not build capture here.
