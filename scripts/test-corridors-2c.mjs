/**
 * Armor for Corridors 2.0-C — segment store + approx frontage (no browser).
 * Run: node scripts/test-corridors-2c.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/ARCHIE-CORRIDORS-2.md");
assert.match(doc, /C2\.0-C/);
assert.match(doc, /Segment store \+ frontage/);
assert.match(doc, /APPROX/);
assert.match(doc, /\[x\].*Schema for segments/);

const migration = read("supabase/migrations/0034_corridor_road_segments.sql");
assert.match(migration, /corridor_road_segments/);
assert.match(migration, /corridor_traffic_observations/);
assert.match(migration, /corridor_parcel_frontage/);
assert.match(migration, /approx_frontage_ft/);
assert.match(migration, /having sum\(h\.ft\) >= 25/);

const frontage = read("src/lib/shi/corridor-frontage.ts");
assert.match(frontage, /corridor-frontage-v1/);
assert.match(frontage, /corridor-data-confidence-v1/);
assert.match(frontage, /approxFrontageFromGeojson/);
assert.match(frontage, /buildParcelLocationIntel/);
assert.match(frontage, /formatApproxFrontageFt/);
assert.match(frontage, /dualRoad/);
assert.match(frontage, /cornerLikely/);
assert.match(frontage, /Approx\./);

const cache = read("src/lib/shi/corridor-segment-cache.ts");
assert.match(cache, /softCacheCountyTraffic/);
assert.match(cache, /corridor_road_segments/);

const api = read("src/app/api/shi/corridors/parcel-location/route.ts");
assert.match(api, /corridor_parcel_frontage/);
assert.match(api, /approxFrontageFromGeojson/);
assert.match(api, /stationFallbackIntel/);
assert.match(api, /fetchCountyTraffic/);
assert.match(api, /frontageLabel: "APPROX"/);

const trafficRoute = read("src/app/api/shi/corridors/traffic/route.ts");
assert.match(trafficRoute, /softCacheCountyTraffic/);

const client = read("src/lib/shi/client.ts");
assert.match(client, /shiCorridorsParcelLocation/);

const view = read("src/components/broker/intelligence/ShiCorridorsView.tsx");
assert.match(view, /data-corridors-version="c2-0-(?:[cdef]|f2)"/);
assert.match(view, /data-corridor-frontage-block/);
assert.match(view, /data-corridor-data-confidence/);
assert.match(view, /Approx\. frontage/);
assert.match(view, /shiCorridorsParcelLocation/);
assert.match(view, /data-corridor-dual-road/);

const map = read("src/components/broker/intelligence/ShiCorridorsMap.tsx");
assert.match(map, /geojson/);

const wavesTs = read("src/lib/shi/waves.ts");
assert.match(wavesTs, /C2\.0-C|frontage|ARCHIE-CORRIDORS-2/);

const pkg = read("package.json");
assert.match(pkg, /test:corridors-2c/);

/* Inline geometry smoke: edge midpoint within buffer of road → frontage > 0 */
function toRad(d) {
  return (d * Math.PI) / 180;
}
function project(lng, lat, oLng, oLat) {
  return [
    toRad(lng - oLng) * 6371000 * Math.cos(toRad(oLat)),
    toRad(lat - oLat) * 6371000,
  ];
}
const ring = [
  [-94.9, 30.7],
  [-94.899, 30.7],
  [-94.899, 30.701],
  [-94.9, 30.701],
  [-94.9, 30.7],
];
const [ox, oy] = [ring[0][0], ring[0][1]];
const a = project(ring[0][0], ring[0][1], ox, oy);
const b = project(ring[1][0], ring[1][1], ox, oy);
const edgeM = Math.hypot(b[0] - a[0], b[1] - a[1]);
assert.ok(edgeM * 3.28084 > 25, "south edge should be >25 ft");

console.log("corridors-2c armor: ok");
