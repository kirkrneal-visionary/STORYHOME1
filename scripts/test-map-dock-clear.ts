/**
 * Marketplace map chrome sits above the dock — not on Suites/Search.
 * Isolated. No browser. No production data.
 * Run: node --experimental-strip-types scripts/test-map-dock-clear.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const map = read("src/components/marketplace/MarketplaceMap.tsx");
assert.match(map, /data-marketplace-map/);
assert.match(map, /data-map-expanded/);
assert.match(map, /story-map-dock-hint/);
assert.doesNotMatch(map, /story-map-dock-hint[^>]*bottom-3/);
assert.doesNotMatch(map, /absolute bottom-3 left-3 z-\[500\]/);

const view = read("src/components/MarketplaceView.tsx");
assert.match(view, /pb-\[var\(--story-bottom-clearance\)\]/);
assert.match(view, /<MarketplaceMap[\s\S]*?className="h-full"/);
assert.doesNotMatch(map, /--story-bottom-clearance/);

const css = read("src/app/globals.css");
assert.match(
  css,
  /\[data-marketplace-map\]\s*\{[\s\S]*?--map-dock-lift:\s*var\(--story-bottom-clearance\)/,
);
assert.match(
  css,
  /\[data-marketplace-map\]\[data-map-expanded\]\s*\{[\s\S]*?--map-dock-lift:\s*0px/,
);
assert.match(
  css,
  /\.story-map-dock-hint\s*\{[\s\S]*?bottom:\s*calc\(var\(--map-dock-lift\) \+ 0\.75rem\)/,
);
assert.match(
  css,
  /\.maplibregl-ctrl-bottom-left[\s\S]*?bottom:\s*calc\(var\(--map-dock-lift\) \+ 0\.5rem\)/,
);
assert.match(css, /Do not pad the map/);
assert.match(css, /Do not darken the map/);
assert.match(css, /never a solid black header band/);

console.log("map-dock-clear: ok");
