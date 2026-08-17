/**
 * Armor for map zoom precision — soft ceiling, no black void, CAD lines at close zoom.
 * Founder Interpreter is build-process only (not a product).
 * Run: node scripts/test-map-zoom-precision.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const precision = read("src/lib/map-precision.ts");
assert.match(precision, /Founder Interpreter \(build process only/);
assert.match(precision, /MAP_PRECISION_MAX_ZOOM = 19/);
assert.match(precision, /MAP_STREETS_SOURCE_MAX_ZOOM = 14/);
assert.match(precision, /MAP_IMAGERY_SOURCE_MAX_ZOOM = 18/);
assert.match(precision, /MAP_PARCEL_SOURCE_MAX_ZOOM = 16/);
assert.match(precision, /PARCEL_LINE_WIDTH_EXPR/);
assert.doesNotMatch(precision, /maxZoom:\s*22/);

const style = read("src/lib/map-style.ts");
assert.match(style, /MAP_STREETS_SOURCE_MAX_ZOOM/);
assert.match(style, /MAP_IMAGERY_SOURCE_MAX_ZOOM/);
assert.match(style, /maxzoom: MAP_STREETS_SOURCE_MAX_ZOOM/);
assert.match(style, /maxzoom: MAP_IMAGERY_SOURCE_MAX_ZOOM/);

const research = read(
  "src/components/broker/intelligence/ShiResearchMap.tsx",
);
assert.match(research, /MAP_PRECISION_MAX_ZOOM/);
assert.match(research, /MAP_PARCEL_SOURCE_MAX_ZOOM/);
assert.match(research, /PARCEL_LINE_WIDTH_EXPR/);
assert.doesNotMatch(research, /maxZoom:\s*22/);

const market = read("src/components/marketplace/MarketplaceMap.tsx");
assert.match(market, /MAP_PRECISION_MAX_ZOOM/);
assert.match(market, /PARCEL_LINE_WIDTH_EXPR/);

const listing = read("src/components/broker/ListingCadMap.tsx");
assert.match(listing, /MAP_PRECISION_MAX_ZOOM/);
assert.match(listing, /PARCEL_LINE_WIDTH_EXPR/);

const doc = read("docs/shi/ARCHIE-LAUNCH7-MAP.md");
assert.match(doc, /Map zoom precision/);
assert.match(doc, /Founder Interpreter/);
assert.match(doc, /test:map-zoom-precision/);

const pkg = read("package.json");
assert.match(pkg, /test:map-zoom-precision/);

console.log("map-zoom-precision armor: ok");
