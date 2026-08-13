/**
 * Armor for Corridors traffic memory + map pack helpers.
 * Run: node scripts/test-traffic-memory.mjs
 */
import assert from "node:assert/strict";

function compareSnaps(previous, current) {
  if (!previous) {
    return {
      previousAt: null,
      appeared: [],
      disappeared: [],
      aadtChanged: [],
      unchangedCount: current.length,
      note: "No prior look stored yet",
    };
  }
  const prevMap = new Map(previous.stations.map((s) => [s.stationId, s]));
  const currMap = new Map(current.map((s) => [s.stationId, s]));
  const appeared = [];
  const disappeared = [];
  const aadtChanged = [];
  let unchangedCount = 0;
  for (const cur of current) {
    const prev = prevMap.get(cur.stationId);
    if (!prev) {
      appeared.push(cur.stationId);
      continue;
    }
    if (prev.latestAadt !== cur.latestAadt) {
      aadtChanged.push({
        stationId: cur.stationId,
        delta: (cur.latestAadt ?? 0) - (prev.latestAadt ?? 0),
      });
    } else unchangedCount += 1;
  }
  for (const prev of previous.stations) {
    if (!currMap.has(prev.stationId)) disappeared.push(prev.stationId);
  }
  return { appeared, disappeared, aadtChanged, unchangedCount, previousAt: previous.capturedAt };
}

function topStationsForPack(stations, limit = 12) {
  return [...stations]
    .filter((s) => s.latestAadt != null)
    .sort((a, b) => (b.latestAadt ?? 0) - (a.latestAadt ?? 0))
    .slice(0, limit);
}

const prev = {
  countyFips: "48373",
  capturedAt: "2026-01-01T00:00:00.000Z",
  stations: [
    { stationId: "A", onRoad: "US 59", latestYear: 2023, latestAadt: 10000 },
    { stationId: "B", onRoad: "SH 146", latestYear: 2023, latestAadt: 4000 },
    { stationId: "C", onRoad: "FM 1", latestYear: 2023, latestAadt: 800 },
  ],
};

const curr = [
  { stationId: "A", onRoad: "US 59", latestYear: 2024, latestAadt: 12000 },
  { stationId: "B", onRoad: "SH 146", latestYear: 2023, latestAadt: 4000 },
  { stationId: "D", onRoad: "New Rd", latestYear: 2024, latestAadt: 500 },
];

const diff = compareSnaps(prev, curr);
assert.equal(diff.aadtChanged.length, 1);
assert.equal(diff.aadtChanged[0].stationId, "A");
assert.equal(diff.aadtChanged[0].delta, 2000);
assert.deepEqual(diff.appeared, ["D"]);
assert.deepEqual(diff.disappeared, ["C"]);
assert.equal(diff.unchangedCount, 1);

const empty = compareSnaps(null, curr);
assert.equal(empty.previousAt, null);
assert.equal(empty.unchangedCount, 3);

const top = topStationsForPack(
  [
    { stationId: "1", latestAadt: 100 },
    { stationId: "2", latestAadt: 900 },
    { stationId: "3", latestAadt: null },
    { stationId: "4", latestAadt: 500 },
  ],
  2,
);
assert.deepEqual(
  top.map((s) => s.stationId),
  ["2", "4"],
);

console.log("traffic-memory armor: ok");
