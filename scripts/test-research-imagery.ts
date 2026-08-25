import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LIVINGSTON_QA,
  RESEARCH_IMAGERY_ARCH,
  RESEARCH_QA_CAMERAS,
  activeImagerySource,
  allImagerySources,
  canvasResolutionMismatch,
  groundResolutionM,
  imageryOverzoom,
  qualityTierForMotion,
  researchMapDebugEnabled,
  researchRenderPixelRatio,
  usgsImageryOnlySource,
} from "../src/lib/shi/research-imagery.ts";
import { RESEARCH_LIDAR_DEM_MAX_ZOOM } from "../src/lib/shi/research-lidar.ts";
import {
  RESEARCH_RELIEF_ENHANCED,
  RESEARCH_TERRAIN_PITCH_3D,
  cameraPitchForPreset,
} from "../src/lib/shi/research-terrain.ts";

assert.equal(RESEARCH_IMAGERY_ARCH, "research-imagery-v1");
assert.equal(LIVINGSTON_QA.name.includes("Polk"), true);
assert.equal(RESEARCH_QA_CAMERAS.length, 6);
assert.equal(RESEARCH_QA_CAMERAS[0]?.pitch, 0);
assert.ok((RESEARCH_QA_CAMERAS[3]?.pitch ?? 0) > 55);

const usgs = usgsImageryOnlySource();
assert.equal(usgs.enabled, true);
assert.equal(usgs.tileSize, 256);
assert.equal(usgs.maxZoom, 18);
assert.equal(usgs.highDpiSupported, false);
assert.equal(activeImagerySource().id, "usgs-imagery-only");
assert.equal(allImagerySources().filter((s) => s.enabled).length, 1);
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

const map = readFileSync(
  join(root, "src/components/broker/intelligence/ShiResearchMap.tsx"),
  "utf8",
);
assert.match(map, /researchMapDebugEnabled/);
assert.match(map, /logResearchMapQuality/);
assert.doesNotMatch(map, /Math\.min\(\s*typeof window[\s\S]*2\s*,\s*\)/);
assert.match(map, /maxZoom: 17/);

console.log("research-imagery: ok");
