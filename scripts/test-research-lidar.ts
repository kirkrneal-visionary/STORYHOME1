import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  RESEARCH_LIDAR_COPY,
  RESEARCH_LIDAR_LAYER_ID,
  RESEARCH_LIDAR_MAX_ZOOM,
  RESEARCH_LIDAR_RASTER_FUNCTION,
  RESEARCH_LIDAR_SOURCE_ID,
  RESEARCH_LIDAR_TILES,
  RESEARCH_LIDAR_UPSTREAM,
  researchLidarTileBbox3857,
  researchLidarTileValid,
  researchLidarUpstreamUrl,
} from "../src/lib/shi/research-lidar.ts";

assert.equal(RESEARCH_LIDAR_COPY.label, "LiDAR");
assert.match(RESEARCH_LIDAR_COPY.title, /3DEP|StratMap/);
assert.doesNotMatch(RESEARCH_LIDAR_COPY.title, /survey certified|buildable acres/i);
assert.equal(RESEARCH_LIDAR_SOURCE_ID, "story-lidar");
assert.equal(RESEARCH_LIDAR_LAYER_ID, "story-lidar-hillshade");
assert.equal(RESEARCH_LIDAR_MAX_ZOOM, 16);
assert.match(RESEARCH_LIDAR_TILES, /\/api\/map\/lidar\//);
assert.match(RESEARCH_LIDAR_UPSTREAM, /3DEPElevation/);
assert.equal(RESEARCH_LIDAR_RASTER_FUNCTION, "Hillshade Multidirectional");

assert.equal(researchLidarTileValid(13, 1921, 3360), true);
assert.equal(researchLidarTileValid(17, 0, 0), false);
assert.equal(researchLidarTileValid(-1, 0, 0), false);

const [xmin, ymin, xmax, ymax] = researchLidarTileBbox3857(13, 1921, 3360);
assert.ok(xmin < xmax);
assert.ok(ymin < ymax);
assert.ok(xmin < -10_600_000 && xmax > -10_640_000);

const url = researchLidarUpstreamUrl(13, 1921, 3360);
assert.match(url, /bboxSR=3857/);
assert.match(url, /Hillshade/);
assert.doesNotMatch(url, /s3\.amazonaws\.com\/elevation-tiles-prod/);

const root = process.cwd();
const route = readFileSync(
  join(root, "src/app/api/map/lidar/[z]/[x]/[y]/route.ts"),
  "utf8",
);
assert.match(route, /getResearchLidarTile/);
assert.match(route, /research-lidar-tiles/);
assert.match(route, /Access-Control-Allow-Origin/);

const style = readFileSync(join(root, "src/lib/map-style.ts"), "utf8");
assert.match(style, /RESEARCH_LIDAR_TILES/);
assert.match(style, /RESEARCH_LIDAR_SOURCE_ID/);
assert.doesNotMatch(style, /s3\.amazonaws\.com\/elevation-tiles-prod/);

const map = readFileSync(
  join(root, "src/components/broker/intelligence/ShiResearchMap.tsx"),
  "utf8",
);
assert.match(map, /data-map-lidar/);
assert.match(map, /RESEARCH_LIDAR_LAYER_ID/);
assert.match(map, /setShowLidar/);

console.log("research-lidar: ok");
