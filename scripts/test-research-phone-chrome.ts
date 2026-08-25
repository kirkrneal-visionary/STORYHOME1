import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  WORKSPACE_DRAWER_MIN_PX,
  defaultMapToolGroup,
  sheetSnapAfterDraw,
  sheetSnapAfterSelect,
} from "../src/lib/shi/research-workspace.ts";

assert.equal(sheetSnapAfterSelect("sheet", "peek"), "peek");
assert.equal(sheetSnapAfterSelect("sheet", "collapsed"), "peek");
assert.equal(sheetSnapAfterSelect("sheet", "expanded"), "expanded");
assert.equal(sheetSnapAfterSelect("drawer", "peek"), "expanded");
assert.equal(sheetSnapAfterDraw("sheet"), "peek");
assert.equal(sheetSnapAfterDraw("drawer"), "expanded");
assert.equal(defaultMapToolGroup(390), null);
assert.equal(defaultMapToolGroup(WORKSPACE_DRAWER_MIN_PX), "terrain");

const root = process.cwd();
const map = readFileSync(
  join(root, "src/components/broker/intelligence/ShiResearchMap.tsx"),
  "utf8",
);
assert.match(map, /data-map-mode="2d"/);
assert.match(map, /data-map-mode="3d"/);
assert.match(map, /data-map-tools/);
assert.match(map, /setLidar3d\(false\)/);
assert.match(map, /setLidar3d\(true\)/);
assert.match(map, /g === "terrain" \? null/);
assert.match(map, /g === "tools" \? null/);
assert.match(map, /pitch: 0/);
assert.doesNotMatch(map, /lidar3d \? "3D" : "2D"/);

const factory = readFileSync(
  join(root, "src/lib/shi/create-research-map.ts"),
  "utf8",
);
assert.match(factory, /pitch: 0/);
assert.match(factory, /bearing: 0/);

const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
assert.match(css, /display-mode: standalone/);
assert.match(css, /max-width: 1079px/);

const view = readFileSync(
  join(root, "src/components/broker/intelligence/PropertyIntelligenceView.tsx"),
  "utf8",
);
assert.match(view, /sheetSnapAfterSelect/);
assert.match(view, /sheetSnapAfterDraw/);

console.log("research-phone-chrome: ok");
