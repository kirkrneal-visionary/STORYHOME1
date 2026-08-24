import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyResearchCamera,
  RESEARCH_3D_EXAGGERATION,
  RESEARCH_3D_PITCH,
  RESEARCH_CAMERA_COPY,
  RESEARCH_DEM_MAX_ZOOM,
  RESEARCH_DEM_SOURCE_ID,
  RESEARCH_DEM_TILES,
  RESEARCH_DEM_UPSTREAM,
  RESEARCH_HILLSHADE_LAYER_ID,
  RESEARCH_MAP_CAMERA_MODES,
  RESEARCH_SKY,
  researchDemUpstreamUrl,
  type ResearchMapCamera,
} from "../src/lib/shi/research-map-camera.ts";

assert.deepEqual([...RESEARCH_MAP_CAMERA_MODES], ["2d", "3d"]);
assert.equal(RESEARCH_CAMERA_COPY.flat, "2D");
assert.equal(RESEARCH_CAMERA_COPY.sky, "3D");
assert.ok(RESEARCH_3D_PITCH >= 60);
assert.equal(RESEARCH_DEM_SOURCE_ID, "story-dem");
assert.equal(RESEARCH_HILLSHADE_LAYER_ID, "story-hillshade");
assert.equal(RESEARCH_DEM_MAX_ZOOM, 15);
assert.match(RESEARCH_DEM_TILES, /\/api\/map\/dem\/\{z\}\/\{x\}\/\{y\}/);
assert.match(RESEARCH_DEM_UPSTREAM, /terrarium/);
assert.equal(
  researchDemUpstreamUrl(10, 214, 394),
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/10/214/394.png",
);
assert.match(RESEARCH_SKY["sky-color"] as string, /^#/);
assert.ok((RESEARCH_SKY["atmosphere-blend"] as number) > 0.5);

type Call = [string, ...unknown[]];

function mockMap() {
  const calls: Call[] = [];
  return {
    calls,
    setTerrain: (t: unknown) => {
      calls.push(["setTerrain", t]);
    },
    setSky: (s: unknown) => {
      calls.push(["setSky", s]);
    },
    getLayer: () => ({}),
    setLayoutProperty: (id: string, prop: string, value: string) => {
      calls.push(["setLayout", id, prop, value]);
    },
    dragRotate: {
      enable: () => {
        calls.push(["rotateOn"]);
      },
      disable: () => {
        calls.push(["rotateOff"]);
      },
    },
    touchPitch: {
      enable: () => {
        calls.push(["pitchOn"]);
      },
      disable: () => {
        calls.push(["pitchOff"]);
      },
    },
    easeTo: (o: unknown) => {
      calls.push(["easeTo", o]);
    },
  };
}

{
  const map = mockMap();
  applyResearchCamera(map as never, "3d" as ResearchMapCamera);
  assert.equal(map.calls[0][0], "setTerrain");
  assert.deepEqual(map.calls[0][1], {
    source: RESEARCH_DEM_SOURCE_ID,
    exaggeration: RESEARCH_3D_EXAGGERATION,
  });
  assert.equal(map.calls.find((c) => c[0] === "setSky")?.[1], RESEARCH_SKY);
  assert.ok(map.calls.some((c) => c[0] === "rotateOn"));
  assert.ok(map.calls.some((c) => c[0] === "pitchOn"));
  const ease = map.calls.find((c) => c[0] === "easeTo")?.[1] as {
    pitch: number;
  };
  assert.equal(ease.pitch, RESEARCH_3D_PITCH);
  assert.ok(
    map.calls.some(
      (c) =>
        c[0] === "setLayout" &&
        c[1] === RESEARCH_HILLSHADE_LAYER_ID &&
        c[3] === "visible",
    ),
  );
}

{
  const map = mockMap();
  applyResearchCamera(map as never, "2d" as ResearchMapCamera);
  assert.ok(map.calls.some((c) => c[0] === "rotateOff"));
  assert.ok(map.calls.some((c) => c[0] === "pitchOff"));
  const ease = map.calls.find((c) => c[0] === "easeTo")?.[1] as {
    pitch: number;
    bearing: number;
  };
  assert.equal(ease.pitch, 0);
  assert.equal(ease.bearing, 0);
  assert.equal(map.calls.find((c) => c[0] === "setTerrain")?.[1], null);
}

const root = process.cwd();
const route = readFileSync(
  join(root, "src/app/api/map/dem/[z]/[x]/[y]/route.ts"),
  "utf8",
);
assert.match(route, /researchDemUpstreamUrl/);
assert.match(route, /Access-Control-Allow-Origin/);

const style = readFileSync(join(root, "src/lib/map-style.ts"), "utf8");
assert.match(style, /RESEARCH_DEM_TILES/);
assert.match(style, /encoding: "terrarium"/);
assert.doesNotMatch(style, /s3\.amazonaws\.com\/elevation-tiles-prod/);

console.log("research-map-camera: ok");
