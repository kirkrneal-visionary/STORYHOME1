import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LAUNCH7_TILE_CACHE_CONTROL,
  MAP_PANE_MIN_H,
  MAP_PANE_MIN_W,
  RESEARCH_LAND_LOADING_COPY,
  RESEARCH_LAND_WAIT_MS,
  RESEARCH_MAP_PAINT,
  RESEARCH_PAPER,
  RESEARCH_RESIZE_TICKS_MS,
  canvasMatchesPane,
  landPaintReady,
  mapPaneHasSize,
  maxParallelImageRequestsForTier,
  reliefFor3dApply,
  shouldResizeMapForWorkspaceChange,
  terrainApplyReady,
} from "../src/lib/shi/research-map-paint.ts";

assert.equal(RESEARCH_MAP_PAINT, "research-map-paint-v1");
assert.equal(RESEARCH_PAPER, "#f8f4f0");
assert.match(RESEARCH_LAND_LOADING_COPY, /land/i);
assert.ok(RESEARCH_LAND_WAIT_MS >= 2000);
assert.ok(RESEARCH_RESIZE_TICKS_MS.includes(1400));
assert.match(LAUNCH7_TILE_CACHE_CONTROL, /s-maxage=86400/);

assert.equal(mapPaneHasSize(0, 800), false);
assert.equal(mapPaneHasSize(390, 20), false);
assert.equal(mapPaneHasSize(MAP_PANE_MIN_W, MAP_PANE_MIN_H), true);
assert.equal(mapPaneHasSize(390, 700), true);

assert.equal(canvasMatchesPane(480, 480), true);
assert.equal(canvasMatchesPane(480, 844), false);
assert.equal(canvasMatchesPane(0, 700), false);

assert.equal(
  shouldResizeMapForWorkspaceChange({ sheetSnapChanged: true }),
  false,
);
assert.equal(
  shouldResizeMapForWorkspaceChange({ layoutChanged: true }),
  true,
);
assert.equal(
  shouldResizeMapForWorkspaceChange({ expandedMapChanged: true }),
  true,
);
assert.equal(
  shouldResizeMapForWorkspaceChange({ drawerChanged: true }),
  true,
);

assert.equal(
  landPaintReady({ styleLoaded: false, imageryIdle: true, timedOut: true }),
  false,
);
assert.equal(
  landPaintReady({ styleLoaded: true, imageryIdle: false, timedOut: false }),
  false,
);
assert.equal(
  landPaintReady({ styleLoaded: true, imageryIdle: true, timedOut: false }),
  true,
);
assert.equal(
  landPaintReady({ styleLoaded: true, imageryIdle: false, timedOut: true }),
  true,
);

assert.equal(
  terrainApplyReady({
    landPainted: false,
    demSourceReady: true,
    timedOut: true,
  }),
  false,
);
assert.equal(
  terrainApplyReady({
    landPainted: true,
    demSourceReady: false,
    timedOut: false,
  }),
  false,
);
assert.equal(
  terrainApplyReady({
    landPainted: true,
    demSourceReady: true,
    timedOut: false,
  }),
  true,
);

assert.equal(
  reliefFor3dApply({ requested: 3, firstEnable: true, cap: 3 }),
  1,
);
assert.equal(
  reliefFor3dApply({ requested: 2.4, firstEnable: false, cap: 2 }),
  2,
);
assert.equal(
  reliefFor3dApply({ requested: 1.8, firstEnable: false, cap: 3 }),
  1.8,
);

assert.equal(maxParallelImageRequestsForTier("low"), 6);
assert.equal(maxParallelImageRequestsForTier("medium"), 8);
assert.ok(maxParallelImageRequestsForTier("high") >= 10);

const root = process.cwd();
const map = readFileSync(
  join(root, "src/components/broker/intelligence/ShiResearchMap.tsx"),
  "utf8",
);
assert.match(map, /mapPaneHasSize/);
assert.match(map, /data-map-land/);
assert.match(map, /RESEARCH_LAND_LOADING_COPY/);
assert.match(map, /visualViewport/);
assert.match(map, /reliefFor3dApply/);
assert.match(map, /researchDemSourceSpec/);
assert.doesNotMatch(map, /h-\[480px\]/);

const factory = readFileSync(
  join(root, "src/lib/shi/create-research-map.ts"),
  "utf8",
);
assert.match(factory, /applyResearchTileBudget/);
assert.match(factory, /MAX_PARALLEL_IMAGE_REQUESTS/);

const style = readFileSync(join(root, "src/lib/map-style.ts"), "utf8");
assert.match(style, /story-paper/);
assert.match(style, /deferDem/);
assert.match(style, /initialBase/);
assert.match(style, /researchDemSourceSpec/);

const view = readFileSync(
  join(root, "src/components/broker/intelligence/PropertyIntelligenceView.tsx"),
  "utf8",
);
assert.match(view, /\[layout, drawerOpen, drawerW, expandedMap\]/);
assert.doesNotMatch(
  view,
  /\[layout, drawerOpen, drawerW, expandedMap, sheetSnap\]/,
);

const imagery = readFileSync(
  join(root, "src/app/api/map/launch7/imagery/[z]/[x]/[y]/route.ts"),
  "utf8",
);
assert.match(imagery, /LAUNCH7_TILE_CACHE_CONTROL/);
assert.match(imagery, /revalidate/);
assert.doesNotMatch(imagery, /force-dynamic/);

console.log("research-map-paint: ok");
