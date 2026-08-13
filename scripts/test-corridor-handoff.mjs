/**
 * Armor for Corridors → Research watch handoff.
 * Run: node scripts/test-corridor-handoff.mjs
 */
import assert from "node:assert/strict";

function watchAreaToBoundary(area) {
  const [minLng, minLat, maxLng, maxLat] = area.bbox;
  return {
    type: "rectangle",
    bounds: {
      west: minLng,
      south: minLat,
      east: maxLng,
      north: maxLat,
    },
  };
}

const area = {
  id: "48373:US0059",
  title: "US 59",
  bbox: [-95.1, 30.6, -94.8, 30.9],
  center: { lat: 30.75, lng: -94.95 },
};
const b = watchAreaToBoundary(area);
assert.equal(b.type, "rectangle");
assert.ok(b.bounds.west < b.bounds.east);
assert.ok(b.bounds.south < b.bounds.north);
console.log("corridor-handoff armor: ok");
