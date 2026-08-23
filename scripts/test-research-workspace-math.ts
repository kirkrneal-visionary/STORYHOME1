import assert from "node:assert/strict";
import {
  nearestSheetSnap,
  sheetHeightPx,
  snapFromRelease,
  workspaceLayout,
  WORKSPACE_DRAWER_MIN_PX,
} from "../src/lib/shi/research-workspace.ts";

assert.equal(workspaceLayout(390), "sheet");
assert.equal(workspaceLayout(768), "sheet");
assert.equal(workspaceLayout(WORKSPACE_DRAWER_MIN_PX), "drawer");
assert.equal(workspaceLayout(1440), "drawer");

const peek = sheetHeightPx("peek", 800);
const full = sheetHeightPx("full", 800);
assert.ok(peek < full);
assert.ok(peek <= 220, `peek should be a deal card, got ${peek}`);
assert.ok(peek >= 160, `peek too short: ${peek}`);

assert.equal(nearestSheetSnap(sheetHeightPx("collapsed", 800), 800), "collapsed");
assert.equal(
  snapFromRelease({ heightPx: peek, viewportH: 800, velocityY: 0.9 }),
  "collapsed",
);
assert.equal(
  snapFromRelease({ heightPx: peek, viewportH: 800, velocityY: -0.9 }),
  "expanded",
);

console.log("research-workspace math: ok");
