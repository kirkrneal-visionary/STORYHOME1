# Navigation work order — three waves

Not a Phase 4. Not a redesign. Existing dock, header, Archie chrome.

**Order is required.** Wave 2 and 3 wait until Wave 1 is verified.

| Wave | Job | Ships alone? |
|---|---|---|
| **1** | Missed / delayed taps | Yes — this branch |
| **2** | Stabilize nav + header | After Wave 1 |
| **3** | Bubble and icons | After Wave 2 |

Live target stays `storyhome-1-eqmg`. No SQL, RLS, billing, or account changes.

## Wave 1 — Touch reliability (now)

**Symptom:** a menu item sometimes needs several presses before the page changes.

**Confirmed cause (source + layout, not hosting/RLS):**

1. Bottom dock used a 4-column grid with `justify-items-center` and each tab `max-w-[4.5rem]`. Taps on the glass *between* pills hit the `<nav>`, not the link.
2. Several chrome controls were 40×40 or 32px tall (header menu, Archie node, ribbon tabs, workspace exit/menu).
3. No shared rule for “scroll across a control ≠ navigate,” pending vs active, or last tap wins.

**Not the cause:** database, RLS, Vercel, missing farm photos.

**This wave does:**

- Fill the dock cell so icon, label, and surrounding glass are one control (≥ 44×44).
- Shared `PrimaryNavLink` / `NavPressButton`: semantic link/button, no navigate-on-touch-down, ignore travel &gt; 10px, last-tap intent, `useLinkStatus` pending cue.
- Press (`:active`) ≠ pending ≠ confirmed `aria-current`.
- Optional traces only if `localStorage story-nav-touch-trace=1`. No tokens or account fields.
- Keep Research sheet fullscreen: dock/header/ribbon stay hidden there (`display: none`). That is map mode, not a miss-tap bug.

**This wave does not:** restyle the smoked-glass bubble, change site type size, add View Transitions, add `scheduler.yield()`, or raise z-index over maps.

**Verify:** isolated `npm run test:nav-touch` (also inside `test:project-memory`). Founder **GOOD** on a physical iPhone 2026-09-15 via the Wave 1 eqmg preview. Not merged to live.

## Wave 2 — Stabilize nav and header (`cursor/nav-header-6752`)

- Shared chrome stays in the root layout. Maps are not kept mounted just for the dock.
- Explicit `primaryDockId` / `archieModuleFromSearch`: Marketplace listings, Pro ≠ Archie, Access desk = Research.
- Dock bottom uses visual viewport + safe area. No one-phone offset.
- Keep the existing light overlay header (no solid black band). Research mode picker sits below header + ribbon.
- Swipe-back still honors `data-unsaved`. No indiscriminate form reset.
- **Not this wave:** smoked-glass bubble (Wave 3).

## Wave 3 — Bubble and icons (`cursor/nav-bubble-6752`)

- Soft capsule, smoked glass, filled navy selection, restrained gold.
- Official Archie artwork (`archie-intelligence.png`); optical balance only — do not redraw the face.
- Tokens for material, radius, spacing, icon size, motion.
- Brief transform/opacity. Fallback if blur is expensive. Honor reduced motion.
- Header stays the light overlay. No solid black band.
- Before/after visuals required.

## Wave 4 — Marketplace canvas (`cursor/market-canvas-6752`)

- One dark page behind search/filters and the list. Same `--env-0` as the site canvas.
- Do not restyle card interiors, inputs, gold/navy, or the map.
- Do not start integrated card edges (Wave 5) or video-glass on the dock (Wave 6).
- Founder **GOOD** on the Wave 4 eqmg preview 2026-09-15. Not merged to live.

## Wave 5 — Marketplace card and control edges (`cursor/market-edges-6752`)

- Quieter edges on Marketplace listing cards and search/filter controls.
- Cards sit on the canvas: no raise puddle, thin `--market-edge`.
- Do not restyle card interiors, gold/navy, the map, the header, or the dock.
- Do not start video-glass on the dock (Wave 6).
- Founder **GOOD** on the Wave 5 eqmg preview 2026-09-15. Not merged to live.

## Wave 6 — Dock frost (`cursor/nav-frost-6752`)

- Stronger see-through frost on the bottom menu only. Page shows through the pill.
- Top-rim highlight only. No outline. No shadow puddle.
- Icons stay sharp. Filled navy selection stays.
- Do not restyle the header, cards, or map.
- Founder **GOOD** on the Wave 6 eqmg preview 2026-09-15. Not merged to live.

## After each wave

Update `CURRENT_WORK.md` and `workflows/navigation.md`. Do not weaken a failing test to go green.
