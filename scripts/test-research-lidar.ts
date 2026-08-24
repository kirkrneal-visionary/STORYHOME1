import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  RESEARCH_LIDAR_COPY,
  RESEARCH_LIDAR_LAYER_ID,
  RESEARCH_LIDAR_MAX_ZOOM,
  RESEARCH_LIDAR_PRODUCTS,
  RESEARCH_LIDAR_RASTER_FUNCTION,
  RESEARCH_LIDAR_READS,
  RESEARCH_LIDAR_SOURCE_ID,
  RESEARCH_LIDAR_TILE_GEN,
  RESEARCH_LIDAR_UPSTREAM,
  lngLatToWebMercator,
  metersToFeet,
  parseResearchLidarIdentifyMeters,
  parseResearchLidarProduct,
  researchLidarContourFunction,
  researchLidarIdentifyUrl,
  researchLidarLandBase,
  researchLidarTileBbox3857,
  researchLidarTileTemplate,
  researchLidarTileValid,
  researchLidarUpstreamUrl,
} from "../src/lib/shi/research-lidar.ts";

assert.deepEqual(
  [...RESEARCH_LIDAR_PRODUCTS],
  ["ground", "slope", "aspect", "contours"],
);
assert.deepEqual([...RESEARCH_LIDAR_READS], ["slope", "aspect"]);
assert.equal(RESEARCH_LIDAR_COPY.label, "LiDAR");
assert.match(RESEARCH_LIDAR_COPY.tap, /tap/i);
assert.match(RESEARCH_LIDAR_COPY.title, /lidar|3DEP|StratMap/i);
assert.doesNotMatch(RESEARCH_LIDAR_COPY.title, /buildable acres/i);
assert.equal(RESEARCH_LIDAR_SOURCE_ID, "story-lidar");
assert.equal(RESEARCH_LIDAR_LAYER_ID, "story-lidar-surface");
assert.equal(RESEARCH_LIDAR_MAX_ZOOM, 16);
assert.equal(RESEARCH_LIDAR_TILE_GEN, "w2c");
assert.equal(parseResearchLidarProduct("ground"), "ground");
assert.equal(parseResearchLidarProduct("contours"), "contours");
assert.equal(parseResearchLidarProduct("canopy"), null);
assert.match(researchLidarTileTemplate("contours"), /p=contours/);
assert.match(RESEARCH_LIDAR_UPSTREAM, /3DEPElevation/);
assert.equal(
  RESEARCH_LIDAR_RASTER_FUNCTION.ground,
  "Hillshade Gray-Stretch",
);
assert.equal(researchLidarContourFunction(13), "Preset 5ft Contour Interval");
assert.equal(researchLidarContourFunction(8), "Contour 25");
assert.equal(researchLidarLandBase("street"), "gray");
assert.equal(researchLidarLandBase("satellite"), "satellite");

assert.equal(researchLidarTileValid(13, 1921, 3360), true);
assert.equal(researchLidarTileValid(17, 0, 0), false);

const [xmin, ymin, xmax, ymax] = researchLidarTileBbox3857(13, 1921, 3360);
assert.ok(xmin < xmax && ymin < ymax);

const url = researchLidarUpstreamUrl("ground", 13, 1921, 3360);
assert.match(url, /exportImage/);
assert.match(url, /Gray-Stretch|Hillshade/);
assert.doesNotMatch(url, /s3\.amazonaws\.com\/elevation-tiles-prod/);
assert.doesNotMatch(url, /Terrarium|elevation-tiles-prod/);

const hunts = lngLatToWebMercator(-95.5508, 30.7235);
assert.ok(hunts.x < -10_600_000 && hunts.y > 3_500_000);
assert.ok(Math.abs(metersToFeet(113.263) - 371.6) < 1);
assert.equal(parseResearchLidarIdentifyMeters({ value: "113.263" }), 113.263);
assert.equal(parseResearchLidarIdentifyMeters({ value: "NoData" }), null);
assert.match(researchLidarIdentifyUrl(-95.55, 30.72), /identify/);

const root = process.cwd();
const tileRoute = readFileSync(
  join(root, "src/app/api/map/lidar/[z]/[x]/[y]/route.ts"),
  "utf8",
);
assert.match(tileRoute, /getResearchLidarTile/);
assert.match(tileRoute, /parseResearchLidarProduct/);

const tiles = readFileSync(
  join(root, "src/lib/shi/research-lidar-tiles.ts"),
  "utf8",
);
assert.match(tiles, /RESEARCH_LIDAR_TILE_GEN/);
assert.match(tiles, /styleResearchLidarTile/);

const style = readFileSync(join(root, "src/lib/map-style.ts"), "utf8");
assert.match(style, /researchLidarTileTemplate\("ground"\)/);
assert.match(style, /researchLidarTileTemplate\("contours"\)/);
assert.match(style, /raster-opacity": 0\.96/);
assert.doesNotMatch(style, /sky|setPitch|setTerrain/);

const map = readFileSync(
  join(root, "src/components/broker/intelligence/ShiResearchMap.tsx"),
  "utf8",
);
assert.match(map, /data-map-lidar/);
assert.match(map, /data-map-lidar-product/);
assert.match(map, /data-map-lidar-contours/);
assert.match(map, /data-map-lidar-read/);
assert.match(map, /setLidarOn/);
assert.match(map, /setLidarContours/);
assert.match(map, /researchLidarLandBase/);
assert.doesNotMatch(map, /setLidarProduct/);
assert.doesNotMatch(map, /setPitch|setTerrain|sky/);

console.log("research-lidar: ok");
