import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LIVINGSTON_QA,
  NAIP_60CM_MIN_ZOOM,
  RESEARCH_IMAGERY_ARCH,
  RESEARCH_QA_CAMERAS,
  activeImagerySource,
  allImagerySources,
  canvasResolutionMismatch,
  groundResolutionM,
  imageryOverzoom,
  naip60cmSource,
  qualityTierForMotion,
  researchMapDebugEnabled,
  researchRenderPixelRatio,
  texasSharpImagerySource,
  usgsImageryOnlySource,
} from "../src/lib/shi/research-imagery.ts";
import { RESEARCH_LIDAR_DEM_MAX_ZOOM } from "../src/lib/shi/research-lidar.ts";
import {
  RESEARCH_RELIEF_ENHANCED,
  RESEARCH_TERRAIN_PITCH_3D,
  cameraPitchForPreset,
} from "../src/lib/shi/research-terrain.ts";

assert.equal(RESEARCH_IMAGERY_ARCH, "research-imagery-v2");
assert.equal(LIVINGSTON_QA.name.includes("Polk"), true);
assert.equal(RESEARCH_QA_CAMERAS.length, 6);
assert.equal(RESEARCH_QA_CAMERAS[0]?.pitch, 0);
assert.ok((RESEARCH_QA_CAMERAS[3]?.pitch ?? 0) > 55);

const usgs = usgsImageryOnlySource();
assert.equal(usgs.enabled, false);
assert.equal(usgs.tileSize, 256);
assert.equal(usgs.maxZoom, 18);
assert.equal(usgs.highDpiSupported, false);
const naip = naip60cmSource();
assert.equal(naip.enabled, false);
assert.equal(naip.nativeResolutionM, 0.6);
assert.equal(activeImagerySource().id, "txgio-top15-50cm");
assert.equal(activeImagerySource().nativeResolutionM, 0.5);
assert.match(activeImagerySource().tiles[0] ?? "", /^\/api\/map\/launch7\/imagery\/.*v=t15/);
assert.equal(allImagerySources().filter((s) => s.enabled).length, 1);
assert.equal(NAIP_60CM_MIN_ZOOM, 14);
assert.equal(
  allImagerySources().find((s) => s.id === "high-res-aerial")?.enabled,
  false,
);

assert.ok(groundResolutionM(30.6969, 18) < 0.7);
assert.ok(groundResolutionM(30.6969, 17) > 0.8);
assert.equal(imageryOverzoom(18, 18), 0);
assert.equal(imageryOverzoom(19, 18), 1);
assert.equal(researchRenderPixelRatio(3, 390), 2.5);
assert.equal(researchRenderPixelRatio(3, 1440), 2);
assert.ok(researchRenderPixelRatio(3, 390, true) <= 2);
assert.equal(qualityTierForMotion(false), "high");
assert.equal(qualityTierForMotion(true), "balanced");
assert.equal(researchMapDebugEnabled({ NODE_ENV: "production" }), false);
assert.equal(researchMapDebugEnabled({ NODE_ENV: "development" }), true);
assert.equal(canvasResolutionMismatch(390, 844, 390, 844, 3), true);
assert.equal(canvasResolutionMismatch(390, 844, 1170, 2532, 3), false);

assert.equal(RESEARCH_LIDAR_DEM_MAX_ZOOM, 16);
assert.equal(RESEARCH_RELIEF_ENHANCED, 2.2);
assert.ok(RESEARCH_TERRAIN_PITCH_3D < 60);
assert.ok(cameraPitchForPreset("3d") <= 64);
assert.ok(cameraPitchForPreset("ground") <= 64);

const root = process.cwd();
assert.match(
  readFileSync(join(root, "src/lib/shi/launch7-tiles.ts"), "utf8"),
  /USGSNAIPImagery\/ImageServer/,
);
assert.match(
  readFileSync(join(root, "src/lib/shi/launch7-tiles.ts"), "utf8"),
  /imageryUsesNaip60/,
);
assert.match(
  readFileSync(join(root, "src/lib/shi/launch7-tiles.ts"), "utf8"),
  /NaturalColor/,
);
const factory = readFileSync(
  join(root, "src/lib/shi/create-research-map.ts"),
  "utf8",
);
assert.match(factory, /researchRenderPixelRatio/);
assert.match(factory, /maxPitch: 64/);
assert.match(factory, /MAP_IMAGERY_SOURCE_MAX_ZOOM/);
assert.match(factory, /antialias: true/);
assert.match(factory, /maxTileCacheSize: 96/);

assert.match(
  readFileSync(join(root, "src/lib/shi/research-map-quality.ts"), "utf8"),
  /research-map-quality-v1/,
);

const style = readFileSync(join(root, "src/lib/map-style.ts"), "utf8");
assert.match(style, /activeImagerySource/);
assert.match(style, /raster-resampling": "linear"/);
assert.doesNotMatch(style, /satellite-tx/);
assert.match(style, /"storyhome:satellite": "owned-top15"/);
assert.match(style, /IMAGERY_LIDAR_OVERLAY_LAYER_ID/);

const tx = texasSharpImagerySource();
assert.equal(tx.enabled, true);
assert.match(tx.attribution, /CC0/);
const tiles = readFileSync(join(root, "src/lib/shi/launch7-tiles.ts"), "utf8");
assert.match(tiles, /TOP\/TOP15_NCCIR_50cm\/ImageServer/);
assert.ok(
  tiles.indexOf("TXGIO_TOP15_IMAGESERVER, z") <
    tiles.indexOf('fetchNaip60Tile(z, x, y, "usgs")'),
  "TOP 2015 is tried before NAIP at close zoom",
);
assert.match(tiles, /inFootprint && !fallback/);
const market = readFileSync(
  join(root, "src/components/marketplace/MarketplaceMap.tsx"),
  "utf8",
);
assert.doesNotMatch(market, /Texas sharp|ImageryChoice/);
assert.match(market, /useState\(false\)[\s\S]*setLidarOverlay/);

const map = readFileSync(
  join(root, "src/components/broker/intelligence/ShiResearchMap.tsx"),
  "utf8",
);
assert.match(map, /researchMapDebugEnabled/);
assert.match(map, /logResearchMapQuality/);
assert.doesNotMatch(map, /Math\.min\(\s*typeof window[\s\S]*2\s*,\s*\)/);
assert.match(map, /maxZoom: 17/);

console.log("research-imagery: ok");
