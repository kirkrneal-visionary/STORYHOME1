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
assert.match(precision, /absolutizeMapTileTemplate/);
assert.match(precision, /mapLibreTransformRequest/);
assert.doesNotMatch(precision, /maxZoom:\s*22/);

const style = read("src/lib/map-style.ts");
assert.match(style, /MAP_STREETS_SOURCE_MAX_ZOOM/);
assert.match(style, /MAP_IMAGERY_SOURCE_MAX_ZOOM/);
assert.match(style, /maxzoom: MAP_STREETS_SOURCE_MAX_ZOOM/);
assert.match(style, /maxzoom: MAP_IMAGERY_SOURCE_MAX_ZOOM/);
assert.match(style, /absolutizeMapTileTemplate/);
assert.match(style, /absolutizeMapTileTemplate\(\s*resolveStreetsVectorTemplate/);
assert.match(style, /absolutizeMapTileTemplate\(resolveSatelliteTileTemplate/);
assert.match(style, /absolutizeMapTileTemplate\(streetsRasterTmpl\)/);
assert.match(style, /sanitizeLibertyLayer|sanitizeLibertyExpr/);
assert.match(style, /coalesce/);
/** Pure absolutize mirror — relative paths become origin-absolute; https stays. */
function absolutizeMapTileTemplate(tmpl, origin = "https://example.test") {
  if (!tmpl) return tmpl;
  if (/^https?:\/\//i.test(tmpl)) return tmpl;
  const path = tmpl.startsWith("/") ? tmpl : `/${tmpl}`;
  return `${origin}${path}`;
}

assert.equal(
  absolutizeMapTileTemplate("/api/map/launch7/streets/{z}/{x}/{y}"),
  "https://example.test/api/map/launch7/streets/{z}/{x}/{y}",
);
assert.equal(
  absolutizeMapTileTemplate("https://cdn.example/tiles/{z}/{x}/{y}.pbf"),
  "https://cdn.example/tiles/{z}/{x}/{y}.pbf",
);

function mapLibreTransformRequest(url, origin = "https://example.test") {
  if (!url || /^https?:\/\//i.test(url) || url.startsWith("blob:") || url.startsWith("data:")) {
    return { url };
  }
  if (url.startsWith("/")) {
    return { url: absolutizeMapTileTemplate(url, origin) };
  }
  return { url };
}

assert.equal(
  mapLibreTransformRequest("/api/map/launch7/imagery/{z}/{x}/{y}").url,
  "https://example.test/api/map/launch7/imagery/{z}/{x}/{y}",
);
assert.equal(
  mapLibreTransformRequest("https://cdn.example/x.jpg").url,
  "https://cdn.example/x.jpg",
);

/** Liberty null-sanitize mirror */
function sanitizeLibertyExpr(expr) {
  const NUMERIC = new Set(["ramp", "oneway", "admin_level", "rank", "ref_length"]);
  if (!Array.isArray(expr)) return expr;
  if (expr[0] === "get" && typeof expr[1] === "string" && NUMERIC.has(expr[1])) {
    return ["coalesce", ["get", expr[1]], 0];
  }
  return expr.map(sanitizeLibertyExpr);
}

assert.deepEqual(sanitizeLibertyExpr(["==", ["get", "ramp"], 1]), [
  "==",
  ["coalesce", ["get", "ramp"], 0],
  1,
]);
assert.deepEqual(sanitizeLibertyExpr(["==", ["get", "class"], "motorway"]), [
  "==",
  ["get", "class"],
  "motorway",
]);

const launch = read("src/lib/shi/launch7-map.ts");
assert.match(launch, /CDN skipped until R2 CORS|LAUNCH7_STREETS_API_TEMPLATE/);
assert.doesNotMatch(
  launch.split("resolveStreetsVectorTemplate")[1]?.split("export ")[0] ?? "",
  /cdnStreetsTileTemplate\(\)/,
);

const research = read(
  "src/components/broker/intelligence/ShiResearchMap.tsx",
);
assert.match(research, /MAP_PRECISION_MAX_ZOOM/);
assert.match(research, /mapLibreTransformRequest/);
assert.match(research, /transformRequest:\s*mapLibreTransformRequest/);
assert.doesNotMatch(research, /maxZoom:\s*22/);

const corridors = read(
  "src/components/broker/intelligence/ShiCorridorsMap.tsx",
);
assert.match(corridors, /MAP_PRECISION_MAX_ZOOM/);
assert.match(corridors, /mapLibreTransformRequest/);
assert.doesNotMatch(corridors, /maxZoom:\s*22/);

const market = read("src/components/marketplace/MarketplaceMap.tsx");
assert.match(market, /MAP_PRECISION_MAX_ZOOM/);
assert.match(market, /mapLibreTransformRequest/);
assert.match(market, /transformRequest:\s*mapLibreTransformRequest/);

const listing = read("src/components/broker/ListingCadMap.tsx");
assert.match(listing, /MAP_PRECISION_MAX_ZOOM/);
assert.match(listing, /mapLibreTransformRequest/);

const doc = read("docs/shi/ARCHIE-LAUNCH7-MAP.md");
assert.match(doc, /Map zoom precision/);
assert.match(doc, /Founder Interpreter/);
assert.match(doc, /test:map-zoom-precision/);

const pkg = read("package.json");
assert.match(pkg, /test:map-zoom-precision/);

console.log("map-zoom-precision armor: ok");
