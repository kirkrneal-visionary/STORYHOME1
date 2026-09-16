# Contract — CAD ingest and observation

**Who / why:** Keep launch-county tax-roll parcels current so Archie can analyze and Farms can diff.

**Intended:** Public record in `county_parcels`. Ingest is service-role. Agent workflows never write CAD. Observation is “what changed between our pulls,” not a deed date.

## Preconditions

- Service role + county source URL (`scripts/ingest-cad.mjs`, `scripts/refresh-cad.mjs`)
- Launch 7: Polk, Angelina, Trinity, Tyler, San Jacinto, Liberty, Walker

## Inputs and source of truth

- County ArcGIS / file feeds
- Tables: `county_parcels`, `county_parcel_values`, `county_parcel_change_events`, `cad_county_status`

## Durable changes

- Upsert parcels; value years; change events on verified full pulls
- Status `last_success_at` only when the run is proven (not capped / under-fetched)

## States

| State | User language |
|---|---|
| current | Observation active |
| refresh_delayed | Last good pull is old |
| source_failed | Source unavailable; last good data remains |
| partial_pull | Missing parcels were not treated as gone |
| quiet | No change observed |

**Observed (live `/api/cad/status`, 2026-09-15):** ~345,420 rows. Liberty and San Jacinto last attempt timed out; last success older (stale). Montgomery empty.

## Related

- Farms baseline vs live analyze
- Map tiles `parcels_mvt` from `county_parcels.geom`

## Tests

- `scripts/test-phase-2-truth.mjs`, `test-shi-obs-ops.mjs`, `test-shi-county-ops.mjs`, `test-wave-5-cad.mjs`
- GitHub Action `.github/workflows/cad-refresh.yml` — scheduled ingest, **not** a PR test gate
- Wave 5: page-then-upsert, resume checkpoint (0055, optional), one failed county does not fail the whole job, concurrency lock
- **Do not** run ingest against production from this memory task
- Montgomery stays optional. Not on the daily key list.

## Business reason

Founder: own public GIS/CAD rather than rent listing-data landlords. **Inferred** from `docs/shi/ARCHIE-DATA-COVERAGE.md`.
