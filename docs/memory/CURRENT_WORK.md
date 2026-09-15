# Current work

**Recorded:** 2026-09-15  
**Base:** `origin/main` `80fb812` (PR 194 merged)

## In progress

- None. Memory install is on main. Merge to main now requires the `verify` check.

## Just shipped (do not rewind)

- PR 192 — farm map photo + Open on map (live). Old farms show Photo pending until saved again.
- PR 193 — hide LngLat errors; snap failure keeps the save; Save stays on the map (live)
- PR 194 — Cursor rules + project memory + isolated `test:project-memory`
- Main requires GitHub check `verify` (workflow **Project memory checks**). Do not rename the job. Admins cannot skip it.
- Founder save on eqmg 2026-09-15: new farm shows a map photo, not Photo pending.

## Open defects (do not treat as intended)

- Old farms / empty Vault folders from failed snaps before PR 193 — need a **new** save to get a photo or a study row
- Liberty + San Jacinto CAD last pull timed out (live `/api/cad/status` 2026-09-15); last good data remains
- Montgomery CAD not ingested
- Suites are device-local `localStorage`, not a server save
- `docs/SITE-SYSTEM-MAP-FOR-CHATGPT.md` still says pages are not middleware-gated (stale)
- Two-user RLS isolation against a disposable database is **not** automated here
- Study Vault card photo on a new production save is still **unverified**

## Do not do

- Phase 4, company redesign, runtime AI orchestrator
- Production reset / CAD wipe
- Billing
- People-copy between accounts
- Rebuilding Corridors

## Next concrete action

1. Start later sessions from this file.
2. Do not rename the `verify` job — that would drop the merge lock.
3. Optional later: two-user RLS on a throwaway database; Desktop always-apply proof.
