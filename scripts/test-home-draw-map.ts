/**
 * Homepage Draw map: the drawn area belongs to the search (URL + session row), never saved data.
 * Run: npm run test:home-draw-map
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listingInBoundary } from "../src/lib/geo.ts";
import {
  SEARCH_AREA_MAX_POINTS,
  SEARCH_AREA_PARAM,
  decodeSearchArea,
  encodeSearchArea,
  searchAreaBounds,
  searchAreaFromPoints,
} from "../src/lib/search/area.ts";
import {
  areaFromSearchParams,
  filtersFromSearchParams,
  hasMarketplaceHandoffParams,
} from "../src/lib/search/url.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

// Polk County loop: Livingston inside, Lufkin outside.
const polk = searchAreaFromPoints([
  { lat: 30.6, lng: -95.2 },
  { lat: 31.05, lng: -95.2 },
  { lat: 31.05, lng: -94.7 },
  { lat: 30.6, lng: -94.7 },
]);
assert.ok(polk);
assert.equal(polk.type, "polygon");
assert.equal(polk.points.length, 4);

const encoded = encodeSearchArea(polk);
assert.equal(encoded, "30.6_-95.2_31.05_-95.2_31.05_-94.7_30.6_-94.7");
assert.match(encoded, /^[-\d._]+$/, "the URL value never needs escaping");
assert.deepEqual(decodeSearchArea(encoded), polk);
assert.deepEqual(searchAreaBounds(polk), [-95.2, 30.6, -94.7, 31.05]);

assert.equal(listingInBoundary({ lat: 30.711, lng: -94.933 }, polk), true);
assert.equal(listingInBoundary({ lat: 31.338, lng: -94.729 }, polk), false);

// Rounded, de-duplicated, closing vertex dropped, capped.
const messy = searchAreaFromPoints([
  { lat: 30.123456789, lng: -95.987654321 },
  { lat: 30.123456789, lng: -95.987654321 },
  { lat: 30.5, lng: -95.5 },
  { lat: 30.2, lng: -95.1 },
  { lat: 30.123456789, lng: -95.987654321 },
]);
assert.deepEqual(messy?.points, [
  { lat: 30.12346, lng: -95.98765 },
  { lat: 30.5, lng: -95.5 },
  { lat: 30.2, lng: -95.1 },
]);
const dense = searchAreaFromPoints(
  Array.from({ length: 400 }, (_, i) => {
    const t = (2 * Math.PI * i) / 400;
    return { lat: 30.8 + 0.2 * Math.sin(t), lng: -95 + 0.2 * Math.cos(t) };
  }),
);
assert.equal(dense?.points.length, SEARCH_AREA_MAX_POINTS);
assert.ok(encodeSearchArea(dense!).length < 2000, "a capped area keeps the link short");

// Never guessed: anything malformed is no area at all.
assert.equal(searchAreaFromPoints([{ lat: 30.6, lng: -95.2 }, { lat: 31, lng: -95 }]), null);
for (const bad of [
  "",
  "30.6_-95.2_31.05_-95.2",
  "30.6_-95.2_31.05_-95.2_31.05",
  "30.6_-95.2_31.05_-95.2_abc_-94.7",
  "0x1E_-95.2_31.05_-95.2_31.05_-94.7",
  "3e1_-95.2_31.05_-95.2_31.05_-94.7",
  "91_-95.2_31.05_-95.2_31.05_-94.7",
  "0_0_31.05_-95.2_31.05_-94.7",
  "30.6__-95.2_31.05_-95.2_31.05",
  `${"30.6_-95.2_".repeat(400)}31_-95`,
]) {
  assert.equal(decodeSearchArea(bad), null, `rejects ${bad.slice(0, 40)}`);
}
assert.equal(decodeSearchArea(null), null);
assert.equal(decodeSearchArea(42), null);

// The area is a marketplace handoff key; it never leaks into filters.
const params = new URLSearchParams({ intent: "sale", [SEARCH_AREA_PARAM]: encoded });
assert.equal(SEARCH_AREA_PARAM, "area");
assert.equal(hasMarketplaceHandoffParams(new URLSearchParams({ area: encoded })), true);
assert.deepEqual(areaFromSearchParams(params), polk);
assert.equal(areaFromSearchParams(new URLSearchParams("intent=sale")), null);
assert.equal(areaFromSearchParams(new URLSearchParams("area=nope")), null);
assert.deepEqual(
  filtersFromSearchParams(params),
  filtersFromSearchParams(new URLSearchParams({ intent: "sale" })),
);

const area = read("src/lib/search/area.ts");
assert.doesNotMatch(area, /supabase|fetch\(|localStorage|sessionStorage/, "pure search state, no saved data");

// Homepage hub: Draw map sits next to Filters with Filters' look and reuses its frame.
const hub = read("src/components/home/HomeSearchHub.tsx");
assert.match(hub, /const ROUND_TRIGGER_CLASS =\s*"story-press relative inline-flex [^"]*rounded-full border border-hairline text-paper/);
assert.match(hub, /className=\{cn\("story-home-filters-trigger", ROUND_TRIGGER_CLASS\)\}/);
assert.match(hub, /className=\{cn\("story-home-draw-trigger", ROUND_TRIGGER_CLASS\)\}/);
assert.match(hub, /data-draw-map-trigger=""/);
assert.match(hub, /<span>Draw<\/span>\s*<span>map<\/span>/);
assert.match(hub, /grid-cols-\[auto_auto_1fr\]/);
assert.match(hub, /data-mode="map"[\s\S]{0,200}inert=\{view !== "map" \? true : undefined\}/);
assert.match(hub, /ref=\{advancedRef\}[\s\S]{0,80}data-mode="advanced"/);
assert.match(hub, /new ResizeObserver\(sync\)/);
assert.match(hub, /style=\{panelHeight \? \{ height: panelHeight \} : undefined\}/);
assert.match(hub, /function applyMap\(\) \{\s*onArea\(draftArea\);\s*setView\("search"\);/);
assert.match(hub, /function cancelMap\(\) \{\s*setDraftArea\(area\);\s*setView\("search"\);/);
assert.match(hub, /onClear=\{\(\) => setDraftArea\(null\)\}/);
assert.match(hub, /dynamic\(\s*\(\) => import\("@\/components\/home\/HomeDrawMap"\)/);
assert.doesNotMatch(hub, /createPortal|aria-modal="true"/);

// Map: the site's MapLibre style and shared freehand engine, no new map library.
const drawMap = read("src/components/home/HomeDrawMap.tsx");
assert.match(drawMap, /from "maplibre-gl"/);
assert.doesNotMatch(drawMap, /leaflet|mapbox-gl|@mapbox|google/i);
for (const shared of [
  "buildStoryMapStyle",
  "mapLibreTransformRequest",
  "launch7UnionBbox",
  "freehandPointerDown",
  "freehandPointerMove",
  "freehandSealPoints",
  "freehandForceSeal",
  "buildFreehandGeoJSON",
  "searchAreaFromPoints",
]) {
  assert.match(drawMap, new RegExp(`\\b${shared}\\b`), `reuses ${shared}`);
}
assert.match(drawMap, /surface\.style\.touchAction = "none"/, "a drawing finger never scrolls the page");
assert.match(drawMap, /touches\.length > 1\) \{\s*reset\(\);/, "two fingers pinch-zoom instead of drawing");
assert.match(drawMap, /window\.addEventListener\("mouseup", finish\)/);
assert.match(drawMap, /data-no-swipe-back/);
assert.match(drawMap, /MIN_AREA_PX2/);

// Hero: the area rides on the main Search only; city shortcuts stay plain city searches.
const hero = read("src/components/home/HomeSearchHero.tsx");
assert.match(hero, /if \(area\) params\.set\(SEARCH_AREA_PARAM, encodeSearchArea\(area\)\);/);
assert.match(hero, /submitBuy\(raw, \{ \.\.\.nextFilters, keyword: "" \}, drawnArea\);/);
assert.match(hero, /submitBuy\(`\$\{area\}, TX`\);/);
assert.match(hero, /area: drawnArea \? encodeSearchArea\(drawnArea\) : null/);
assert.match(hero, /setDrawnArea\(decodeSearchArea\(row\.area\)\)/);
assert.match(hero, /markMarketplaceFreshSearch\(\);\s*router\.push/);

// Results: start from the URL area; only detail → back to the same search restores a cached one.
const market = read("src/components/MarketplaceView.tsx");
assert.match(market, /useState<DrawnBoundary \| null>\(\(\) =>\s*areaFromSearchParams\(searchParams\),?\s*\)/);
assert.match(market, /const freshSearch = takeMarketplaceFreshSearch\(\);/);
assert.match(market, /if \(!freshSearch && \(!handoff \|\| cached\.searchKey === urlKey\)\) \{\s*setBoundary\(cached\.boundary\);/);
assert.equal(market.match(/searchKey: urlKey,/g)?.length, 2, "both cache writes record the search");
assert.match(market, /listingInBoundary\(\{ lat: listing\.lat, lng: listing\.lng \}, boundary\)/);

const cache = read("src/lib/motion/navigation-cache.ts");
assert.match(cache, /searchKey: string;/);
assert.match(cache, /export function takeMarketplaceFreshSearch\(\): boolean/);

// Frame: Filters stays in flow while the map lies over it at the same size.
const css = read("src/app/globals.css");
assert.match(
  css,
  /\.story-home-search-shell\[data-search-view="map"\] \.story-home-mode\[data-mode="advanced"\] \{\s*position: relative;\s*\}/,
);
assert.match(css, /\.story-home-mode\[data-mode="map"\]\[data-active="true"\] \{\s*position: absolute;/);
assert.match(css, /\.story-home-draw-hint \{[^}]*pointer-events: none;/);
assert.doesNotMatch(css, /\.story-home-draw[^{]*\{[^}]*\bborder:\s*1px/, "no trim on the homepage");

console.log("home-draw-map armor: ok");
