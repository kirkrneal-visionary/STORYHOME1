import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  RESEARCH_WORLD_PROFILES,
  STORY_3D_PROFILE,
  STORY_ATMOSPHERE_PROFILE,
  STORY_IMAGERY_PROFILE_CURRENT,
  STORY_IMAGERY_PROFILE_ORTHO,
  STORY_IMAGERY_PROFILE_RAW,
  STORY_TERRAIN_PROFILE,
  WORLD_AUDIT_CURRENT,
  WORLD_HILLSHADE_LAYER_ID,
  WORLD_LAB_CAMERA,
  WORLD_LAB_MODES,
  buildWorldLabSpec,
  reliefIsNotViewHeight,
  viewHeightIsCameraNotRelief,
  worldExaggeration,
  worldHillshadeOpacity,
  worldLightingOn,
  worldRasterForMode,
  worldTerrainOn,
  worldViewHeightCamera,
} from "../src/lib/shi/research-world-profiles.ts";
import {
  RESEARCH_WORLD_LAB,
  WORLD_LAB_QUERY,
  applyWorldLabSpec,
  parseWorldLabMode,
  researchWorldLabRequested,
} from "../src/lib/shi/research-world-lab.ts";
import { RESEARCH_VIEW_HEIGHT_DEFAULT } from "../src/lib/shi/research-terrain.ts";

assert.equal(RESEARCH_WORLD_PROFILES, "research-world-profiles-v1");
assert.equal(RESEARCH_WORLD_LAB, "research-world-lab-v1");
assert.equal(WORLD_LAB_QUERY, "worldLab");
assert.deepEqual([...WORLD_LAB_MODES], ["A", "B", "C", "D", "E", "F"]);
assert.equal(WORLD_LAB_CAMERA.id, "E");
assert.equal(WORLD_HILLSHADE_LAYER_ID, "story-world-hillshade");

assert.equal(researchWorldLabRequested(""), false);
assert.equal(researchWorldLabRequested("?foo=1"), false);
assert.equal(researchWorldLabRequested("?worldLab=1"), true);
assert.equal(researchWorldLabRequested("worldLab=1"), true);
assert.equal(
  researchWorldLabRequested("", { NEXT_PUBLIC_STORY_WORLD_LAB: "1" }),
  true,
);
assert.equal(researchWorldLabRequested("", { NODE_ENV: "development" }), false);

assert.equal(parseWorldLabMode("f"), "F");
assert.equal(parseWorldLabMode("nope"), "A");

assert.equal(worldRasterForMode("A")["raster-contrast"], 0);
assert.equal(worldRasterForMode("B")["raster-resampling"], "nearest");
assert.ok(worldRasterForMode("C")["raster-contrast"] > 0);
assert.ok(worldRasterForMode("C")["raster-contrast"] < 0.25);
assert.ok(worldRasterForMode("F")["raster-saturation"] > 0);
assert.ok(worldRasterForMode("F")["raster-brightness-max"] < 1);
assert.equal(STORY_IMAGERY_PROFILE_CURRENT["raster-fade-duration"], 120);
assert.equal(STORY_IMAGERY_PROFILE_RAW["raster-fade-duration"], 0);
assert.ok(STORY_IMAGERY_PROFILE_ORTHO["raster-hue-rotate"] < 0);

assert.equal(worldTerrainOn("B"), false);
assert.equal(worldTerrainOn("C"), false);
assert.equal(worldTerrainOn("D"), true);
assert.equal(worldLightingOn("D"), false);
assert.equal(worldLightingOn("E"), true);
assert.equal(worldHillshadeOpacity("A", 60), 0);
assert.equal(worldHillshadeOpacity("F", 0), STORY_ATMOSPHERE_PROFILE.hillshadeOverhead);
assert.ok(worldHillshadeOpacity("F", 62) > worldHillshadeOpacity("F", 20));
assert.ok(worldHillshadeOpacity("F", 62) < 0.4);

assert.equal(worldExaggeration("A"), 1);
assert.equal(worldExaggeration("F"), STORY_TERRAIN_PROFILE.exaggerationWorld);
assert.equal(STORY_TERRAIN_PROFILE.exaggerationWorld, 1.6);

