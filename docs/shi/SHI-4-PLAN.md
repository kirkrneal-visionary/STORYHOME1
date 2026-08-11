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
1. **SHI-4.1 (this PR):** Save farm · live membership · since-last-review diff · Mark reviewed · Farms ribbon module
2. **SHI-4.2:** Ingest `first_seen_at` / `last_seen_at` + absence on full pulls
3. **SHI-4.3:** `county_parcel_change_events` during upsert compare → county-level change feed
