# Contract — capacity (isolated only)

**Who / why:** Measure scripted concurrent users on a spare stack. Never prove 10M visitors or 100k paying users.

**Intended:** Mix 40/25/15/10/8/2. Stages 20 → 100 → 1,000. Stop when error rate > 1%, HTML p95 > 3s, tile p95 > 800ms, DB connections saturate, or cost ceiling hits. Tiles are z≥13.

## Preconditions

- Wave 6 harness (`scripts/wave-6-capacity.mjs`)
- Simulate by default. HTTP is not enabled in this repo
- Live hosts (`www.storyhome.app`, `storyhome-1-eqmg`) and live project `ksvllgzsnzyahqsjuove` are refused

## Inputs and source of truth

- `docs/PRELAUNCH-LOAD-TEST.md`
- `docs/memory/CAPACITY.md`

## Durable changes

- None on production. No live HTTP. No live database writes.

## States

| State | Behavior |
|---|---|
| Healthy simulate | Completes 20, 100, 1,000. Claim: held N concurrent scripted users |
| Stop rule | First failing stage ends the run. No later stage |
| Live target | Throw. Do not fetch |
| CI | Think-time 0. Duration 0. Must finish in seconds |

## Related

- Not CAD ingest. Not Suites SQL. Not a production load test.

## Tests

- `npm run test:wave-6-capacity` (also in `test:project-memory`)
- Isolated. No www or eqmg requests.
