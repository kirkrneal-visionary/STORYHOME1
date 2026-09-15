# Current work

**Recorded:** 2026-09-15  
**Base at install:** `origin/main` `63b72e3` (PR 193 merged)

## In progress

- This branch: persistent Cursor rules + project memory + isolated verification (`cursor/project-memory-6752`)
- **Does not** deploy itself. **Does not** change production data.

## Just shipped (do not rewind)

- PR 192 — farm map photo + Open on map (live). Old farms show Photo pending until saved again.
- PR 193 — hide LngLat errors; snap failure keeps the save; Save stays on the map (live deploy after merge)

## Open defects (do not treat as intended)

- Old farms / empty Vault folders from failed snaps before PR 193 — need a **new** save to get a photo or a study row
- Liberty + San Jacinto CAD last pull timed out (live `/api/cad/status` 2026-09-15); last good data remains
- Montgomery CAD not ingested
- Suites are device-local `localStorage`, not a server save
- `docs/SITE-SYSTEM-MAP-FOR-CHATGPT.md` still says pages are not middleware-gated (stale)
- No GitHub **required** status check for tests. Vercel eqmg is the practical ship check and is not a test suite
- Two-user RLS isolation against a disposable database is **not** automated here
- Production Vault/Farm photo after PR 193 is **unverified** until a founder save is confirmed

## Do not do

- Phase 4, company redesign, runtime AI orchestrator
- Production reset / CAD wipe
- Billing
- People-copy between accounts
- Rebuilding Corridors

## Next concrete action

1. Merge the project-memory PR when `Vercel – storyhome-1-eqmg` is green.
2. After merge, a later session should start from `docs/memory/CURRENT_WORK.md`.
3. Optional later: require the new GitHub verify workflow on `main` (not active today).
