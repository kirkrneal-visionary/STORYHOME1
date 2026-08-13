# Story Home — Story Continuum Motion System

Presentation-layer only. Does not change branding, CAD, Archie business logic, auth, or RLS.

**Product rules:** [`STORY-OS-CONSTITUTION.md`](./STORY-OS-CONSTITUTION.md) · **Playbook:** [`STORY-OS-PLAYBOOK.md`](./STORY-OS-PLAYBOOK.md) · **Networks:** [`STORY-OS-NETWORKS.md`](./STORY-OS-NETWORKS.md) · **Competition:** [`STORY-OS-COMPETITION.md`](./STORY-OS-COMPETITION.md)

Verify on: **https://storyhome-1-eqmg.vercel.app** (hard refresh after deploy)

## Metaphor

**Walk rooms of one house / market — don’t flip channels.**

Forward = step into a room.  
Back = return to the room you left (still arranged as you left it).  
Archie = enter the study — quieter, more precise, never flashier.

## Visibility goal (STORY-OS-MASSIVE)

Continuum must be **noticeable as belonging** on phone and desktop — not invisible CSS. Still not a slideshow.

| Cue | What you should feel |
|---|---|
| Room-step | Marketplace / listing travel has clear lateral distance |
| Lateral dissolve | Network hops fade more than before |
| Temperature rail | 2px rail under shell keyed by `html[data-continuum-temp]` |
| Swipe peek | Left-edge drag reveals previous-room underlay clearly |
| Maps sacred | Pan/draw never hijacked |

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

- Wider edge hit (~36px)
- ~1:1 finger follow, then rubber-band resistance
- Commit by **distance or velocity**
- Soft settle (~480ms) — no hard teleport
- Cancel breathes home (~380ms)
- Previous-room peek underlay during drag (up to ~42% opacity)
- Blocked on maps, sliders, `[data-unsaved='true']`

## State preservation

Marketplace workspace cache (filters, boundary, scroll).  
Archie Research keep-alive across module switches.

## Accessibility

`prefers-reduced-motion` → no spatial travel, no peek, no press scale.

## How to feel it (eqmg)

1. Hard refresh https://storyhome-1-eqmg.vercel.app  
2. Marketplace → open a listing → back (desktop: clear step; phone: same)  
3. Jump Marketplace ↔ Network (lateral dissolve)  
4. Phone: left-edge swipe on a deep page — peek + rubber band  
5. Enter Archie’s Intelligence — study rail cue, calmer enter  

## Native parity later

Replicate temperatures + gesture physics + workspace memory on iOS/Android. Business state stays client-agnostic.
