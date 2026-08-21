/**
 * Parcel position Phase 1 — model + observation cache reader.
 * Run: node scripts/test-parcel-position-p1.mjs
 *
 * A/B/C share one highway traffic fact. C gets a second road.
 * D is high traffic + access not verified. E is large frontage.
 * Never add AADT. Never copy a neighbor's derived fields.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const model = read("src/lib/shi/parcel-position.ts");
assert.match(model, /parcel-position-v1/);
assert.match(model, /buildParcelPosition/);
assert.match(model, /not_verified/);
assert.match(model, /Founder Interpreter \(build process only/);
assert.match(model, /Never add two roads' AADT/);
assert.doesNotMatch(model, /combinedVehiclesPerDay|97\/100/);
assert.doesNotMatch(model, /attom|regrid|datatree|openai|anthropic/i);

const cache = read("src/lib/shi/traffic-observation-cache.ts");
assert.match(cache, /readCountyTrafficObservations/);
assert.match(cache, /corridor_traffic_observations/);
assert.match(cache, /stationsFromCachedObservations/);
assert.doesNotMatch(cache, /SUPABASE_SERVICE_ROLE_KEY/);

const writeCache = read("src/lib/shi/corridor-segment-cache.ts");
assert.match(writeCache, /s\.history/);
assert.match(writeCache, /corridor_traffic_observations/);

const route = read("src/app/api/shi/corridors/traffic/route.ts");
assert.match(route, /requireStoryPro/);
assert.match(route, /readCountyTrafficObservations/);
assert.match(route, /cacheFallback/);
assert.match(route, /softCacheCountyTraffic/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /ARCHIE-POSITION/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-NEIGHBORS"/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /Parcel position/);

const pkg = read("package.json");
assert.match(pkg, /test:parcel-position-p1/);

/** Same classification rules as parcel-position-v1 (keep in lockstep). */
function classifyRoadPosition(exposureCount, intersectionDistanceM) {
  const near =
    intersectionDistanceM != null && intersectionDistanceM <= 40;
  if (exposureCount >= 3) return near ? "intersection_corner" : "multi_road";
  if (exposureCount === 2) return near ? "intersection_corner" : "dual_road";
  if (exposureCount === 1) return near ? "intersection_adjacent" : "mid_block";
  return "unknown";
}

function buildParcelPosition(input) {
  const exposures = [...input.exposures]
    .filter((e) => e.road && e.approxFrontageFt >= 0)
    .sort((a, b) => b.approxFrontageFt - a.approxFrontageFt);
  const exposureCount = exposures.filter((e) => e.approxFrontageFt > 0).length;
  return {
    propId: input.propId,
    algorithmVersion: "parcel-position-v1",
    exposures,
    exposureCount,
    primary: exposures[0] ?? null,
    secondary: exposures[1] ?? null,
    combinedApproxFrontageFt: exposures.reduce(
      (s, e) => s + Math.max(0, e.approxFrontageFt),
      0,
    ),
    positionClass: classifyRoadPosition(
      exposureCount,
      input.intersection?.approxDistanceM ?? null,
    ),
    intersection: input.intersection ?? null,
    access: "not_verified",
  };
}

function sameHighwayTrafficFact(left, right) {
  return (
    left.vehiclesPerDay === right.vehiclesPerDay &&
    left.year === right.year &&
    left.source === right.source &&
    left.sourceRecordId === right.sourceRecordId &&
    left.road === right.road
  );
}

const HIGHWAY = {
  vehiclesPerDay: 31420,
  year: 2025,
  source: "txdot",
  sourceRecordId: "S190",
  road: "US 190",
};
const SECONDARY = {
  vehiclesPerDay: 8400,
  year: 2025,
  source: "txdot",
  sourceRecordId: "S350",
  road: "FM 350",
};

const A = buildParcelPosition({
  propId: "A",
  exposures: [{ road: "US 190", approxFrontageFt: 610, traffic: HIGHWAY }],
});
const B = buildParcelPosition({
  propId: "B",
  exposures: [{ road: "US 190", approxFrontageFt: 590, traffic: HIGHWAY }],
});
const C = buildParcelPosition({
  propId: "C",
  exposures: [
    { road: "US 190", approxFrontageFt: 380, traffic: HIGHWAY },
    { road: "FM 350", approxFrontageFt: 270, traffic: SECONDARY },
  ],
  intersection: { approxDistanceM: 12, roads: ["US 190", "FM 350"] },
});
const D = buildParcelPosition({
  propId: "D",
  exposures: [
    {
      road: "US 190",
      approxFrontageFt: 200,
      traffic: { ...HIGHWAY, vehiclesPerDay: 42000, sourceRecordId: "S-HIGH" },
    },
  ],
});
const E = buildParcelPosition({
  propId: "E",
  exposures: [{ road: "FM 350", approxFrontageFt: 980, traffic: SECONDARY }],
});

assert.equal(A.primary.traffic.vehiclesPerDay, 31420);
assert.equal(B.primary.traffic.vehiclesPerDay, 31420);
assert.equal(C.primary.traffic.vehiclesPerDay, 31420);
assert.ok(sameHighwayTrafficFact(A.primary.traffic, C.primary.traffic));
assert.equal(A.secondary, null);
assert.equal(C.secondary.traffic.vehiclesPerDay, 8400);
assert.equal(C.exposureCount, 2);
assert.equal(A.positionClass, "mid_block");
assert.equal(C.positionClass, "intersection_corner");
assert.equal(A.access, "not_verified");
assert.equal(D.access, "not_verified");
assert.equal(D.primary.traffic.vehiclesPerDay, 42000);
assert.ok(E.combinedApproxFrontageFt >= 980);
assert.notEqual(C.primary.traffic.vehiclesPerDay, 31420 + 8400);
assert.ok(!("score" in C));
assert.notDeepEqual(A.exposures, C.exposures);
assert.equal(A.intersection, null);
assert.ok(C.intersection);

function stationsFromCachedObservations(rows) {
  const by = new Map();
  for (const row of rows) {
    const list = by.get(row.stationId) ?? [];
    list.push(row);
    by.set(row.stationId, list);
  }
  return [...by.entries()].map(([stationId, list]) => {
    const years = [...list].sort((a, b) => b.year - a.year);
    const latest = years.find((y) => y.aadt != null) ?? years[0];
    return { stationId, latestAadt: latest.aadt, historyLen: years.length };
  });
}

const rebuilt = stationsFromCachedObservations([
  { stationId: "S190", year: 2025, aadt: 31420 },
  { stationId: "S190", year: 2021, aadt: 26800 },
  { stationId: "S350", year: 2025, aadt: 8400 },
]);
assert.equal(rebuilt.length, 2);
assert.equal(rebuilt.find((s) => s.stationId === "S190").historyLen, 2);
assert.equal(rebuilt.find((s) => s.stationId === "S190").latestAadt, 31420);

console.log("parcel-position-p1 armor: ok");
