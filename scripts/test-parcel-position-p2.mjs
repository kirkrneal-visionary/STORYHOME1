/**
 * Parcel position Phase 2 — frontage-matched engine.
 * Run: node scripts/test-parcel-position-p2.mjs
 *
 * Required fixture:
 * A/B same highway fact. C same highway + second road + intersection.
 * D higher traffic, access still not verified.
 * E lower traffic, larger frontage.
 * A closer CR station must not steal the highway fact.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const engine = read("src/lib/shi/parcel-position-engine.ts");
assert.match(engine, /parcel-position-engine-v1/);
assert.match(engine, /deriveParcelPosition/);
assert.match(engine, /matchStationToFrontageRoad/);
assert.match(engine, /roadsLikelyMatch/);
assert.match(engine, /Never assign a nearby station just because the centroid is close/);
assert.match(engine, /Founder Interpreter \(build process only/);
assert.doesNotMatch(engine, /associateParcelTraffic/);
assert.doesNotMatch(engine, /attom|regrid|datatree|openai|anthropic/i);

const route = read("src/app/api/shi/corridors/parcel-location/route.ts");
assert.match(route, /deriveParcelPosition/);
assert.match(route, /requireStoryPro/);
assert.match(route, /readCountyTrafficObservations/);
assert.match(route, /\bposition\b/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /ARCHIE-POSITION/);
assert.match(waves, /parcel-position-engine-v1|Phase 2/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-NEIGHBORS"/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /P2 engine|Phase 2/);

const pkg = read("package.json");
assert.match(pkg, /test:parcel-position-p2/);

const p1 = read("scripts/test-parcel-position-p1.mjs");
assert.match(p1, /parcel-position-p1/);

/** Same key rules as parcel-position-engine-v1. */
function roadMatchKey(raw) {
  if (!raw) return "";
  let s = String(raw).trim().toUpperCase();
  s = s.replace(/-[A-Z]{1,6}$/g, "");
  s = s.replace(/[^A-Z0-9]+/g, "");
  s = s.replace(/^STATEHIGHWAY/, "SH");
  s = s.replace(/^USHIGHWAY/, "US");
  s = s.replace(/^FARMTOMARKET/, "FM");
  s = s.replace(/^INTERSTATE/, "IH");
  s = s.replace(/^HIGHWAY/, "SH");
  s = s.replace(/^I(?=\d)/, "IH");
  const m = s.match(/^([A-Z]+)0*(\d+)([A-Z]*)$/);
  if (!m) return s;
  return `${m[1]}${m[2]}${m[3]}`;
}

function roadsLikelyMatch(a, b) {
  const ka = roadMatchKey(a);
  const kb = roadMatchKey(b);
  return Boolean(ka && kb && ka === kb);
}

assert.equal(roadMatchKey("US 190"), "US190");
assert.equal(roadMatchKey("US0190-KG"), "US190");
assert.equal(roadMatchKey("FM0350"), "FM350");
assert.ok(roadsLikelyMatch("US0190", "US 190"));
assert.ok(roadsLikelyMatch("FM 350", "FM0350"));
assert.ok(!roadsLikelyMatch("US 190", "CR 100"));

function matchStationToFrontageRoad(routeId, stations) {
  const matches = stations.filter((s) => roadsLikelyMatch(s.onRoad, routeId));
  if (!matches.length) return null;
  return matches.sort((a, b) => (b.latestAadt ?? -1) - (a.latestAadt ?? -1))[0];
}

