# Test-data reset result

Founder approved **2026-09-01**. Backup: scheduled **01 Sep 2026 08:01:18 (+0000)**.

Wipe **executed** on live STORYHOME (eqmg / `ksvllgzsnzyahqsjuove`). Not a code merge.

## After

| Item | Before | After |
|---|---|---|
| Auth users | 23 | **0** |
| Listings | 1 | **0** |
| `county_parcels` | 345,387 | **345,387** |
| Product analytics events | 1,904 | **1,904** (service role cannot DELETE this table) |
| Test files in `home-docs` / `shi-studies` | present | **0** |

Live `/api/cad/status` still reads. County status sum 345,385 (same 2-row gap as before the wipe).

## What was removed

- All 23 Auth users (no keep-list)
- The 1 listing (243 Faith Ln., Livingston — founder asked)
- User-owned files in `home-docs` and `shi-studies`

Child rows on profiles (Prospects, Farms, Studies, My Home, inquiries) cascade from Auth delete.

## What was not removed

- County parcels / CAD / maps / land data
- 1,904 product analytics rows (no DELETE grant for the live service role)
- Boost catalog, migrations, system config

## Smoke (live eqmg)

- `/` 200
- `/marketplace` 200
- `/login` 200
- `/api/cad/status` 200
- Listings API count **0**
- Auth admin user list **empty**

Phase 1–3 **code** is still on PR #170, not merged to `main`.
