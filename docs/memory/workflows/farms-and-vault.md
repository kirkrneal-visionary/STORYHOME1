# Contract — Farms and Study Vault

**Who / why:** Story Pro researching a drawn market.

**Intended:** Same draw/analyze start. Then different jobs.

- **Farms:** watch a territory; review CAD changes since last review; optional map photo; Open on map restores the drawing.
- **Study Vault:** folders of studies + map photos; reopen into Research. Does not watch the county.

**Do not collapse these into one tab.**

## Preconditions

- Story Pro session (`requireStoryPro`)
- County selected; frame analyzed before save

## Save Farm

- **Input:** name, county, boundary, camera, optional JPEG
- **Source of truth:** `shi_farms` + `shi_farm_baselines`; photo path `shi-studies/{agent}/farms/{id}.jpg` (no thumbnail column)
- **Durable:** farm row + baseline parcels
- **Success:** farm exists; stay or go to Farms list
- **Snap failure:** farm must still save (PR 193)
- **Retry / duplicate:** creating again makes another farm (no unique name). **Observed.**
- **Refresh:** list reload; old farms without a file show Photo pending — **defect for old rows, not a missing RLS paste**
- **Tests:** `scripts/test-farm-map-memory.ts`, `test-shi-farms.mjs`, `test-vault-snap-save.ts` (snap must not cancel save), `test-wave-2-isolation.ts` (Pro B / office cannot read Pro A’s farm)
- **Unverified:** live JPEG appearing after a founder save on eqmg

## Save Vault

- **Input:** name, folder, boundary, analysis, optional JPEG
- **Source of truth:** `shi_study_folders` / `shi_market_frames` / `shi_frame_snapshots`
- **Durable:** frame + snapshot; photo optional
- **Success:** study remains after a new read; **Save stays on the map**
- **Open Vault:** separate control (`Study Vault →`)
- **Snap / storage failure:** study remains (`saveMarketFrame` does not delete the frame if upload fails)
- **Reopen:** `queueOpenSavedFrame` + `loadSavedFrame` / `?openFrame=`
- **Tests:** `test-vault-snap-save.ts`, vault error formatter hides `LngLatLike`
- **Unverified:** end-to-end Vault card photo on production for a new save

## Related

- Analyze: `POST /api/shi/area` — server recomputes parcels; never trust client totals. Wave 3 drops a late result if the county or drawing changed (`analyze-context.ts`). Save stays off until the shown analysis matches the active frame.
- Corridors handoff uses the same open-frame queue; do not rebuild Corridors
