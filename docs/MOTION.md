# Story Home — Story Continuum Motion System

Presentation-layer only. Does not change branding, CAD, Archie business logic, auth, or RLS.

**Product rules:** [`STORY-OS-CONSTITUTION.md`](./STORY-OS-CONSTITUTION.md) · **Competition lens:** [`STORY-OS-COMPETITION.md`](./STORY-OS-COMPETITION.md)

## Metaphor

**Walk rooms of one house / market — don’t flip channels.**

Forward = step into a room.  
Back = return to the room you left (still arranged as you left it).  
Archie = enter the study — quieter, more precise, never flashier.

## Visibility pass (`STORY-CONTINUUM-VISIBILITY`)

Tuned so Continuum is **noticeable as belonging** (phone + desktop), not invisible CSS:

- Browse room-step: stronger distance + opacity + soft scale  
- Phone swipe-back: clearer peek underlay (still not a screenshot)  
- Desktop lateral: softer dissolve across networks  
- Study: cooler arrival wash — never neon  
- Shell nav calls `markNavigate` so direction is honest  

Guardrail: desktop travel stays well under slideshow territory (~40px).

## Principle

Every animation answers: where did I go, where did this come from, what did my action do, can I go back, or is the system working?

## Architecture

| Piece | Path |
|---|---|
| Tokens + temperatures | `src/lib/motion/tokens.ts` |
| Continuum physics | `src/lib/motion/continuum.ts` |
| Route hierarchy | `src/lib/motion/routes.ts` |
| Marketplace cache | `src/lib/motion/navigation-cache.ts` |
| MotionProvider | `src/components/motion/MotionProvider.tsx` |
| RouteTransition / SwipeBack / AppShell | `src/components/motion/*` |

GlobalNav + Footer stay outside `AppShell`.

## Network temperatures

| Temperature | Surfaces | Feel |
|---|---|---|
| **browse** | Marketplace | Most physical; soft room-step |
| **social** | Network, Messages, Referrals | Light lateral dissolve |
| **home** | My Home, Saved, Following | Calm belonging |
| **work** | Story Pro CRM / listings | Minimal spatial motion |
| **study** | Archie Intelligence | Cooler, tighter, precise |
| **still** | Auth, seller, legal | Opacity only |

## Gesture physics (mobile swipe-back)

- Wider edge hit (~28px)
- ~1:1 finger follow, then rubber-band resistance
- Commit by **distance or velocity**
- Soft settle (~440ms) — no hard teleport
- Cancel breathes home (~360ms)
- Previous-room peek underlay during drag
- Blocked on maps, sliders, `[data-unsaved='true']`

## State preservation

Marketplace workspace cache (filters, boundary, scroll).  
Archie Research keep-alive across module switches.

## Accessibility

`prefers-reduced-motion` → no spatial travel, no peek, no press scale.

## Story Glass sound (Phase G)

Sparse Web Audio cues (`src/lib/sound/*` + `SoundProvider`):

- Room enter / back · cooler Archie study · soft select · gold tap · success  
- **Always on** as the experience — no mute toggle  
- Silent only under `prefers-reduced-motion`; unlock on first gesture  
- Never arcade; never every press  
- **Protected original IP** — [`shi/STORY-GLASS-SOUND.md`](./shi/STORY-GLASS-SOUND.md)  

## Native parity later

Replicate temperatures + gesture physics + workspace memory on iOS/Android. Business state stays client-agnostic.
