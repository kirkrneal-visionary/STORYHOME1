# Current work

**Recorded:** 2026-09-15  
**Base:** `origin/main` `80fb812` (PR 194 merged)

## In progress

- Navigation Wave 2 PR #197 (`cursor/nav-header-6752`): active tabs + viewport dock. Solid header band reverted — founder rejected it. Wave 3 waits. See `docs/memory/NAV-WAVES.md`.

## Just shipped (do not rewind)

- PR 192 — farm map photo + Open on map (live). Old farms show Photo pending until saved again.
- PR 193 — hide LngLat errors; snap failure keeps the save; Save stays on the map (live)
- PR 194 — Cursor rules + project memory + isolated `test:project-memory`
- Founder save on eqmg 2026-09-15: new farm shows a map photo, not Photo pending

## Open defects (do not treat as intended)

- Old farms / empty Vault folders from failed snaps before PR 193 — need a **new** save to get a photo or a study row
- Liberty + San Jacinto CAD last pull timed out (live `/api/cad/status` 2026-09-15); last good data remains
- Montgomery CAD not ingested
- Suites are device-local `localStorage`, not a server save
- `docs/SITE-SYSTEM-MAP-FOR-CHATGPT.md` still says pages are not middleware-gated (stale)
- Two-user RLS isolation against a disposable database is **not** automated here
- Study Vault card photo on a new production save is still **unverified**
- Menu tap repair is **not** proven on a physical iPhone in this session

## Do not do

- Phase 4, company redesign, runtime AI orchestrator
- Production reset / CAD wipe
- Billing
- People-copy between accounts
- Rebuilding Corridors
- Wave 3 menu cosmetics before Wave 2 is verified

## Next concrete action

1. Confirm the solid header is gone, then Wave 3 (bubble) after founder says so.
2. Do not rename the `verify` job — that would drop the merge lock.
