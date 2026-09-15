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

## Do not

- Navigate on pointer-down
- Debounce, fake delay, or extreme z-index to “fix” misses
- Collapse Farms into Vault
- Cover the map dock by raising chrome over expanded map
- Shrink site typography
