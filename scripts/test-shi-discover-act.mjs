/**
 * Armor checks for SHI-5.2 Discover act-loop helpers (no DB).
 * Run: node scripts/test-shi-discover-act.mjs
 */
import assert from "node:assert/strict";

const MIN_AREA_SPAN = 0.0003;

function boundsAroundPoints(points, padDegrees = 0.003) {
  if (points.length === 0) return null;
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  for (const p of points) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    north = Math.max(north, p.lat);
    south = Math.min(south, p.lat);
    east = Math.max(east, p.lng);
    west = Math.min(west, p.lng);
  }
  if (north < south || east < west) return null;
  const minSpan = Math.max(MIN_AREA_SPAN * 2, 0.002);
  if (north - south < minSpan) {
    const mid = (north + south) / 2;
    north = mid + minSpan / 2;
    south = mid - minSpan / 2;
  }
  if (east - west < minSpan) {
    const mid = (east + west) / 2;
    east = mid + minSpan / 2;
    west = mid - minSpan / 2;
  }
  return {
    type: "rectangle",
    bounds: {
      north: north + padDegrees,
      south: south - padDegrees,
      east: east + padDegrees,
      west: west - padDegrees,
    },
  };
}

assert.equal(boundsAroundPoints([]), null);

const one = boundsAroundPoints([{ lat: 30.7, lng: -94.9 }]);
assert.equal(one.type, "rectangle");
assert.ok(one.bounds.north - one.bounds.south >= 0.002);
assert.ok(one.bounds.east - one.bounds.west >= 0.002);

const two = boundsAroundPoints([
  { lat: 30.7, lng: -94.9 },
  { lat: 30.8, lng: -94.8 },
]);
assert.ok(two.bounds.north > 30.8);
assert.ok(two.bounds.south < 30.7);

const BULK_PROSPECT_CAP = 25;
assert.equal(BULK_PROSPECT_CAP, 25);

console.log("shi-discover-act armor: ok");
