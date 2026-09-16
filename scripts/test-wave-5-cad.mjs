/**
 * Wave 5 — county refresh reliability.
 * Isolated. No production CAD writes.
 * Run: node scripts/test-wave-5-cad.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LAUNCH_COUNTY_KEYS } from "./cad-sources.mjs";
import {
  WAVE5_OPTIONAL_COUNTY,
  isUnderFetched,
  nextCheckpointOffset,
  refreshJobOutcome,
  resumeOffset,
  shouldMarkAbsences,
  shouldPromoteLastSuccess,
} from "./cad-refresh-policy.mjs";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

assert.equal(isUnderFetched(100, 1000), true);
assert.equal(isUnderFetched(900, 1000), false);
assert.equal(isUnderFetched(100, 100), false);
assert.equal(isUnderFetched(null, 10000), false);

assert.equal(
  shouldPromoteLastSuccess({
    ok: true,
    ingestCapped: false,
    underFetched: false,
    incomplete: false,
  }),
  true,
);
assert.equal(
  shouldPromoteLastSuccess({
    ok: true,
    ingestCapped: false,
    underFetched: false,
    incomplete: true,
  }),
  false,
);
assert.equal(
  shouldPromoteLastSuccess({
    ok: false,
    ingestCapped: false,
    underFetched: false,
    incomplete: false,
  }),
  false,
);
assert.equal(
  shouldPromoteLastSuccess({
    ok: true,
    ingestCapped: true,
    underFetched: false,
    incomplete: false,
  }),
  false,
);
assert.equal(
  shouldPromoteLastSuccess({
    ok: true,
    ingestCapped: false,
    underFetched: true,
    incomplete: false,
  }),
  false,
);

assert.equal(
  shouldMarkAbsences({
    all: true,
    ingestCapped: false,
    underFetched: false,
    incomplete: false,
    resumed: false,
  }),
  true,
);
assert.equal(
  shouldMarkAbsences({
    all: true,
    ingestCapped: false,
    underFetched: false,
    incomplete: false,
    resumed: true,
  }),
  false,
);
assert.equal(
  shouldMarkAbsences({
    all: true,
    ingestCapped: false,
    underFetched: true,
    incomplete: false,
    resumed: false,
  }),
  false,
);

assert.equal(resumeOffset(4000, false), 4000);
assert.equal(resumeOffset(4000, true), 0);
assert.equal(resumeOffset(null, false), 0);
assert.equal(nextCheckpointOffset(2000, 2000), 4000);

assert.equal(
  refreshJobOutcome([
    { key: "polk_cad", action: "arcgis", code: 0 },
    { key: "liberty_cad", action: "arcgis", code: 1 },
  ]).kind,
  "partial",
);
assert.equal(
  refreshJobOutcome([
    { key: "polk_cad", action: "arcgis", code: 0 },
    { key: "liberty_cad", action: "arcgis", code: 1 },
  ]).exitCode,
  0,
);
assert.equal(
  refreshJobOutcome([
    { key: "liberty_cad", action: "arcgis", code: 1 },
    { key: "angelina_cad", action: "arcgis", code: 1 },
  ]).exitCode,
  1,
);
assert.equal(
  refreshJobOutcome([
    { key: "polk_cad", action: "skip_fresh", code: 0 },
    { key: "liberty_cad", action: "arcgis", code: 1 },
  ]).kind,
  "partial",
);

assert.ok(!LAUNCH_COUNTY_KEYS.includes(WAVE5_OPTIONAL_COUNTY));
assert.ok(!LAUNCH_COUNTY_KEYS.includes("montgomery_cad"));

const ingest = read("scripts/ingest-cad.mjs");
assert.match(ingest, /fetchAndUpsertArcgisPages/);
assert.match(ingest, /writeCheckpoint/);
assert.match(ingest, /shouldPromoteLastSuccess/);
assert.match(ingest, /shouldMarkAbsences/);
assert.match(ingest, /Incomplete page run/);
assert.doesNotMatch(ingest, /payload\.last_success_at = now;\s*payload\.last_error/);

const refresh = read("scripts/refresh-cad.mjs");
assert.match(refresh, /refreshJobOutcome/);
assert.match(refresh, /PARTIAL/);
assert.match(refresh, /process\.exitCode = outcome\.exitCode/);

const workflow = read(".github/workflows/cad-refresh.yml");
assert.match(workflow, /concurrency:/);
assert.match(workflow, /group: cad-refresh/);
assert.match(workflow, /cancel-in-progress: false/);

const sql = read("supabase/migrations/0055_cad_refresh_checkpoint.sql");
assert.match(sql, /ingest_checkpoint_offset/);
assert.match(sql, /Does not delete parcels/);
assert.doesNotMatch(sql, /truncate /i);
assert.doesNotMatch(sql, /delete from public\.county_parcels/i);

const sources = read("scripts/cad-sources.mjs");
assert.match(sources, /optional: true/);
assert.match(sources, /montgomery_cad/);

console.log("wave-5-cad: ok");
