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
2. **SHI-4.2 + thin 4.3:** Ingest `first_seen_at` / `last_seen_at` · `county_parcel_change_events` on owner compare · Ownership Stability Index on property record ✅
3. **SHI-4.3 full (this PR):** County-level change feed · absence marking on full pulls · more field types

### Ownership Stability Index (honesty)
- Familiar **300–850** scale (quiet/stable high ↔ active observed owner changes low)
- Built only from Archie-observed CAD owner-id / owner-name changes between pulls
- **Not** a credit score, **not** a prediction the owner will sell, **not** deed history
- History accrues **forward** from migration 0027 + CAD refreshes

### County observation feed (4.3 honesty)
- Shows Archie-detected CAD field diffs: owner, site address, market value, acreage, presence
- Absence = missing from a full-county pull (`--all`), not a deed/sale
- Cap on absence marks per run so compute stays healthy

### Apply migration 0028
1. Open [Supabase SQL](https://supabase.com/dashboard/project/ksvllgzsnzyahqsjuove/sql/new)
2. Paste `supabase/migrations/0028_cad_absence_and_feed.sql` (or the short `ALTER` only — no backfill)
3. Run
4. Full refresh: `node scripts/ingest-cad.mjs --source polk_cad --all`
