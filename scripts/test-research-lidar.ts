import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  RESEARCH_LIDAR_COPY,
  RESEARCH_LIDAR_LAYER_ID,
  RESEARCH_LIDAR_MAX_ZOOM,
  RESEARCH_LIDAR_PRODUCTS,
  RESEARCH_LIDAR_RASTER_FUNCTION,
  RESEARCH_LIDAR_SOURCE_ID,
  RESEARCH_LIDAR_UPSTREAM,
  lngLatToWebMercator,
  metersToFeet,
  parseResearchLidarIdentifyMeters,
  parseResearchLidarProduct,
  researchLidarIdentifyUrl,
  researchLidarTileBbox3857,
  researchLidarTileTemplate,
  researchLidarTileValid,
  researchLidarUpstreamUrl,
} from "../src/lib/shi/research-lidar.ts";

assert.deepEqual([...RESEARCH_LIDAR_PRODUCTS], ["ground", "slope", "aspect"]);
assert.equal(RESEARCH_LIDAR_COPY.label, "LiDAR");
assert.match(RESEARCH_LIDAR_COPY.title, /lidar|3DEP|StratMap/i);
assert.doesNotMatch(RESEARCH_LIDAR_COPY.title, /buildable acres/i);
assert.equal(RESEARCH_LIDAR_SOURCE_ID, "story-lidar");
assert.equal(RESEARCH_LIDAR_LAYER_ID, "story-lidar-surface");
assert.equal(RESEARCH_LIDAR_MAX_ZOOM, 16);
assert.equal(parseResearchLidarProduct("ground"), "ground");
assert.equal(parseResearchLidarProduct("canopy"), null);
assert.match(researchLidarTileTemplate("slope"), /\/api\/map\/lidar\/slope\//);
assert.match(RESEARCH_LIDAR_UPSTREAM, /3DEPElevation/);
assert.equal(
  RESEARCH_LIDAR_RASTER_FUNCTION.ground,
  "Hillshade Multidirectional",
);
assert.equal(RESEARCH_LIDAR_RASTER_FUNCTION.slope, "Slope Map");
assert.equal(RESEARCH_LIDAR_RASTER_FUNCTION.aspect, "Aspect Map");

assert.equal(researchLidarTileValid(13, 1921, 3360), true);
assert.equal(researchLidarTileValid(17, 0, 0), false);

const [xmin, ymin, xmax, ymax] = researchLidarTileBbox3857(13, 1921, 3360);
assert.ok(xmin < xmax && ymin < ymax);

const url = researchLidarUpstreamUrl("ground", 13, 1921, 3360);
assert.match(url, /exportImage/);
assert.match(url, /Hillshade/);
assert.doesNotMatch(url, /s3\.amazonaws\.com\/elevation-tiles-prod/);

const hunts = lngLatToWebMercator(-95.5508, 30.7235);
assert.ok(hunts.x < -10_600_000 && hunts.y > 3_500_000);
assert.ok(Math.abs(metersToFeet(113.263) - 371.6) < 1);
assert.equal(parseResearchLidarIdentifyMeters({ value: "113.263" }), 113.263);
assert.equal(parseResearchLidarIdentifyMeters({ value: "NoData" }), null);
assert.match(researchLidarIdentifyUrl(-95.55, 30.72), /identify/);

const root = process.cwd();
const tileRoute = readFileSync(
  join(root, "src/app/api/map/lidar/[product]/[z]/[x]/[y]/route.ts"),
  "utf8",
);
assert.match(tileRoute, /getResearchLidarTile/);
assert.match(tileRoute, /parseResearchLidarProduct/);

const readRoute = readFileSync(
  join(root, "src/app/api/map/lidar/read/route.ts"),
  "utf8",
);
assert.match(readRoute, /readResearchLidarElevation/);
assert.match(readRoute, /feet/);

const style = readFileSync(join(root, "src/lib/map-style.ts"), "utf8");
assert.match(style, /researchLidarTileTemplate\("ground"\)/);

const map = readFileSync(
  join(root, "src/components/broker/intelligence/ShiResearchMap.tsx"),
  "utf8",
);
assert.match(map, /data-map-lidar/);
assert.match(map, /data-map-lidar-product/);
assert.match(map, /data-map-lidar-read/);
assert.match(map, /setLidarProduct/);
assert.doesNotMatch(map, /setShowLidar/);

console.log("research-lidar: ok");
