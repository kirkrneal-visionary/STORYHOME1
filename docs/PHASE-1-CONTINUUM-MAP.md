# Phase 1 — product route / continuum map

Inspected from the live implementation (not assumed).

Navigation is client-side Next.js `Link` / `router.replace` unless noted. Overlay header + floating dock stay mounted. No giant header added.

## Public / consumer

| Source | Destination | Full reload | Client nav | State preserved | Map | Property | Scroll | Motion | Sound | Back | Phone | Desktop |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | Marketplace | No | Yes | Search query via URL | New map instance | n/a | Top | enter / lateral | enter | Browser / swipe | Same rooms | Same rooms |
| Marketplace | Listing | No | Yes | Marketplace workspace via `onNavigate` persist | Listing map remounts | Listing id in URL | Top | forward | enter | Back to marketplace | Sheet/list | Split canvas |
| Listing | Marketplace | No | Yes | Restored workspace if persisted | Marketplace remounts | Selection if saved | Restored if persisted | back | back | Native back | Dock | Header |
| Listing / Marketplace | Suites save | No | Modal | Suites localStorage | Map stays | Listing id | Kept | press | none (save modal) | Close modal | Touch 44px | Hover + press |
| Any consumer | My Home `/home` | No | Yes | Auth | n/a | n/a | Top | lateral | enter | Dock / header | Dock | Header |
| Any consumer | Suites `/saved` | No | Yes | Suites store | n/a | Saved ids | Top | lateral | enter | Dock / header | Dock | Header |
| `/following` (direct URL only) | Honest pause | No | Yes | n/a | n/a | n/a | Top | home temp | enter | Marketplace CTA | Hidden from nav | Hidden from nav |
| Marketplace | Agent World | No | Yes | Agent id | n/a | n/a | Top | forward | enter | Back | Same | Same |

**Following / Messages / Referrals are hidden from production nav.** Routes remain.

## Story Pro

| Source | Destination | Full reload | Client nav | State preserved | Map | Notes |
|---|---|---|---|---|---|---|
| `/portal` | Listings / buyers / sellers / community | No | In-portal tabs | Pro identity | n/a | Community empty = no posts, not a public network |
| `/portal` | Archie `/portal/intelligence` | No | Yes | Auth + last Archie module | Research map after first visit | `study` cue on enter Archie |
| Archie section change | Prospects / Farms / Vault | No | `router.replace` scroll false | Research map stays mounted | Yes after first Research visit | `select` cue |
| Corridors `?section=corridors` | Research Access desk | No | Soft redirect | Parcel / mode URL params | Same Research map | Corridors finished — no new algorithms |

## Archie Research

| Source | Destination | Full reload | Client nav | Parcel / mode | Map camera | Motion | Sound |
|---|---|---|---|---|---|---|---|
| Mode desk | Research workspace | No | URL `researchMode` + sessionStorage | Mode stored | Map mounts once | 180ms module in | `select` |
| Change mode | Mode desk | No | `pickingMode` | Parcel + frames stay in memory | Map stays mounted (hidden under picker) | Intentional | `select` |
| 2D ↔ 3D | Same room | No | Local state | Same parcel | Same instance, pitch changes | Camera | `select` |
| Parcel tap | Property card / sheet | No | Local + URL `propId` | Selected property | Camera may fly | Sheet snap | Silent (high frequency) |
| Discover | Similar / portfolio | No | In-card | Subject parcel | Pins on same map | None extra | Silent until save |
| Save Prospect / Farm / Study | Prospects / Farms / Vault | No | After server success | Snapshot + ids | Research map kept | Module in if leaving | `success` only after server OK |
| Farm / Study / Prospect → Research | Research with context | No | URL `openFrame` / `propId` / `researchMode` | Restored when supported | Existing map if visited | Module in | `select` |

## Map remount findings (no architecture change this phase)

- **Preserved:** Archie Research MapLibre instance stays mounted after first Research visit (`researchVisited` in `ShiWorkspace`). Switching Prospects / Farms / Vault hides it; it is not destroyed.
- **Intentional remount:** Marketplace map and listing map are separate rooms. Forcing one global map would couple consumer browse to listing detail incorrectly.
- **Corridors:** `?section=corridors` redirects into the Research Access desk — one map, one room.

## Sound classification used

**A — sound appropriate:** room travel (`enter` / `back` / `study`), research mode pick, 2D/3D, successful prospect/farm/study save, inquire send success.

**B — subtle already handled:** Archie section change (`select`), sheet/drawer via existing glass press (no extra cue).

**C — silent:** typing, pan, continuous zoom, scroll, hover, every parcel, Discover search, filter chips, routine links, background load.
