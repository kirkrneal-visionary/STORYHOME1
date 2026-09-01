# Phase 2 — Data truth

Reference for Archie observation / CAD ops. Launch counties only. No county expansion.

Canonical live project: **storyhome-1-eqmg**.

## Chain

COUNTY SOURCE → INGEST → NORMALIZED PARCEL → OBSERVATION → CHANGE MEMORY → FARM → STABILITY → RESEARCH → AGENT ACTION

Archie observes what changed **between our data pulls**. He does **not** automatically know deed date, sale date, transfer date, or why a field changed.

| Observed | Not proven |
|---|---|
| CAD owner field changed | Property sold |
| CAD value changed | Market appreciated |
| Parcel missing from a **verified full** pull | Parcel disappeared from a partial/failed pull |

## Last-known-good

`scripts/ingest-cad.mjs` still upserts live rows (no separate staging tables — do not rebuild that). Promotion of **status** is now stricter:

- `last_success_at` is written **only** when the run is proven: not capped, not under-fetched vs last verified count (≥85% of prior DB count when prior > 500), and the run completed without error.
- Capped / under-fetched / failed runs update `last_attempt_at`, `last_error`, and `ingest_capped`. They do **not** replace last verified success time.
- Absence marking (`presence` → absent / DISAPPEARED) runs only on `--all` pulls that are not capped, not limited, not filtered, and not under-fetched.
- Change events skip existing `(source, prop_id, field, observed_at)` so a replay cannot mint duplicates.

Limitation: a partial upsert can still write the rows it received. Production **status** and **absence events** stay last-known-good. A full rollback of already-upserted rows is not implemented (would need staging tables — out of Phase 2).

## Full vs partial

| Kind | Absence events | Stability / “quiet market” |
|---|---|---|
| Verified full pull | Allowed | Allowed after successive pulls |
| Capped / `--limit` / `--where` / prop-id | Never | Not a full observation |
| Under-fetched vs last verified count | Never | County health = partial |
| Failed / timeout / 403 | Never | County health = source failed |

## Observation health (internal)

| Health | Meaning | User language |
|---|---|---|
| `current` | Last verified pull inside the 72h window | Observation active / no change observed |
| `refresh_delayed` | Last verified pull older than the window, no newer failure | Refresh delayed — last verified observation remains in use |
| `source_failed` | Newer attempt failed (timeout, 403, etc.) | Source unavailable — last verified data remains |
| `partial_pull` | Last run was capped or under-fetched | Partial observation — missing parcels were not treated as disappeared |
| `unknown` | No status row | Setup / pick a county |

These are **not** the same empty state:

- No changes were observed (`quiet`)
- Not enough history (`awaiting_next_pull` / building history)
- County source failed (`source_failed`)
- County has not refreshed recently (`refresh_delayed`)
- Observation data is loading (spinner)
- The request failed (API error)

## Refresh cadence (reality)

- Intended: ~72 hours (`refresh_interval_hours` default 72).
- Trigger: GitHub Action `.github/workflows/cad-refresh.yml` daily 06:00 UTC + skip-if-fresh in `scripts/refresh-cad.mjs`.
- If Actions secrets / source / DB timeout fail, the county stays on last verified data and `last_error` is stored.
- Overlap: one workflow run; per-county skip if still fresh. No separate county lock table.
- This is **automated when GitHub Actions + secrets work**. Human intervention is required when a source stays 403/timeout (Tyler zip, Liberty statement timeout as of 2026-08-27).

Do not call a county “automated and healthy” if `last_error` is newer than `last_success_at`.

## Launch counties

### Polk — `polk_cad` — FIPS 48373

| Field | Value |
|---|---|
| SOURCE | Polk County BIS CAD FeatureServer |
| SOURCE TYPE | ArcGIS |
| SOURCE IDENTITY | `prop_id` |
| EXPECTED | ~57,572 unique |
| ACTUAL (eqmg 2026-08-27) | DB 57,578 / unique 57,572 |
| GEOMETRY | Features 59,542 (dupes possible) |
| LAST SUCCESSFUL FULL PULL | 2026-08-25T08:14:39Z |
| LAST ATTEMPT | same |
| OBSERVATION / CHANGE EVENTS | Supported (`county_parcel_change_events`) |
| FAILURE / RETRY | No current error |
| HEALTH | Healthy |

### Angelina — `angelina_cad` — FIPS 48005

| Field | Value |
|---|---|
| SOURCE | AngelinaParcels FeatureServer |
| SOURCE TYPE | ArcGIS |
| SOURCE IDENTITY | `prop_id` |
| EXPECTED | ~54,251 unique |
| ACTUAL | DB 54,251 / unique 54,253 |
| GEOMETRY | Features 60,764 |
| LAST SUCCESSFUL FULL PULL | 2026-08-25T08:18:13Z |
| LAST ATTEMPT | same |
| HEALTH | Healthy |

