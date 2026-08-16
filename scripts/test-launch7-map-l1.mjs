/**
 * Armor for ARCHIE-LAUNCH7-MAP L7-1 — free-world basemap contract (no browser).
 * Run: node scripts/test-launch7-map-l1.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/ARCHIE-LAUNCH7-MAP.md");
assert.match(doc, /L7-1/);
assert.match(doc, /OpenFreeMap|free-world/i);
assert.match(doc, /MapLibre/);
assert.match(doc, /Out of scope[\s\S]*Mapbox as primary/);
assert.match(doc, /Out of scope[\s\S]*Google Maps JS as Research/);
assert.match(doc, /NEXT_PUBLIC_LAUNCH7_STREETS_TILES/);
assert.match(doc, /Polk|Angelina|Walker/);

const launch = read("src/lib/shi/launch7-map.ts");
assert.match(launch, /l7-1/);
assert.match(launch, /launch7UnionBbox/);
assert.match(launch, /NEXT_PUBLIC_LAUNCH7_STREETS_TILES/);
assert.match(launch, /NEXT_PUBLIC_LAUNCH7_SATELLITE_TILES/);
assert.match(launch, /LAUNCH7_MAP_HONESTY/);

const style = read("src/lib/map-style.ts");
assert.match(style, /openfreemap-liberty/);
assert.match(style, /MAP_SOVEREIGNTY_VERSION|l7-1/);
assert.match(style, /ownedStreetsTileTemplate|LAUNCH7_STREETS/);
assert.doesNotMatch(style, /tile\.openstreetmap\.org/);
assert.doesNotMatch(style, /demotiles\.maplibre\.org\/font/);
assert.doesNotMatch(style, /mapbox\.com|maps\.googleapis\.com/i);

const liberty = read("src/lib/map-styles/openfreemap-liberty.json");
assert.match(liberty, /openmaptiles/);
assert.match(liberty, /tiles\.openfreemap\.org/);

const research = read("src/components/broker/intelligence/ShiResearchMap.tsx");
assert.match(research, /data-map-sovereignty/);
assert.match(research, /data-map-free-world/);

const corridors = read("src/components/broker/intelligence/ShiCorridorsMap.tsx");
assert.match(corridors, /data-map-sovereignty/);

const pkg = read("package.json");
assert.match(pkg, /test:launch7-map-l1/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /ARCHIE-LAUNCH7-MAP|L7-1/);

console.log("launch7-map-l1 armor: ok");
