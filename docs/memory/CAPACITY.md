# Capacity (evidence-based)

**Planning targets (not measurements):** 10 million monthly visitors; 100,000 paying users.

These are **not** simultaneous users. They are **not** “everyone runs Archie analyze at once.”

## Wave 6 (isolated only)

Harness: `scripts/wave-6-capacity.mjs`. Default mode is **simulate**. It refuses `www.storyhome.app`, `storyhome-1-eqmg`, and live project `ksvllgzsnzyahqsjuove`. CI runs `npm run test:wave-6-capacity` — short simulate, not a 15-minute live stage.

Mix: 40% marketplace + tiles z≥13, 25% listing, 15% auth refresh, 10% SHI search, 8% analyze, 2% writes.

Stages: 20 → 100 → 1,000 simulated active users. Think-time 3–10s is encoded for a real isolated run; CI think-time is 0.

Stop: error rate > 1%, HTML p95 > 3s, tile p95 > 800ms, DB connections saturated, or cost ceiling.

**Claim allowed:** “This isolated stack held N concurrent scripted users.”
**Not allowed:** 10M monthly visitors or 100k paying users as proven.

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
- Wave 6 proves the mix, stop rules, and claim language on an isolated simulator. It does **not** measure production.

## Rule

Do not recommend a rewrite, new region, or paid cluster **because** of line count or the 10M/100k targets. Reuse tile caching. Never cache private SHI payloads as public. Never fire Wave 6 at production.
