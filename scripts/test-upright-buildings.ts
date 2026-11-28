/**
 * Upright OSM buildings on Research Imagery + terrain.
 * Fill-extrusion stays above satellite; walls stay vertical on setTerrain.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildingVisibilityForBase,
  MAP_BUILDING_3D_LAYER_ID,
  MAP_BUILDING_FILL_LAYER_ID,
  UPRIGHT_BUILDINGS_MARK,
} from "../src/lib/shi/upright-buildings.ts";

assert.equal(UPRIGHT_BUILDINGS_MARK, "osm-fill-extrusion-v1");

assert.deepEqual(buildingVisibilityForBase("street"), {
  [MAP_BUILDING_FILL_LAYER_ID]: true,
  [MAP_BUILDING_3D_LAYER_ID]: true,
});
assert.deepEqual(
  buildingVisibilityForBase("satellite", { uprightOnImagery: true }),
  {
    [MAP_BUILDING_FILL_LAYER_ID]: false,
    [MAP_BUILDING_3D_LAYER_ID]: true,
  },
);
assert.deepEqual(
  buildingVisibilityForBase("satellite", { uprightOnImagery: false }),
  {
    [MAP_BUILDING_FILL_LAYER_ID]: false,
    [MAP_BUILDING_3D_LAYER_ID]: false,
  },
);
assert.deepEqual(
  buildingVisibilityForBase("imageryLabels", { uprightOnImagery: true }),
  {
    [MAP_BUILDING_FILL_LAYER_ID]: false,
    [MAP_BUILDING_3D_LAYER_ID]: true,
  },
);
assert.deepEqual(buildingVisibilityForBase("topo", { uprightOnImagery: true }), {
  [MAP_BUILDING_FILL_LAYER_ID]: false,
  [MAP_BUILDING_3D_LAYER_ID]: false,
});

const root = process.cwd();
const mapStyle = readFileSync(join(root, "src/lib/map-style.ts"), "utf8");
assert.match(mapStyle, /storyhome:upright-buildings/);
assert.match(mapStyle, /storyhome:building-layer-ids/);
assert.match(mapStyle, /UPRIGHT_BUILDINGS_MARK/);
assert.match(mapStyle, /\.\.\.buildingLayers/);
assert.match(mapStyle, /!isBuildingLayerId\(layer\.id\)/);
assert.match(mapStyle, /uprightOnImagery/);

const research = readFileSync(
  join(root, "src/components/broker/intelligence/ShiResearchMap.tsx"),
  "utf8",
);
assert.match(research, /uprightOnImagery:\s*lidar3d && isPhotoSkin\(base\)/);

console.log("test-upright-buildings: ok");
