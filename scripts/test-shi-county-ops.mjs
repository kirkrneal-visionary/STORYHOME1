/**
 * Armor for ARCHIE-COUNTY-OPS-SCALE (no DB).
 * Run: node scripts/test-shi-county-ops.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

function cadCoverageHonesty(snap) {
  const db =
    snap.dbParcelCount != null && Number.isFinite(snap.dbParcelCount)
      ? Math.max(0, Math.floor(snap.dbParcelCount))
      : null;
  const unique =
    snap.sourceUniquePropIds != null &&
    Number.isFinite(snap.sourceUniquePropIds)
      ? Math.max(0, Math.floor(snap.sourceUniquePropIds))
      : null;
  const ingest =
    snap.parcelCount != null && Number.isFinite(snap.parcelCount)
      ? Math.max(0, Math.floor(snap.parcelCount))
      : null;
  const displayCount = db ?? ingest;
  if (displayCount == null || displayCount === 0) {
    return { coverage: "empty", displayCount: displayCount ?? 0 };
  }
  if (unique == null) return { coverage: "unknown", displayCount };
  const gap = Math.max(0, unique - (db ?? ingest ?? 0));
  return {
    coverage: gap <= 2 ? "complete" : "short",
    displayCount: db ?? ingest,
    gap,
  };
}

function refreshRequiresForce(opts) {
  if (opts.force) return { requireForce: false };
  const db = opts.dbParcelCount ?? 0;
  const unique = opts.sourceUniquePropIds ?? null;
  const giant = opts.giantThreshold ?? 80_000;
  if (db > 0) return { requireForce: false };
  if (opts.optional) return { requireForce: true };
  if (unique != null && unique >= giant) return { requireForce: true };
  return { requireForce: false };
}

assert.equal(
  cadCoverageHonesty({
    parcelCount: 50000,
    dbParcelCount: 48000,
    sourceUniquePropIds: 48000,
    sourceFeatureCount: 52000,
  }).coverage,
  "complete",
);

assert.equal(
  cadCoverageHonesty({
    parcelCount: 50000,
    dbParcelCount: 40000,
    sourceUniquePropIds: 48000,
    sourceFeatureCount: 52000,
  }).coverage,
  "short",
);

// Features alone never decide complete
const featHeavy = cadCoverageHonesty({
  parcelCount: 100,
  dbParcelCount: 100,
  sourceUniquePropIds: 100,
  sourceFeatureCount: 90000,
});
assert.equal(featHeavy.coverage, "complete");
assert.equal(featHeavy.displayCount, 100);

assert.equal(
  refreshRequiresForce({
    force: false,
    dbParcelCount: 0,
    optional: true,
  }).requireForce,
  true,
);
assert.equal(
  refreshRequiresForce({
    force: true,
    dbParcelCount: 0,
    optional: true,
  }).requireForce,
  false,
);
assert.equal(
  refreshRequiresForce({
    force: false,
    dbParcelCount: 0,
    sourceUniquePropIds: 120_000,
  }).requireForce,
  true,
);
assert.equal(
  refreshRequiresForce({
    force: false,
    dbParcelCount: 10_000,
    sourceUniquePropIds: 120_000,
  }).requireForce,
  false,
);

const migration = read("supabase/migrations/0031_cad_ops_scale.sql");
assert.match(migration, /db_parcel_count/);
assert.match(migration, /source_unique_prop_ids/);
assert.match(migration, /absence_cap_hit/);
assert.match(migration, /county_parcel_change_events_source_observed_idx/);

const ingest = read("scripts/ingest-cad.mjs");
assert.match(ingest, /softIngestLimit/);
assert.match(ingest, /absenceCapHit/);
assert.match(ingest, /db_parcel_count/);
assert.match(ingest, /post-dedupe/i);

const audit = read("scripts/audit-cad.mjs");
assert.match(audit, /persistAudit/);
assert.match(audit, /last_audit_at/);
assert.match(audit, /never use as COMPLETE universe/i);

const refresh = read("scripts/refresh-cad.mjs");
assert.match(refresh, /blocked_force/);
assert.match(refresh, /refreshRequiresForce/);

const panel = read("src/components/broker/CadCountyStatusPanel.tsx");
assert.match(panel, /cadCoverageHonesty/);

const lib = read("src/lib/shi/county-ops-scale.ts");
assert.match(lib, /Never treat ArcGIS feature count/);

console.log("shi-county-ops armor: ok");
