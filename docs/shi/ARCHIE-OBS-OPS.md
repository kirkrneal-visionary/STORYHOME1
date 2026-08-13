# ARCHIE-OBS-OPS — Observation health

## Promise
Empty County observation feed and “Building history” must tell the truth about **ops state**, not imply the market is quiet or the owner is unstable.

## Statuses
| Status | Meaning |
|---|---|
| `migrations_needed` | Events table / tracking columns missing or not backfilled |
| `awaiting_next_pull` | Tracking on, but Archie has not compared a later pull yet |
| `quiet` | Successive pulls compared; no field changes on file |
| `active` | Events on file |
| `pick_county` | No county selected |

## Honesty
- Empty ≠ “nothing changed in the world”
- Awaiting next pull ≠ quiet market
- Absence ≠ deed/sale
- Building history ≠ credit / seller signal

## Delivered
- `getObservationReadiness` on `/api/shi/changes`
- **Observation setup** banner on feed UI
- Ownership Stability: awaiting next pull vs quiet (successive `last_seen` evidence)
- **Missing from latest full pull** when `absent_at` is set
- Growth Watch CAD pulse note does not call empty pulse a quiet market

## Ops (if feed still empty)
1. Confirm **0027** events table + **0028** `absent_at`
2. Full refresh so successive pulls can emit diffs: `node scripts/ingest-cad.mjs --source <county> --all`
