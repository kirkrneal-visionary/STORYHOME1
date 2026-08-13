/**
 * Armor for Corridors map nav-lock + freehand undo helpers.
 * Run: node scripts/test-corridor-nav-lock.mjs
 */
import assert from "node:assert/strict";

function isDrawTool(tool) {
  return tool === "freehand" || tool === "rectangle" || tool === "radius";
}

function freehandUndoLast(session) {
  if (session.points.length <= 1) {
    return { active: false, leftStart: false, points: [], canClose: false };
  }
  const points = session.points.slice(0, -1);
  return {
    active: false,
    leftStart: points.length >= 2,
    points,
    canClose: false,
  };
}

function setMapNavigationLocked(map, locked) {
  if (locked) {
    map.dragPan.disable();
    map.dragRotate.disable();
    map.touchZoomRotate.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
  } else {
    map.dragPan.enable();
    map.dragRotate.enable();
    map.touchZoomRotate.enable();
    map.doubleClickZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
  }
}

assert.equal(isDrawTool("freehand"), true);
assert.equal(isDrawTool("pan"), false);
assert.equal(isDrawTool("traffic"), false);

const calls = [];
const map = {
  dragPan: {
    enable: () => calls.push("pan:on"),
    disable: () => calls.push("pan:off"),
  },
  dragRotate: {
    enable: () => calls.push("rot:on"),
    disable: () => calls.push("rot:off"),
  },
  touchZoomRotate: {
    enable: () => calls.push("touch:on"),
    disable: () => calls.push("touch:off"),
  },
  doubleClickZoom: {
    enable: () => calls.push("dbl:on"),
    disable: () => calls.push("dbl:off"),
  },
  boxZoom: {
    enable: () => calls.push("box:on"),
    disable: () => calls.push("box:off"),
  },
  keyboard: {
    enable: () => calls.push("key:on"),
    disable: () => calls.push("key:off"),
  },
};

setMapNavigationLocked(map, true);
assert.ok(calls.includes("pan:off"));
assert.ok(calls.includes("touch:off"));
assert.ok(!calls.includes("pan:on"));

const undone = freehandUndoLast({
  active: true,
  leftStart: true,
  points: [
    { lat: 1, lng: 1 },
    { lat: 2, lng: 2 },
    { lat: 3, lng: 3 },
  ],
  canClose: false,
});
assert.equal(undone.points.length, 2);
assert.equal(freehandUndoLast({ points: [{ lat: 1, lng: 1 }] }).points.length, 0);

console.log("corridor-nav-lock armor: ok");
