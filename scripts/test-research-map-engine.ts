import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  RESEARCH_MAPBOX_LIGHTS,
  RESEARCH_MAPBOX_TOKEN_ENV,
  RESEARCH_MAP_ENGINE_COPY,
  applyResearchAtmosphere,
  isAllowedMapboxTelemetryUrl,
  isForbiddenMapboxDataUrl,
  researchMapEngine,
  researchMapboxFogForPitch,
  researchMapboxToken,
  storyMapTransformRequest,
  styleJsonForResearchEngine,
} from "../src/lib/shi/research-map-engine.ts";

assert.equal(RESEARCH_MAPBOX_TOKEN_ENV, "NEXT_PUBLIC_MAPBOX_TOKEN");
assert.equal(researchMapboxToken({}), null);
assert.equal(researchMapboxToken({ NEXT_PUBLIC_MAPBOX_TOKEN: "" }), null);
assert.equal(researchMapboxToken({ NEXT_PUBLIC_MAPBOX_TOKEN: "sk.secret" }), null);
assert.equal(
  researchMapboxToken({ NEXT_PUBLIC_MAPBOX_TOKEN: " pk.test123 " }),
  "pk.test123",
);
assert.equal(researchMapEngine({}), "maplibre");
assert.equal(
  researchMapEngine({ NEXT_PUBLIC_MAPBOX_TOKEN: "pk.live" }),
  "mapbox",
);

assert.equal(isForbiddenMapboxDataUrl("mapbox://styles/mapbox/satellite-v9"), true);
assert.equal(
  isForbiddenMapboxDataUrl(
    "https://api.mapbox.com/v4/mapbox.satellite/14/1/2@2x.jpg",
  ),
  true,
);
assert.equal(
  isForbiddenMapboxDataUrl("https://api.mapbox.com/styles/v1/mapbox/streets-v12"),
  true,
);
assert.equal(
  isForbiddenMapboxDataUrl(
    "https://api.mapbox.com/raster/v1/mapbox.terrain-rgb/1/0/0.png",
  ),
  true,
);
assert.equal(
  isAllowedMapboxTelemetryUrl(
    "https://api.mapbox.com/map-sessions/v1?sku=test&access_token=pk.x",
  ),
  true,
);
assert.equal(
  isForbiddenMapboxDataUrl(
    "https://api.mapbox.com/map-sessions/v1?sku=test&access_token=pk.x",
  ),
  false,
);
assert.equal(
  isForbiddenMapboxDataUrl("/api/map/launch7/imagery/14/1/2"),
  false,
);
assert.equal(
  isForbiddenMapboxDataUrl("/api/map/lidar/dem/14/1/2.png"),
  false,
);
assert.equal(
  storyMapTransformRequest("mapbox://mapbox.terrain-rgb").url.startsWith("data:"),
  true,
);

const fog = researchMapboxFogForPitch(60);
assert.equal(fog["high-color"], "#3d86cf");
assert.equal(fog["star-intensity"], 0);
assert.ok(fog.range[1] > fog.range[0]);
assert.ok(fog.range[0] >= 7);
assert.ok(fog["horizon-blend"] < 0.03);
assert.ok((researchMapboxFogForPitch(0)["horizon-blend"] as number) < fog["horizon-blend"]);
assert.doesNotMatch(fog.color, /#d2ddd4|#d7e0d8/);
assert.equal(RESEARCH_MAPBOX_LIGHTS.length, 2);
assert.equal(RESEARCH_MAPBOX_LIGHTS[1]?.type, "directional");

const calls: string[] = [];
applyResearchAtmosphere(
  {
    getPitch: () => 60,
    setFog: () => {
      calls.push("fog");
    },
    setLights: () => {
      calls.push("lights");
    },
    setSky: () => {
      calls.push("sky");
    },
  },
  { engine: "mapbox", on: true },
);
assert.deepEqual(calls, ["fog", "lights"]);
calls.length = 0;
applyResearchAtmosphere(
  {
    getPitch: () => 60,
    setFog: () => {
      calls.push("fog");
    },
    setSky: () => {
      calls.push("sky");
    },
  },
  {
    engine: "maplibre",
    on: true,
    maplibreSky: () => ({ "sky-color": "#3d86cf" }),
  },
);
assert.deepEqual(calls, ["sky"]);

const styled = styleJsonForResearchEngine(
  { version: 8, sky: { "sky-color": "#000" }, sources: {} },
  "mapbox",
);
assert.equal("sky" in styled, false);
assert.ok("sky" in styleJsonForResearchEngine({ sky: {} }, "maplibre"));

const styleSrc = readFileSync(join(process.cwd(), "src/lib/map-style.ts"), "utf8");
assert.doesNotMatch(styleSrc, /mapbox:\/\//);
assert.doesNotMatch(styleSrc, /api\.mapbox\.com/);
assert.match(styleSrc, /LAUNCH7_IMAGERY|resolveSatelliteTileTemplate|launch7\/imagery/);
assert.match(styleSrc, /RESEARCH_LIDAR_DEM_SOURCE_ID/);
assert.match(styleSrc, /terrarium/);
assert.match(styleSrc, /story-paper/);
assert.match(styleSrc, /deferDem/);

assert.match(RESEARCH_MAP_ENGINE_COPY.mapbox, /tiles stay Story Home/i);

const root = process.cwd();
const map = readFileSync(
  join(root, "src/components/broker/intelligence/ShiResearchMap.tsx"),
  "utf8",
);
assert.match(map, /createResearchMap/);
assert.match(map, /data-map-engine/);
assert.match(map, /applyResearchAtmosphere/);
assert.doesNotMatch(map, /mapbox:\/\/styles/);
assert.match(
  readFileSync(join(root, "src/lib/shi/create-research-map.ts"), "utf8"),
  /storyMapTransformRequest/,
);
assert.match(
  readFileSync(join(root, "src/lib/shi/launch7-map.ts"), "utf8"),
  /not Mapbox or Google map tiles/,
);
assert.match(
  readFileSync(join(root, ".env.example"), "utf8"),
  /NEXT_PUBLIC_MAPBOX_TOKEN/,
);
assert.match(
  readFileSync(join(root, "src/lib/shi/research-map-engine.ts"), "utf8"),
  /const NEXT_PUBLIC_MAPBOX_TOKEN = process\.env\.NEXT_PUBLIC_MAPBOX_TOKEN/,
);

console.log("research-map-engine: ok");
