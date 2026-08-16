/**
 * Armor for ARCHIE-LAUNCH7-MAP L7-2 — owned tile API + cache (no browser).
 * Run: node scripts/test-launch7-map-l2.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/ARCHIE-LAUNCH7-MAP.md");
assert.match(doc, /L7-2/);
assert.match(doc, /\/api\/map\/launch7/);
assert.match(doc, /owned|cache/i);
assert.match(doc, /USGS|imagery/i);

const launch = read("src/lib/shi/launch7-map.ts");
assert.match(launch, /L7-2|l7-[23]/);
assert.match(launch, /LAUNCH7_STREETS_API_TEMPLATE/);
assert.match(launch, /LAUNCH7_IMAGERY_API_TEMPLATE/);
assert.match(launch, /resolveStreetsVectorTemplate/);

const tiles = read("src/lib/shi/launch7-tiles.ts");
assert.match(tiles, /getLaunch7StreetsTile/);
assert.match(tiles, /getLaunch7ImageryTile/);
assert.match(tiles, /tileIntersectsLaunch7/);
assert.match(tiles, /openfreemap\.org\/planet/);
assert.match(tiles, /USGSImageryOnly/);

const streetsRoute = read(
  "src/app/api/map/launch7/streets/[z]/[x]/[y]/route.ts",
);
assert.match(streetsRoute, /getLaunch7StreetsTile/);
assert.match(streetsRoute, /X-Launch7-Tile-Source/);

const imageryRoute = read(
  "src/app/api/map/launch7/imagery/[z]/[x]/[y]/route.ts",
);
assert.match(imageryRoute, /getLaunch7ImageryTile/);

const style = read("src/lib/map-style.ts");
assert.match(style, /owned-vector-api|LAUNCH7_STREETS_API|resolveStreetsVectorTemplate/);
assert.match(style, /resolveSatelliteTileTemplate|launch7\/imagery/);
assert.doesNotMatch(style, /tile\.openstreetmap\.org/);
assert.doesNotMatch(style, /mapbox\.com|maps\.googleapis\.com/i);

const research = read("src/components/broker/intelligence/ShiResearchMap.tsx");
assert.match(research, /data-map-sovereignty/);
assert.match(research, /data-map-free-world/);

const pkg = read("package.json");
assert.match(pkg, /test:launch7-map-l2/);
assert.match(pkg, /build:launch7-tiles/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /L7-2|owned tile|l7-2/);

assert.ok(existsSync(join(root, "data/shi/tiles/.gitkeep")));

console.log("launch7-map-l2 armor: ok");
