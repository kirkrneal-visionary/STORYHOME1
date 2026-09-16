# Contract — isolation (your stuff is yours)

**Who / why:** Prove one login cannot read another login’s private rows, without touching live customers.

**Intended:** Farms, Vault, Prospects, My Home files, and Suites stay on `auth.uid()`. Office keeps Story Pro and can edit **that brokerage’s listings**, not another agent’s farms.

## Preconditions

- Wave 2 harness (`scripts/wave-2-isolation-harness.ts`)
- Disposable actors only (`WAVE2-` names)
- Live project `ksvllgzsnzyahqsjuove` is refused

## Inputs and source of truth

- RLS as written in `0002`, `0003`, `0023`, `0025`, `0026`, `0048`, `0051`
- App gates: `requireStoryPro`, `mayUseStoryPro`, `decideReadiness`

## Durable changes

- None on production. Harness rows are created and deleted in memory.

## States

| State | Behavior |
|---|---|
| Owner read | Own farm / home / suite rows |
| Other user | Empty / deny. No foreign body |
| Office + Archie | SHI gate 200; dest `/office` |
| Office + other farms | Empty. Not Pro A’s body |
| Same brokerage Pro | Cannot read the other agent’s farms |
| Other brokerage office | Cannot update this brokerage’s listing |
| Consumer / other-pro / AAL1 | SHI 403 |
| Signed out | SHI 401 |
| Cleanup | Only `WAVE2-` rows removed |

## Related

- Not CAD ingest. Not a production load test.
- Suites stay device-local in the app until Wave 4. The harness still checks the unused table’s owner policy.

## Tests

- `npm run test:wave-2-isolation` (also in `test:project-memory`)
- Isolated. No live listing, farm, or home writes.