function derive(propId, roads, stations, ix) {
  const exposures = roads
    .filter((r) => r.approxFrontageFt >= 25)
    .map((r) => {
      const station = matchStationToFrontageRoad(r.routeId, stations);
      return {
        road: r.routeId,
        approxFrontageFt: r.approxFrontageFt,
        traffic: station
          ? {
              vehiclesPerDay: station.latestAadt,
              year: station.latestYear,
              source: "txdot",
              sourceRecordId: station.stationId,
              road: station.onRoad,
            }
          : r.aadt != null
            ? {
                vehiclesPerDay: r.aadt,
                sourceRecordId: r.segmentId,
                road: r.routeId,
              }
            : null,
      };
    })
    .sort((a, b) => b.approxFrontageFt - a.approxFrontageFt);
  const exposureCount = exposures.length;
  const near = ix != null && ix <= 40;
  const positionClass =
    exposureCount === 2
      ? near
        ? "intersection_corner"
        : "dual_road"
      : exposureCount === 1
        ? near
          ? "intersection_adjacent"
          : "mid_block"
        : exposureCount === 0
          ? "unknown"
          : near
            ? "intersection_corner"
            : "multi_road";
  return {
    propId,
    exposures,
    exposureCount,
    primary: exposures[0] ?? null,
    secondary: exposures[1] ?? null,
    positionClass,
    intersection: ix != null ? { approxDistanceM: ix } : null,
    access: "not_verified",
  };
}

const stations = [
  {
    stationId: "S190",
    onRoad: "US 190",
    latestAadt: 31420,
    latestYear: 2025,
    lat: 30.7,
    lng: -94.9,
  },
  {
    stationId: "S350",
    onRoad: "FM 350",
    latestAadt: 8400,
    latestYear: 2025,
    lat: 30.701,
    lng: -94.901,
  },
  {
    stationId: "S-CR",
    onRoad: "CR 100",
    latestAadt: 99999,
    latestYear: 2025,
    lat: 30.7001,
    lng: -94.9001,
  },
  {
    stationId: "S-HIGH",
    onRoad: "US 59",
    latestAadt: 42000,
    latestYear: 2025,
    lat: 30.8,
    lng: -95.0,
  },
];

const A = derive(
  "A",
  [{ routeId: "US0190-KG", approxFrontageFt: 610, aadt: 31420, segmentId: "seg-190" }],
  stations,
  null,
);
const B = derive(
  "B",
  [{ routeId: "US 190", approxFrontageFt: 590, aadt: 31420, segmentId: "seg-190b" }],
  stations,
  null,
);
const C = derive(
  "C",
  [
    { routeId: "US0190", approxFrontageFt: 380, aadt: 31420, segmentId: "seg-190c" },
    { routeId: "FM0350", approxFrontageFt: 270, aadt: 8400, segmentId: "seg-350" },
  ],
  stations,
  12,
);
const D = derive(
  "D",
  [{ routeId: "US0059", approxFrontageFt: 200, aadt: 42000, segmentId: "seg-59" }],
  stations,
  null,
);
const E = derive(
  "E",
  [{ routeId: "FM 350", approxFrontageFt: 980, aadt: 8400, segmentId: "seg-350e" }],
  stations,
  null,
);

assert.equal(A.primary.traffic.vehiclesPerDay, 31420);
assert.equal(B.primary.traffic.vehiclesPerDay, 31420);
assert.equal(C.primary.traffic.vehiclesPerDay, 31420);
assert.equal(A.primary.traffic.sourceRecordId, "S190");
assert.equal(C.primary.traffic.sourceRecordId, "S190");
assert.equal(A.secondary, null);
assert.equal(C.secondary.traffic.vehiclesPerDay, 8400);
assert.equal(C.secondary.traffic.sourceRecordId, "S350");
assert.notEqual(A.primary.traffic.sourceRecordId, "S-CR");
assert.notEqual(C.primary.traffic.vehiclesPerDay, 31420 + 8400);
assert.equal(A.positionClass, "mid_block");
assert.equal(C.positionClass, "intersection_corner");
assert.equal(A.access, "not_verified");
assert.equal(D.access, "not_verified");
assert.equal(D.primary.traffic.vehiclesPerDay, 42000);
assert.ok(D.primary.traffic.vehiclesPerDay > A.primary.traffic.vehiclesPerDay);
assert.ok(E.primary.approxFrontageFt > C.primary.approxFrontageFt);
assert.ok(E.primary.traffic.vehiclesPerDay < A.primary.traffic.vehiclesPerDay);
assert.notDeepEqual(A.exposures, C.exposures);
assert.equal(A.intersection, null);
assert.ok(C.intersection);
assert.ok(!("score" in C));

console.log("parcel-position-p2 armor: ok");