const a = buildWorldLabSpec("A");
const f = buildWorldLabSpec("F");
assert.equal(a.camera.lng, f.camera.lng);
assert.equal(a.camera.lat, f.camera.lat);
assert.equal(a.camera.zoom, f.camera.zoom);
assert.equal(a.viewHeight, RESEARCH_VIEW_HEIGHT_DEFAULT);
assert.notEqual(a.exaggeration, f.exaggeration);
assert.equal(a.atmosphereOn, true);
assert.equal(buildWorldLabSpec("D").atmosphereOn, false);
assert.equal(buildWorldLabSpec("E").lightingOn, true);
assert.ok((f.fog?.["horizon-blend"] ?? 0) > 0);
assert.ok((f.fog?.["horizon-blend"] ?? 1) < 0.03);
assert.ok((f.fog?.range[0] ?? 0) >= 7);

assert.equal(viewHeightIsCameraNotRelief(), true);
assert.equal(
  reliefIsNotViewHeight(f.exaggeration, f.viewHeight),
  true,
);
const low = worldViewHeightCamera(0);
const high = worldViewHeightCamera(1);
assert.ok(low.zoom > high.zoom);
assert.ok(low.pitch > high.pitch);

const paints: Record<string, unknown> = {};
const layout: Record<string, unknown> = {};
let terrain: unknown = "unset";
let jumped = false;
const fake = {
  getPitch: () => 50,
  getZoom: () => 17.4,
  getSource: (id: string) => (id === "story-lidar" ? {} : null),
  getLayer: (id: string) =>
    id === "parcels-fill" || id === "story-paper" ? {} : null,
  addSource: () => {},
  addLayer: () => {},
  setPaintProperty: (layer: string, name: string, value: unknown) => {
    paints[`${layer}:${name}`] = value;
  },
  setLayoutProperty: (layer: string, name: string, value: unknown) => {
    layout[`${layer}:${name}`] = value;
  },
  setTerrain: (next: unknown) => {
    terrain = next;
  },
  setFog: () => {},
  setLights: () => {},
  jumpTo: () => {
    jumped = true;
  },
};

applyWorldLabSpec(fake, f, { engine: "mapbox" });
assert.equal(paints["story-paper:background-color"], "#3d86cf");
assert.equal(paints["base-satellite:raster-contrast"], f.raster["raster-contrast"]);
assert.equal(layout["base-satellite:visibility"], "visible");
assert.equal(
  (terrain as { exaggeration?: number } | null)?.exaggeration,
  1.6,
);
assert.equal(jumped, true);

applyWorldLabSpec(fake, buildWorldLabSpec("B"), {
  engine: "maplibre",
  moveCamera: false,
});
assert.equal(terrain, null);
assert.equal(paints["story-paper:background-color"], "#f8f4f0");
assert.equal(paints["base-satellite:raster-resampling"], "nearest");

assert.equal(WORLD_AUDIT_CURRENT.imageryGsdM, 0.6);
assert.equal(WORLD_AUDIT_CURRENT.nativeImageryMaxZoom, 18);
assert.ok(WORLD_AUDIT_CURRENT.closeZoomCssM > 0.7);
assert.ok(WORLD_AUDIT_CURRENT.closeZoomCssM < 0.9);
assert.equal(WORLD_AUDIT_CURRENT.demMaxZoom, 16);
assert.equal(WORLD_AUDIT_CURRENT.canLookBetter, "PARTIALLY");
assert.equal(WORLD_AUDIT_CURRENT.estimatedGain, "MODERATE");
assert.equal(WORLD_AUDIT_CURRENT.customWebglJustified, false);
assert.equal(STORY_3D_PROFILE.maxPitch, 64);

const root = process.cwd();
const map = readFileSync(
  join(root, "src/components/broker/intelligence/ShiResearchMap.tsx"),
  "utf8",
);
assert.match(map, /ResearchWorldLab/);
assert.match(map, /researchWorldLabRequested/);
assert.match(map, /data-world-lab/);
assert.doesNotMatch(map, /AI upscale|mapbox\.satellite/);

const style = readFileSync(join(root, "src/lib/map-style.ts"), "utf8");
assert.match(style, /raster-resampling": "linear"/);
assert.doesNotMatch(style, /raster-contrast": 0\.11/);

console.log("research-world-lab: ok");
