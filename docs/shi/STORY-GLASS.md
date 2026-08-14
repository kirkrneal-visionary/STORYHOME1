# Story Glass — Application Surface System (Phase A / B)

**Status:** Phase A (tokens) + Phase B (shell prototype) shipping  
**Live:** https://storyhome-1-eqmg.vercel.app  
Companion: [`STORY-FEEL-WAVES.md`](./STORY-FEEL-WAVES.md) · [`../MOTION.md`](../MOTION.md)

## Goal

Elevate StoryHome from “responsive website” toward a premium app shell — without new products, without CAD/RLS rewrites, without cloning another app.

## Non‑negotiables

1. Navy / gold / teal remain the brand — navy is **not** required as every screen’s wall.  
2. Clothing + shell only — no GRPT, no feature creep.  
3. Readability beats blur. Glass is selective.  
4. Continuum belonging stays sacred.  
5. Sound stays design-only until separately approved.  
6. Haptics = facade later; web must work without them.

## Phase A — Tokens

Centralized in `src/app/globals.css`:

| Token family | Purpose |
|---|---|
| `--env-0` … `--env-2` | Graphite operating environment |
| `--background` / `--surface` | Env-based (navy reserved for brand/active) |
| `--glass-*` | Story Glass blur / border / elevation |
| `--type-*` | Brand → page → property → primary → meta → data |
| `--story-header-h` / `--story-bottom-clearance` | Shell insets |

Classes: `.story-glass`, `.story-glass-nav` (floating pill), living-header data states.

## Phase B — Shell prototype

Primary validation room: **Marketplace (phone)**.

1. **Living header** — Full → Compact → Minimal on scroll (hysteresis).  
2. **Floating Story Glass bottom nav** — pill, safe-area, content perceptible underneath.  
3. Gold only for **active** / important — not every icon.  
4. Desktop top bar keeps glass tokens; pill nav remains phone-only.

## Later phases (not this PR)

C Browse migration · D Home/social · E Work · F Study · G Feedback (sound only if approved)

## Armor

`npm run test:glass` → `scripts/test-story-glass-ab.mjs`
