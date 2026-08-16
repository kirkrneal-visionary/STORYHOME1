/**
 * Armor for ARCHIE-LAUNCH7-MAP L7-3 — CDN/R2 ops + expand playbook (no browser).
 * Run: node scripts/test-launch7-map-l3.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/ARCHIE-LAUNCH7-MAP.md");
assert.match(doc, /L7-3/);
assert.match(doc, /CDN|R2/);
assert.match(doc, /refresh|publish/i);
assert.match(doc, /expand/i);
assert.match(doc, /NEXT_PUBLIC_LAUNCH7_CDN_BASE/);

const launch = read("src/lib/shi/launch7-map.ts");
assert.match(launch, /l7-3/);
assert.match(launch, /launch7CdnBase/);
assert.match(launch, /cdnStreetsTileTemplate/);
assert.match(launch, /launch7ServeMode/);

const ops = read("src/lib/shi/launch7-ops.ts");
assert.match(ops, /launch7OpsStatus/);
assert.match(ops, /planLaunch7Expand/);
assert.match(ops, /estimateTileCount/);
assert.match(ops, /LAUNCH7_R2_/);

const statusRoute = read("src/app/api/map/launch7/status/route.ts");
assert.match(statusRoute, /launch7OpsStatus/);

const publish = read("scripts/publish-launch7-tiles.mjs");
assert.match(publish, /LAUNCH7_R2_ACCOUNT_ID/);
assert.match(publish, /dry-run|dryRun/);
assert.match(publish, /s3.*sync|aws/);

const refresh = read("scripts/refresh-launch7-tiles.mjs");
assert.match(refresh, /build-launch7-tiles/);
assert.match(refresh, /publish-launch7-tiles/);

const expand = read("scripts/plan-launch7-expand.mjs");
assert.match(expand, /playbook/);
assert.match(expand, /--add/);

const style = read("src/lib/map-style.ts");
assert.match(style, /resolveStreetsVectorTemplate|owned-vector-api|cdn/);
assert.doesNotMatch(style, /tile\.openstreetmap\.org/);
assert.doesNotMatch(style, /mapbox\.com|maps\.googleapis\.com/i);

const pkg = read("package.json");
assert.match(pkg, /test:launch7-map-l3/);
assert.match(pkg, /publish:launch7-tiles/);
assert.match(pkg, /refresh:launch7-tiles/);
assert.match(pkg, /plan:launch7-expand/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /L7-3|CDN|R2/);

assert.ok(existsSync(join(root, "docs/shi/ARCHIE-LAUNCH7-MAP.md")));

console.log("launch7-map-l3 armor: ok");
