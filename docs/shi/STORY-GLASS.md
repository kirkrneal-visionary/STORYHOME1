# Story Glass — Application Surface System

**Status:** Phase G (Feedback · sound) shipping · A–F live  
**Live:** https://storyhome-1-eqmg.vercel.app  
Companion: [`STORY-FEEL-WAVES.md`](./STORY-FEEL-WAVES.md) · [`STORY-GLASS-SOUND.md`](./STORY-GLASS-SOUND.md) · [`../MOTION.md`](../MOTION.md)

## Goal

Elevate StoryHome from “responsive website” toward a premium app shell — without new products, without CAD/RLS rewrites, without cloning another app.

## Non‑negotiables

1. Navy / gold / teal remain the brand — navy is **not** required as every screen’s wall.  
2. Clothing + shell only — no GRPT, no feature creep.  
3. Readability beats blur. Glass is selective.  
4. Continuum belonging stays sacred.  
5. Sound is sparse, warm, **original synthesized IP** — always on; silent only for reduced motion. Protect: [`STORY-GLASS-SOUND.md`](./STORY-GLASS-SOUND.md).  
6. Haptics = facade later; web must work without them.
7. **Do not** strip Story Glass sound, add a product mute toggle, or replace synthesis with stock SFX packs.

## Phase A — Tokens

Centralized in `src/app/globals.css`:

| Token family | Purpose |
|---|---|
| `--env-0` … `--env-2` | Graphite operating environment |
| `--background` / `--surface` | Env-based (navy reserved for brand/active) |
| `--glass-*` | Story Glass blur / border / elevation |
| `--type-*` | Brand → page → property → primary → meta → data |
| `--story-header-h` / `--story-archie-ribbon-h` / `--story-bottom-clearance` | Shell insets |

Classes: `.story-glass`, `.story-glass-nav` (floating pill), living-header data states.

## Phase B — Shell prototype

Primary validation room: **Marketplace (phone)**.

1. **Living header** — Full → Compact → Minimal on scroll (hysteresis).  
2. **Floating Story Glass bottom nav** — pill, safe-area, content perceptible underneath.  
3. Gold only for **active** / important — not every icon.  
4. Desktop top bar keeps glass tokens; pill nav remains phone-only.

## Phase C — Browse migration

Rooms: **Marketplace + Listing**.

1. Map tool chrome → `story-glass` (map stays canvas; no navy/90 pills).  
2. Search toolbar → glass strip; denser edge-to-edge listing stack.  
3. Listing cards → `story-surface` + glass price chip.  
4. Listing detail → living-header tokens, glass back control, bottom-nav clearance.  
5. Continuum marketplace cache untouched.

## Phase D — Home / social

Rooms: **Home, Suites, Following, Network, Profile, Agents**.

1. Home search cluster → `story-glass` + living-header-aware hero padding.  
2. Social rooms drop hardcoded `pt-[72|96px]` / `pb-24` for shell tokens.  
3. Empty states / directories → `story-well` / `story-surface` (no cardboard).  
4. Agent banner → env charcoal, not navy wall.  
5. No follow/Messages feature work.

## Phase E — Story Pro work

Rooms: **Portal, CRM, community, settings, listing CAD map**.

1. BrokerPortal / Settings / ShellPaused → living-header insets (Archie ribbon left for F).  
2. CRM / community dashed empties → `story-well`.  
3. ListingCadMap floating chrome → `story-glass`.  
4. No CRM feature work; CAD math untouched.

## Phase F — Archie study

Rooms: **Research, Corridors, evidence panels, map chrome, Archie ribbon**.

1. `--story-archie-ribbon-h` + BrokerPortal Archie inset tracks living header + ribbon.  
2. NetworkContextRibbon → `story-glass` under `top: var(--story-header-h)` (no navy wall / fixed 72).  
3. Research / Corridors map toolboxes + CAD overlay → floating `story-glass`.  
4. Corridor analysis/compare + Archie mark → `story-surface` / wells (no cardboard panels).  
5. No CAD math, honesty copy, Continuum cache, or GRPT.

## Phase G — Feedback · sound

Sparse, beautiful Web Audio feedback — **approved** · **always on**.

1. Synthesized cues only (`src/lib/sound/*`) — no MP3 packs, no arcade.  
2. Room travel: soft enter / back; Archie arrival: cooler study chord.  
3. Module select + gold primary tap + inquire success — intentional moments only.  
4. Sound is permanent experience — no Settings mute toggle; unlock on first gesture.  
5. Silent only under `prefers-reduced-motion` (accessibility). Clears legacy `story-sound` prefs.  
6. No haptics shipping; no GRPT.

## Later

Story Glass clothing program complete. Optional future: native haptics facade.

## Armor

`npm run test:glass` → `ab` + `c` + `d` + `e` + `f` + `g`
