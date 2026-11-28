import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LAUNCH7_ESRI_POLK_REQUESTED,
  LAUNCH7_TOP15_ENABLED,
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
assert.equal(LAUNCH7_ESRI_POLK_REQUESTED, false);
assert.equal(LAUNCH7_TOP15_ENABLED, false, "TOP 2015 stays off until tiles are self-hosted");
assert.equal(naip.enabled, true);
assert.equal(naip.nativeResolutionM, 0.6);
assert.equal(activeImagerySource().id, "naip-60cm");
assert.match(activeImagerySource().tiles[0] ?? "", /^\/api\/map\/launch7\/imagery\/.*v=n60/);
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
assert.match(style, /owned-google-l7/);
assert.match(style, /owned-esri-l7/);
assert.match(style, /LAUNCH7_TOP15_ENABLED\s*\?\s*"owned-top15"\s*:\s*"owned-naip60"/);
assert.match(style, /IMAGERY_LIDAR_OVERLAY_LAYER_ID/);

const tx = texasSharpImagerySource();
assert.equal(tx.enabled, false);
assert.equal(tx.nativeResolutionM, 0.5);
assert.match(tx.attribution, /CC0/);
const tiles = readFileSync(join(root, "src/lib/shi/launch7-tiles.ts"), "utf8");
assert.match(tiles, /TOP\/TOP15_NCCIR_50cm\/ImageServer/);
assert.ok(
  tiles.indexOf("TXGIO_TOP15_IMAGESERVER, z") <
    tiles.indexOf('fetchNaip60Tile(z, x, y, "usgs")'),
  "TOP 2015 is tried before NAIP at close zoom",
);
assert.match(tiles, /inFootprint && !fallback/);
const imageryLib = readFileSync(
  join(root, "src/lib/shi/research-imagery.ts"),
  "utf8",
);
assert.match(imageryLib, /google-l7-2x/);
assert.match(imageryLib, /googleSatelliteLaunch7ImagerySource/);
assert.match(imageryLib, /ibasemaps-api\.arcgis\.com\/arcgis\/rest\/services\/World_Imagery/);
const googleLib = readFileSync(
  join(root, "src/lib/shi/google-map-tiles.ts"),
  "utf8",
);
assert.match(googleLib, /tile\.googleapis\.com\/v1\/2dtiles/);
assert.match(googleLib, /LAUNCH7_GOOGLE_IMAGERY_ENABLED/);
assert.match(googleLib, /scaleFactor2x/);
assert.match(googleLib, /highDpi:\s*true/);
assert.match(googleLib, /GOOGLE_SATELLITE_MAX_ZOOM = 20/);
assert.match(googleLib, /probeGoogleSatelliteTile/);
assert.match(tiles, /GOOGLE_SATELLITE_MAX_ZOOM/);
assert.match(
  readFileSync(
    join(root, "src/app/api/map/launch7/google-probe/route.ts"),
    "utf8",
  ),
  /probeGoogleSatelliteTile/,
);
assert.match(tiles, /fetchGoogleSatelliteTile/);
assert.match(tiles, /ESRI_WORLD_IMAGERY_TILE_API/);
assert.match(tiles, /tileUsesGoogleLaunch7Imagery/);
assert.match(tiles, /tileUsesEsriLaunch7Imagery/);
assert.match(tiles, /tileIntersectsLaunch7/);
assert.match(tiles, /noPersist/);
assert.match(tiles, /ESRI_FETCH_TIMEOUT_MS/);
assert.match(tiles, /esriFallback = true[\s\S]*fetchUsgsXyzTile/);
assert.match(imageryLib, /resolveLaunch7ImageryGen/);
assert.match(imageryLib, /launch7ImageryTileTemplate/);
assert.doesNotMatch(imageryLib, /NEXT_PUBLIC_LAUNCH7_ESRI_IMAGERY/);
assert.match(tiles, /if \(!hit && LAUNCH7_TOP15_ENABLED\) \{\s*hit = await fetchImage\(\s*naip60ExportUrl\(TXGIO_TOP15_IMAGESERVER/);
const imageryRoute = readFileSync(
  join(root, "src/app/api/map/launch7/imagery/[z]/[x]/[y]/route.ts"),
  "utf8",
);
assert.match(imageryRoute, /LICENSED_TILE_CACHE_CONTROL/);
assert.match(imageryRoute, /tile\.imageryKind === "google-satellite"/);
assert.match(imageryRoute, /tile\.imageryKind === "esri-world"/);
assert.match(imageryRoute, /export const maxDuration = 30/);
const market = readFileSync(
  join(root, "src/components/marketplace/MarketplaceMap.tsx"),
  "utf8",
);
assert.doesNotMatch(market, /Texas sharp|ImageryChoice/);
assert.match(market, /useState\(false\)[\s\S]*setLidarOverlay/);
assert.match(market, /applyStoryMapTileBudget/);
assert.match(market, /prefetchLaunch7ImageryGen/);
const launch7Map = readFileSync(join(root, "src/lib/shi/launch7-map.ts"), "utf8");
assert.match(launch7Map, /imageryGen: resolveLaunch7ImageryGen/);
const clientGen = readFileSync(
  join(root, "src/lib/shi/launch7-imagery-gen-client.ts"),
  "utf8",
);
assert.match(clientGen, /\/api\/map\/launch7\/status/);

const map = readFileSync(
  join(root, "src/components/broker/intelligence/ShiResearchMap.tsx"),
  "utf8",
);
assert.match(map, /researchMapDebugEnabled/);
assert.match(map, /logResearchMapQuality/);
assert.doesNotMatch(map, /Math\.min\(\s*typeof window[\s\S]*2\s*,\s*\)/);
assert.match(map, /maxZoom: 17/);

console.log("research-imagery: ok");