### Trinity — `trinity_cad` — FIPS 48455

| Field | Value |
|---|---|
| SOURCE | TrinityCADWebService FeatureServer |
| SOURCE TYPE | ArcGIS |
| SOURCE IDENTITY | `prop_id` |
| EXPECTED | ~24,590 unique |
| ACTUAL | DB 24,593 / unique 24,590 |
| LAST SUCCESSFUL FULL PULL | 2026-08-25T08:20:09Z |
| HEALTH | Healthy |

### Tyler — `tyler_cad` — FIPS 48457

| Field | Value |
|---|---|
| SOURCE | `https://tylercad.net/wp-content/uploads/2025/12/Parcels.zip` |
| SOURCE TYPE | File / shapefile (geometry-only) |
| SOURCE IDENTITY | parcel id from shapefile |
| EXPECTED | ~23,508 geometry rows |
| ACTUAL | DB 23,508 |
| LAST SUCCESSFUL FULL PULL | 2026-08-22T08:01:19Z |
| LAST ATTEMPT | 2026-08-26T08:09:53Z |
| FAILURE | Download failed: 403 |
| RETRY | Daily Action retries; still 403 as of snapshot |
| OBSERVATION | Owner/value fields are often agent-entered — geometry is the CAD pull |
| HEALTH | Source degraded — last verified 2026-08-22 remains in use |

### San Jacinto — `san_jacinto_cad` — FIPS 48407

| Field | Value |
|---|---|
| SOURCE | SanJacintoCADWebService FeatureServer |
| SOURCE TYPE | ArcGIS |
| SOURCE IDENTITY | `prop_id` |
| EXPECTED | ~35,148 unique |
| ACTUAL | DB 35,158 / unique 35,148 |
| LAST SUCCESSFUL FULL PULL | 2026-08-25T08:23:08Z |
| HEALTH | Healthy |

### Liberty — `liberty_cad` — FIPS 48291

| Field | Value |
|---|---|
| SOURCE | LibertyCADWebService FeatureServer |
| SOURCE TYPE | ArcGIS |
| SOURCE IDENTITY | `prop_id` |
| EXPECTED | ~114,497 unique |
| ACTUAL | DB 114,501 / unique 114,497 |
| LAST SUCCESSFUL FULL PULL | 2026-08-22T08:16:43Z |
| LAST ATTEMPT | 2026-08-26T08:21:24Z |
| FAILURE | `canceling statement due to statement timeout` |
| RETRY | Daily Action retries; timeout persists |
| HEALTH | Source degraded / delayed — last verified 2026-08-22 remains in use |

### Walker — `walker_cad` — FIPS 48471

| Field | Value |
|---|---|
| SOURCE | Walker BIS FeatureServer (see `scripts/cad-sources.mjs`) |
| SOURCE TYPE | ArcGIS |
| SOURCE IDENTITY | `prop_id` |
| EXPECTED | ~35,586 unique |
| ACTUAL | DB 35,601 |
| LAST SUCCESSFUL FULL PULL | 2026-08-26T08:26:29Z |
| HEALTH | Healthy |

Montgomery (`montgomery_cad`) is optional for Cleveland and is **not** a Phase 2 launch county. Do not expand coverage here.

## Ops visibility

Internal only (Story Pro listing / CAD panel): Healthy / Delayed / Source degraded / Partial, last verified time, counts, last error.

`/api/cad/status` was already anon-readable. Phase 2 does **not** add a public dashboard or extra public fields.

Failures are logged as `[cad-ops] …` on ingest and stored in `cad_county_status.last_error`. There is no pager/Slack hook in Phase 2 (Phase 3 infrastructure). Founders see the CAD panel + Action logs.

## Farms

`getFarmDetail` now attaches `observationReadiness`.  
“Since your last review” still uses the farm baseline vs live scan. If the county is failed / delayed / partial / building history, a banner says so. Farm workflow is unchanged.

Farm `disappeared` still means “left the farm boundary vs baseline,” not CAD absence, unless those layers are later joined.

## Ownership Stability

300–850 from observed owner-id / owner-name changes between pulls.  
**Not** credit, seller likelihood, or deed history.

No score when:

- no successive pull
- county health is `source_failed`, `partial_pull`, or `refresh_delayed`

Failed / partial / delayed counties stay `building` with `index: null`.

Replay of the same `observed_at` does not add events (ingest skip). Duplicate snapshots therefore do not add new evidence.

## CAD identity

Parcel history stays on county `source` + `prop_id`. No identity migration in Phase 2.

## Evidence tiers

KNOWN / CALCULATED / ESTIMATED / OBSERVED / VERIFY / UNKNOWN stay as-is.  
Missing stays missing. Phase 2 does not invent estimated values to fill empty UI.

## Out of scope (do not add)

- Deeds
- MLS sale history as county truth
- Generative AI
- Seller-probability scores
- New Research modes
- Corridors product expansion
- New launch counties
