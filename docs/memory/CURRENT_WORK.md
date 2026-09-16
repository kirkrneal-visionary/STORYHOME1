# Current work

**Recorded:** 2026-09-16  
**Base:** `main` after Waves 1–6 live (`d656960`)

## In progress

- Harden Wave 3: Category C scoring/briefs run on the server. Same answers. `county_parcels` stays open until Wave 4.
- Harden Wave 2: Story Pro RPC authority. UI is not the gate.
- Harden Wave 1 chrome selection is on its own PR (UX only, not security).
- Public live: https://www.storyhome.app. Ship on `storyhome-1-eqmg`.

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
- `docs/SITE-SYSTEM-MAP-FOR-CHATGPT.md` still says pages are not middleware-gated (stale)
- Two-user RLS isolation against a **hosted** spare Supabase is not run here. Wave 2 proves the same owner/broker rules on a disposable in-memory store and refuses the live project.
- Study Vault card photo on a new production save is still **unverified**
- Menu tap repair founder-confirmed GOOD on a physical iPhone 2026-09-15. Live with Waves 1–6.

## Do not do

- Phase 4, company redesign, runtime AI orchestrator
- Production reset / CAD wipe
- Billing
- People-copy between accounts
- Rebuilding Corridors
- Restyling the overlay header (founder rejected the solid band)

## Next concrete action

1. Harden waves stay sequential. Do not merge unless you say MERGE.
2. Do not rename the `verify` job — that would drop the merge lock.
3. Do not add Montgomery to the daily CAD keys.
4. Do not fire a load test at www or eqmg.
5. Do not claim selection lock is security.
