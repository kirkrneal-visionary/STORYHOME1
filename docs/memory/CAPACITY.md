# Capacity (evidence-based)

**Planning targets (not measurements):** 10 million monthly visitors; 100,000 paying users.

These are **not** simultaneous users. They are **not** “everyone runs Archie analyze at once.”

## Unknowns (do not invent)

- Peak concurrent sessions
- Requests per visitor
- Cache hit rate on tiles vs uncached SHI analyze
- Database CPU / connections at peak
- Background ingest overlap with interactive traffic
- Cost per analyze / tile / flood lookup

## What we do know

- Parcel store is ~345k rows for 7 counties (live status 2026-09-15)
- Analyze is capped (`SHI_CAPS.maxParcelsPerAnalyze` 1500; area span limits)
- Tile routes are intentionally not 429-throttled in app middleware
- Prelaunch load notes live in `docs/PRELAUNCH-LOAD-TEST.md` — read them; do not upgrade them to a certification

## Rule

Do not recommend a rewrite, new region, or paid cluster **because** of line count or the 10M/100k targets. Reuse tile caching. Never cache private SHI payloads as public.
