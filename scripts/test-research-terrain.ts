import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  RESEARCH_RELIEF_DEFAULT,
  RESEARCH_RELIEF_ENHANCED,
  RESEARCH_RELIEF_NATURAL,
  RESEARCH_TERRAIN_COPY,
  RESEARCH_TERRAIN_ENGINE,
  RESEARCH_TERRAIN_PITCH_3D,
  RESEARCH_TERRAIN_SKY,
  RESEARCH_VIEW_SKINS,
  archieTerrainRead,
  buildResearchParcelTerrainStats,
  cameraPitchForPreset,
  formatSlopeBandPct,
  isPhotoSkin,
  parcelBbox,
  pointInParcel,
  reliefCapForTier,
  reliefFromSlider,
  researchDeviceTier,
  researchTerrainLandDefault,
  sliderFromRelief,
  storyCameraEase,
} from "../src/lib/shi/research-terrain.ts";

assert.equal(RESEARCH_TERRAIN_ENGINE, "story-terrain-v1");
assert.equal(RESEARCH_RELIEF_NATURAL, 1);
assert.equal(RESEARCH_RELIEF_ENHANCED, 3);
assert.equal(RESEARCH_RELIEF_DEFAULT, 1);
assert.equal(reliefFromSlider(0), 1);
assert.equal(reliefFromSlider(1), 3);
assert.equal(sliderFromRelief(1), 0);
assert.equal(sliderFromRelief(3), 1);
assert.equal(cameraPitchForPreset("2d"), 0);
assert.ok(cameraPitchForPreset("3d") >= 40);
assert.ok(cameraPitchForPreset("ground") > cameraPitchForPreset("overview"));
assert.ok(Math.abs(storyCameraEase(0.5) - 0.5) < 0.02);
assert.ok(storyCameraEase(0.2) < 0.2);
assert.ok(storyCameraEase(0.8) > 0.8);
assert.equal(RESEARCH_TERRAIN_SKY["fog-ground-blend"], 0);
assert.ok((RESEARCH_TERRAIN_SKY["sky-horizon-blend"] as number) > 0.7);
assert.equal(isPhotoSkin("satellite"), true);
assert.equal(isPhotoSkin("street"), false);
assert.equal(researchTerrainLandDefault("land_development"), "satellite");
assert.equal(researchTerrainLandDefault("general"), "street");
assert.equal(researchDeviceTier(3, 390, true), "low");
assert.equal(reliefCapForTier("low"), 2);
assert.deepEqual(
  RESEARCH_VIEW_SKINS.map((s) => s.label),
  ["Map", "Imagery", "Hybrid", "Topo"],
);
assert.match(RESEARCH_TERRAIN_COPY.honesty, /not a survey/i);
assert.doesNotMatch(RESEARCH_TERRAIN_COPY.honesty, /survey-grade|engineering/i);
assert.doesNotMatch(archieTerrainRead({
  majority: "0_5",
  majorityPct: 0.61,
  reliefFt: 49,
  minFt: 174,
  maxFt: 223,
}), /unbuildable|can build|survey-grade/i);

const square = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-95.56, 30.72],
      [-95.54, 30.72],
      [-95.54, 30.74],
      [-95.56, 30.74],
      [-95.56, 30.72],
    ],
  ],
};
assert.equal(pointInParcel(-95.55, 30.73, square), true);
assert.equal(pointInParcel(-95.6, 30.73, square), false);
const bbox = parcelBbox(square);
assert.ok(bbox[0] < bbox[2] && bbox[1] < bbox[3]);

const w = 8;
const h = 8;
const meters = new Float32Array(w * h);
for (let row = 0; row < h; row++) {
  for (let col = 0; col < w; col++) {
    meters[row * w + col] = 100 + row * 2 + col * 0.4;
  }
}
const stats = buildResearchParcelTerrainStats({
  meters,
  width: w,
  height: h,
  west: -95.56,
  south: 30.72,
  east: -95.54,
  north: 30.74,
  inside: () => true,
});
assert.ok(stats);
assert.equal(stats.source, "usgs-3dep");
assert.ok(stats.maxFt > stats.minFt);
assert.ok(stats.reliefFt > 0);
assert.ok(stats.slopeBands["0_5"] + stats.slopeBands["5_10"] + stats.slopeBands["10_15"] + stats.slopeBands["15_plus"] > 0.99);
assert.match(stats.archieRead, /mapped elevation/i);
assert.match(formatSlopeBandPct(0.61), /61%/);
assert.ok(RESEARCH_TERRAIN_PITCH_3D > 45);

const root = process.cwd();
const map = readFileSync(
  join(root, "src/components/broker/intelligence/ShiResearchMap.tsx"),
  "utf8",
);
assert.match(map, /data-map-view-height/);
assert.match(map, /data-map-relief/);
assert.match(map, /data-map-parcel-terrain/);
assert.match(map, /researchMode/);
assert.doesNotMatch(map, /How dramatic the hills sit/);
assert.doesNotMatch(map, />Photos</);
assert.match(readFileSync(join(root, "src/lib/shi/research-terrain.ts"), "utf8"), /"fog-ground-blend": 0/);

const demRoute = readFileSync(
  join(root, "src/app/api/map/lidar/dem/[z]/[x]/[y]/route.ts"),
  "utf8",
);
assert.match(demRoute, /X-Story-Terrain-Source/);
assert.doesNotMatch(demRoute, /status: 204/);

const parcelRoute = readFileSync(
  join(root, "src/app/api/map/lidar/parcel/route.ts"),
  "utf8",
);
assert.match(parcelRoute, /buildResearchParcelTerrainStats/);
assert.match(parcelRoute, /readResearchLidarParcelRaster/);
assert.doesNotMatch(parcelRoute, /exaggeration|lidarElev|reliefFromSlider/);

const view = readFileSync(
  join(root, "src/components/broker/intelligence/PropertyIntelligenceView.tsx"),
  "utf8",
);
assert.match(view, /researchMode=\{researchMode\}/);

console.log("research-terrain: ok");
