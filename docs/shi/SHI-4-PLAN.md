# SHI-4 — Farms · Change Intelligence (plan)

## Product promise
**Know your territory.** Save a market area and see what changed in county records since **your last review**.

## Honesty rules
- V1 diffs compare **live CAD** vs **your farm baseline** (saved at create / Mark reviewed).
- Label: **Since your last review** + **Archie detected** (compare time).
- Do **not** claim deed transfer dates or “CAD said this changed on [county effective date]” until observation history exists.
- Do **not** use `ingested_at` churn as “property changed.”

## Reuse
- `DrawnBoundary` + `analyzeArea` (county-locked, capped)
- Study Vault save pattern (recompute server-side)
- Prospects join key `(source, prop_id)`

## Schema (0026)
- `shi_farms` — agent territory (boundary + county + last_reviewed_at)
- `shi_farm_baselines` — parcel snapshot at last review

## Increments
1. **SHI-4.1:** Save farm · live membership · since-last-review diff · Mark reviewed · Farms ribbon module ✅
2. **SHI-4.2 + thin 4.3 (this PR):** Ingest `first_seen_at` / `last_seen_at` · `county_parcel_change_events` on owner compare · Ownership Stability Index on property record
3. **SHI-4.3 full:** County-level change feed · absence marking on full pulls · more field types

### Ownership Stability Index (honesty)
- Familiar **300–850** scale (quiet/stable high ↔ active observed owner changes low)
- Built only from Archie-observed CAD owner-id / owner-name changes between pulls
- **Not** a credit score, **not** a prediction the owner will sell, **not** deed history
- History accrues **forward** from migration 0027 + CAD refreshes

### Apply migration 0027
1. Open [Supabase SQL](https://supabase.com/dashboard/project/ksvllgzsnzyahqsjuove/sql/new)
2. Paste `supabase/migrations/0027_cad_observation_events.sql`
3. Run
4. Refresh a county CAD (`node scripts/ingest-cad.mjs --source polk_cad --all`) so owner diffs can start recording
