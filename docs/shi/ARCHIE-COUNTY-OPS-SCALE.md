# ARCHIE-COUNTY-OPS-SCALE

## Promise
Make multi-county CAD expansion safer with **truthful coverage counts**, ingest/absence caps, and feed indexes — without a fake ops dashboard or inventing per-county physical tables.

## Ships
- Migration `0031_cad_ops_scale.sql` — `db_parcel_count`, `source_unique_prop_ids`, `source_feature_count`, `last_audit_at`, `absence_cap_hit`, `ingest_capped` + feed/readiness indexes
- Ingest writes **post-dedupe** `parcel_count` + live DB count; surfaces absence/ingest caps
- Soft row budget via `CAD_MAX_INGEST_ROWS` / `--limit` (capped ≠ COMPLETE)
- `cad:audit` persists audit fields onto `cad_county_status` (+ `--json`)
- Refresh preflight: skip fresh; warn on audit short; block optional/giant empty first loads without `--force`
- Status panel + `/api/cad/status` coverage honesty line
- Armor: `npm run test:shi-county-ops`

## Honesty
- ArcGIS **feature** count ≠ parcel universe (dupes inflate features)
- **Unique prop_ids** decide COMPLETE (gap ≤ 2 vs DB)
- Absence cap hit / ingest capped must stay visible — never silent “done”
- Empty/stale ≠ quiet market (OBS-OPS still owns that language)
- Do not invent heap/TOAST GB figures until storage Query A–C are pasted

## Ops
1. Apply `supabase/migrations/0031_cad_ops_scale.sql` in the [SQL editor](https://supabase.com/dashboard/project/ksvllgzsnzyahqsjuove/sql/new).
2. Run `npm run cad:audit` (service role) to seed unique/DB fields.
3. Optional: `CAD_MAX_INGEST_ROWS=5000` for safe probe loads on new counties.

## Out of scope
- Loading Montgomery / 38 counties in this wave  
- Dropping dual geojson store  
- Admin analytics UI / fake dashboards  
- Catalog GB report without SQL paste  
