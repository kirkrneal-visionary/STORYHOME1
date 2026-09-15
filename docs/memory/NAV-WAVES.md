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

**Verify:** isolated `npm run test:nav-touch` (also inside `test:project-memory`). Browser: Home / Pro / Archie / Profile / Marketplace, open-close drawer, scroll-across-tab, switch while a page is loading. **Emulated Chrome is not proof the iPhone bug is gone.**

## Wave 2 — Stabilize nav and header (after Wave 1)

- Keep the shared chrome mounted; do not keep every map mounted just to keep the dock.
- Explicit active-tab map: Marketplace, Story Pro vs Archie, Archie sections.
- Viewport, safe area, and keyboard — no one-phone bottom offset.
- Research text must not read through the wordmark. Layering + content inset. Not a type-size pass.
- Respect scroll restoration and unsaved-work guards.

## Wave 3 — Bubble and icons (after Wave 2)

- Soft capsule, smoked glass, filled navy selection, restrained gold.
- Official Archie artwork; optical balance only — do not redraw the face.
- Tokens for material, radius, spacing, icon size, motion.
- Brief transform/opacity. Fallback if blur is expensive. Honor reduced motion.
- Before/after visuals required.

## After each wave

Update `CURRENT_WORK.md` and `workflows/navigation.md`. Do not weaken a failing test to go green.
