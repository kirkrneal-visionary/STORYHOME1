# Contract — Shared navigation

**Who / why:** Anyone moving between Home, Marketplace, Story Pro, Archie, Profile.

**Intended:** One deliberate tap starts one navigation. The whole control is the target.

## Preconditions

- Auth and Pro gates unchanged (`requireStoryPro`, `mayUseStoryPro`). Archie stays Pro-only.
- Seller routes still unmount `GlobalNav`.

## Primary dock (Home / Pro / Archie / Profile)

- **Input:** tap or keyboard on a dock cell
- **Source of truth:** `next/link` href. Active only from the real URL (`aria-current`)
- **Durable:** none (chrome only)
- **Success:** pending clears when the path changes; destination is usable
- **Snap / miss:** travel &gt; 10px is a scroll, not a navigation
- **Retry:** last tap wins. An older in-flight href must not look active
- **Refresh:** dock stays mounted in root layout except seller
- **Tests:** `scripts/test-nav-touch.ts`, `scripts/test-story-shell-nav.mjs`
- **Intentional hide:** Research live + sheet layout (`html[data-research-live][data-workspace-layout="sheet"]`) hides dock, header, and Archie ribbon. Use the on-map workspace bar.

## Archie modules

Ribbon + drawer + `?section=` / `?mode=`. Same tap rules. Last module is sessionStorage only.

## Header and viewport (Wave 2)

- Overlay header stays a light scrim — never a solid black band. Not a type-size change.
- Homepage only (`html:has([data-home-hero])`, so it holds from first paint): the header is clear over the hero and never blurred, per Kirk’s County Stories design. Reduced transparency keeps the solid fallback. Other pages are unchanged.
- Homepage hero sits on the plain dark page background (no photo, no shade, per Kirk). The headline is paper; on phones it scales with width (26–28px), stays two lines, and keeps its 3.5rem layout height so Search never moves.
- The hero is only as tall as its content: the headline, Search and the County Stories row sit together on every screen. Opening Filters pushes the row down.
- Homepage has no trim (per Kirk): no borders or rings on the search box, its pills and field, the Filters panel boxes, the cards and wells (`[data-home-page]`), or the county popup badge. Solid dark fills carry each box. Focus rings stay; the search field shows a thin gold ring while focused. Shared cards keep their borders on every other page.
- No Motion button in the header and no animated-examples switch in the menu. The search box typing examples follow the device’s Reduce Motion setting (a still hint when it is on).
- Research mode picker is padded under header + ribbon. Live map sheet still hides chrome.
- Dock `bottom` uses `max(safe-area, --story-vv-bottom)`. Keyboard and browser chrome move the dock. No one-phone offset.
- Active tab comes from `primaryDockId` / `archieModuleFromSearch` only after the URL matches.

## Dock bubble (Wave 3) and frost (Wave 6)

- Bottom dock is a smoked-glass capsule (`--dock-*` tokens). Active cell is filled navy with a thin gold ring.
- Wave 6: stronger see-through frost + top-rim only. No outline. No shadow puddle.
- Archie dock mark uses official `ARCHIE_MARK_SRC`. Do not redraw the face.
- Honor reduced motion and reduced transparency. No header restyle beyond the homepage exception above.

## Marketplace canvas and edges (Waves 4–5)

- Marketplace page is one `--env-0` canvas. Search/filters are not a glass strip.
- Listing cards and toolbar controls use quieter `--market-edge`. No raise puddle.
- Overlay header and dock stay as they are.
- Marketplace map help card and +/− lift above `--story-bottom-clearance` so they do not sit on Suites/Search. Map canvas stays under the pill. Fullscreen map does not lift.

## Do not

- Navigate on pointer-down
- Debounce, fake delay, or extreme z-index to “fix” misses
- Collapse Farms into Vault
- Cover the map dock by raising chrome over expanded map
- Shrink site typography
