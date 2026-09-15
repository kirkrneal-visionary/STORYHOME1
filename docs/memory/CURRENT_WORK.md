# Current work

**Recorded:** 2026-09-15  
**Base:** `origin/main` `80fb812` (PR 194 merged)

## In progress

- Navigation Waves 1–4 founder-confirmed GOOD on iPhone 2026-09-15. Stay on test links — not live. Wave 5: quieter Marketplace card/control edges. See `docs/memory/NAV-WAVES.md`.

## Just shipped (do not rewind)

- PR 192 — farm map photo + Open on map (live). Old farms show Photo pending until saved again.
- PR 193 — hide LngLat errors; snap failure keeps the save; Save stays on the map (live)
- PR 194 — Cursor rules + project memory + isolated `test:project-memory`
- Founder save on eqmg 2026-09-15: new farm shows a map photo, not Photo pending
- PR 197 Wave 2 — active tabs + viewport dock. Solid header reverted.

## Open defects (do not treat as intended)

- Old farms / empty Vault folders from failed snaps before PR 193 — need a **new** save to get a photo or a study row
- Liberty + San Jacinto CAD last pull timed out (live `/api/cad/status` 2026-09-15); last good data remains
- Montgomery CAD not ingested
- Suites are device-local `localStorage`, not a server save
- `docs/SITE-SYSTEM-MAP-FOR-CHATGPT.md` still says pages are not middleware-gated (stale)
- Two-user RLS isolation against a disposable database is **not** automated here
- Study Vault card photo on a new production save is still **unverified**
- Menu tap repair founder-confirmed GOOD on a physical iPhone 2026-09-15 (Wave 1 test link). Not live yet.

## Do not do

- Phase 4, company redesign, runtime AI orchestrator
- Production reset / CAD wipe
- Billing
- People-copy between accounts
- Rebuilding Corridors
- Restyling the overlay header (founder rejected the solid band)

## Next concrete action

1. Build and verify Wave 5 (Marketplace card/control edges). Do not start dock video-glass until Wave 5 is GOOD.
2. Do not rename the `verify` job — that would drop the merge lock.
