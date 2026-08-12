# ARCHIE-OBS-OPS — Observation health

## Promise
Empty County observation feed and “Building history” must tell the truth about **ops state**, not imply the market is quiet or the owner is unstable.

## Statuses
| Status | Meaning |
|---|---|
| `migrations_needed` | Events table / tracking columns missing or not backfilled |
| `awaiting_next_pull` | Tracking on, but no pull-to-pull events yet |
| `active` | Events on file |
| `pick_county` | No county selected |

## Honesty
- Empty ≠ “nothing changed in the world”
- Absence ≠ deed/sale
- Building history ≠ credit / seller signal

## Delivered
- `getObservationReadiness` on `/api/shi/changes`
- **Observation setup** banner on feed UI
- Clearer Ownership Stability Building history reasons
- **Missing from latest full pull** when `absent_at` is set
