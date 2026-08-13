# Story Home — Native Motion System

Presentation-layer only. Does not change branding, CAD, Archie business logic, auth, or RLS.

## Principle

Every animation answers: where did I go, where did this come from, what did my action do, can I go back, or is the system working?

## Architecture

| Piece | Path |
|---|---|
| Tokens | `src/lib/motion/tokens.ts` |
| Route hierarchy | `src/lib/motion/routes.ts` |
| Marketplace cache | `src/lib/motion/navigation-cache.ts` |
| Unsaved guard helper | `src/lib/motion/unsaved.ts` |
| MotionProvider | `src/components/motion/MotionProvider.tsx` |
| AppShell + RouteTransition + SwipeBack | `src/components/motion/*` |
| CSS micro-interactions | `src/app/globals.css` (`.story-press`, `.story-card`, …) |

Root layout keeps **GlobalNav** and **Footer** outside `AppShell` so chrome persists while the content surface transitions.

## Tokens

Durations: `instant` · `micro` · `fast` · `standard` · `surface` · `gesture`  
Easing: `standard` · `enter` · `exit` · `spring` · `gesture`  
Distances: desktop 18px · tablet 28px · mobile 40px  

## Route hierarchy

Depth drives forward/back. Same-depth network switches use lateral (opacity-only).  
Excluded from spatial slides: auth, seller, legal/utility.

## State preservation

Marketplace filters / boundary / selected listing / list scroll → `sessionStorage` cache restored on remount (45 min freshness). Fresh `?q=` / `?intent=` from home search still wins.

Archie Research map stays mounted after first visit when switching modules (hidden, not destroyed).

## Maps

`data-no-swipe-back` + map container selectors block edge swipe-back over MapLibre canvases.

## Mobile swipe-back

Left-edge gesture (~22px). Completes `router.back()` past threshold; cancels otherwise. Blocked by maps, sliders, and `[data-unsaved='true']`.

## Shared element

Optional View Transitions name `listing-photo-{id}` on card image → detail hero (progressive enhancement).

## Accessibility

`prefers-reduced-motion` → opacity-only / no spatial travel. Focus and keyboard routes unchanged.

## Native parity later

Replicate tokens + hierarchy + swipe-back + workspace cache on iOS/Android; keep business state client-agnostic.
