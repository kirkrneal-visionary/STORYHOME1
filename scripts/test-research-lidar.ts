import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  RESEARCH_LIDAR_COPY,
  RESEARCH_LIDAR_DEM_SOURCE_ID,
  RESEARCH_LIDAR_ELEV_DEFAULT,
  RESEARCH_LIDAR_LAYER_ID,
  RESEARCH_LIDAR_MAX_ZOOM,
  RESEARCH_LIDAR_PRODUCTS,
  RESEARCH_LIDAR_PROFILE_SAMPLES,
  RESEARCH_LIDAR_RASTER_FUNCTION,
  RESEARCH_LIDAR_READS,
  RESEARCH_LIDAR_SOURCE_ID,
  RESEARCH_LIDAR_STRENGTH_DEFAULT,
  RESEARCH_LIDAR_STRENGTH_HYBRID,
  RESEARCH_LIDAR_TILE_GEN,
  RESEARCH_LIDAR_UPSTREAM,
  buildResearchLidarProfile,
  lngLatToWebMercator,
  metersToFeet,
  metersToTerrariumRgb,
  parseResearchLidarIdentifyMeters,
  parseResearchLidarProduct,
  parseResearchLidarSamples,
  researchLidarCanvasBase,
  researchLidarContourFunction,
  researchLidarDemTemplate,
  researchLidarDemUpstreamUrl,
  researchLidarGetSamplesUrl,
  researchLidarIdentifyUrl,
  researchLidarLandBase,
  researchLidarTileBbox3857,
  researchLidarTileTemplate,
  researchLidarTileValid,
  researchLidarUpstreamUrl,
  terrariumRgbToMeters,
} from "../src/lib/shi/research-lidar.ts";

assert.deepEqual(
  [...RESEARCH_LIDAR_PRODUCTS],
  ["ground", "slope", "aspect", "contours"],
);
assert.deepEqual([...RESEARCH_LIDAR_READS], ["slope", "aspect"]);
assert.match(RESEARCH_LIDAR_COPY.label, /lidar/i);
assert.match(RESEARCH_LIDAR_COPY.tap, /tap/i);
assert.match(RESEARCH_LIDAR_COPY.title, /lidar|3DEP|StratMap|terrain/i);
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
assert.equal(researchLidarCanvasBase("street", false), "gray");
assert.equal(researchLidarCanvasBase("street", true), "satellite");
assert.equal(researchLidarCanvasBase("street", false, true), "satellite");
assert.equal(RESEARCH_LIDAR_STRENGTH_DEFAULT, 0.96);
assert.ok(RESEARCH_LIDAR_STRENGTH_HYBRID < RESEARCH_LIDAR_STRENGTH_DEFAULT);
assert.match(RESEARCH_LIDAR_COPY.cut.short, /cut/i);
assert.match(RESEARCH_LIDAR_COPY.hybrid.short, /hybrid/i);
assert.match(RESEARCH_LIDAR_COPY.threeD.short, /3d/i);
assert.match(RESEARCH_LIDAR_COPY.elev, /relief/i);
assert.match(RESEARCH_LIDAR_COPY.threeD.title, /land|terrain/i);
assert.equal(RESEARCH_LIDAR_ELEV_DEFAULT, 1);
assert.equal(RESEARCH_LIDAR_DEM_SOURCE_ID, "story-lidar-dem");
assert.match(RESEARCH_LIDAR_COPY.strength, /dirt|ground/i);
assert.match(RESEARCH_LIDAR_COPY.honesty, /not a survey/i);
assert.equal(RESEARCH_LIDAR_PROFILE_SAMPLES, 32);

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

const [tr, tg, tb] = metersToTerrariumRgb(113.263);
assert.ok(Math.abs(terrariumRgbToMeters(tr, tg, tb) - 113.263) < 0.02);
assert.match(researchLidarDemTemplate(), /lidar\/dem/);
const demUrl = researchLidarDemUpstreamUrl(13, 1921, 3360);
assert.match(demUrl, /exportImage/);
assert.match(demUrl, /tiff/);
assert.doesNotMatch(demUrl, /Hillshade|s3\.amazonaws\.com\/elevation-tiles-prod/);

const samplesUrl = researchLidarGetSamplesUrl(
  { lng: -95.56, lat: 30.72 },
  { lng: -95.54, lat: 30.73 },
);
assert.match(samplesUrl, /getSamples/);
assert.match(samplesUrl, /esriGeometryPolyline/);
assert.doesNotMatch(samplesUrl, /Terrarium|setPitch|sky/);

const parsed = parseResearchLidarSamples({
  samples: [
    { location: { x: -95.56, y: 30.72 }, value: "100" },
    { location: { x: -95.55, y: 30.725 }, value: "120" },
    { location: { x: -95.54, y: 30.73 }, value: "110" },
  ],
});
assert.equal(parsed.length, 3);
const profile = buildResearchLidarProfile(parsed);
assert.ok(profile);
assert.equal(profile.points.length, 3);
assert.ok(profile.maxFt > profile.minFt);
assert.ok(profile.riseFt > 0);
assert.ok(profile.dropFt > 0);
assert.equal(profile.source, "usgs-3dep");
assert.equal(buildResearchLidarProfile(parsed.slice(0, 1)), null);

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
assert.match(tiles, /overzoomTerrariumPng/);
assert.match(tiles, /elevationLooksEmpty/);
assert.match(tiles, /elevation-tiles-prod/);

const style = readFileSync(join(root, "src/lib/map-style.ts"), "utf8");
assert.match(style, /researchLidarTileTemplate\("ground"\)/);
assert.match(style, /researchLidarTileTemplate\("contours"\)/);
assert.match(style, /researchLidarDemTemplate/);
assert.match(style, /raster-dem/);
assert.match(style, /terrarium/);
assert.match(style, /raster-opacity": 0\.96/);
assert.doesNotMatch(style, /s3\.amazonaws\.com\/elevation-tiles-prod/);

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
assert.match(map, /researchLidarCanvasBase/);
assert.match(map, /data-map-lidar-cut/);
assert.match(map, /data-map-lidar-hybrid/);
assert.match(map, /data-map-lidar-strength/);
assert.match(map, /data-map-lidar-profile/);
assert.match(map, /data-map-lidar-3d/);
assert.match(map, /data-map-lidar-elev/);
assert.match(map, /data-map-view-height/);
assert.match(map, /data-map-terrain-world/);
assert.match(map, /setTerrain/);
assert.match(map, /researchTerrainSkyForPitch/);
assert.doesNotMatch(map, /fog-ground-blend": 0\.25/);
assert.match(map, /storyCameraEase/);
assert.match(map, /lidarCutARef/);
assert.doesNotMatch(map, /setLidarProduct/);
assert.doesNotMatch(map, /s3\.amazonaws\.com\/elevation-tiles-prod/);

const demRoute = readFileSync(
  join(root, "src/app/api/map/lidar/dem/[z]/[x]/[y]/route.ts"),
  "utf8",
);
assert.match(demRoute, /getResearchLidarDemTile/);
assert.match(tiles, /parseElevationTiff/);

const profileRoute = readFileSync(
  join(root, "src/app/api/map/lidar/profile/route.ts"),
  "utf8",
);
assert.match(profileRoute, /readResearchLidarProfile/);
assert.match(tiles, /researchLidarGetSamplesUrl/);

console.log("research-lidar: ok");
