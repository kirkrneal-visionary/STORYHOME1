/**
 * Runtime A–E on the real comparePropertySites (primary-road traffic only).
 * Invoked by test-parcel-position-compare.mjs via tsx.
 */
import assert from "node:assert/strict";
import { buildParcelPosition } from "../src/lib/shi/parcel-position";
import { comparePropertySites } from "../src/lib/shi/corridor-property-compare";
import type { CorridorParcelPick } from "../src/lib/shi/corridor-parcel-traffic";

const T = 31420;
const HIGHWAY = {
  vehiclesPerDay: T,
  year: 2025,
  source: "txdot",
  sourceRecordId: "S190",
  road: "US 190",
  observationKind: "published_aadt" as const,
  distanceMiles: 0.1,
  history: [
    { year: 2023, aadt: 30000 },
    { year: 2025, aadt: T },
  ],
};
const FM = {
  vehiclesPerDay: 8400,
  year: 2025,
  source: "txdot",
  sourceRecordId: "S350",
  road: "FM 350",
  observationKind: "published_aadt" as const,
  distanceMiles: 0.05,
  history: [{ year: 2025, aadt: 8400 }],
};

function pick(
  id: string,
  acres: number,
  address: string,
): CorridorParcelPick {
  return {
    propId: id,
    source: "polk_cad",
    lat: 30.7,
    lng: -94.9,
    situsAddress: address,
    ownerName: null,
    legalAcreage: acres,
    marketValue: null,
  };
}

const posA = buildParcelPosition({
  propId: "A",
  exposures: [{ road: "US 190", approxFrontageFt: 610, traffic: HIGHWAY, segmentId: "a" }],
});
const posB = buildParcelPosition({
  propId: "B",
  exposures: [{ road: "US 190", approxFrontageFt: 590, traffic: HIGHWAY, segmentId: "b" }],
});
const posC = buildParcelPosition({
  propId: "C",
  exposures: [
    { road: "US 190", approxFrontageFt: 380, traffic: HIGHWAY, segmentId: "c1" },
    { road: "FM 350", approxFrontageFt: 270, traffic: FM, segmentId: "c2" },
  ],
  intersection: { approxDistanceM: 12, roads: ["US 190", "FM 350"] },
});
const posD = buildParcelPosition({
  propId: "D",
  exposures: [
    {
      road: "US 59",
      approxFrontageFt: 200,
      traffic: { ...HIGHWAY, vehiclesPerDay: 42000, sourceRecordId: "S-HIGH", road: "US 59" },
      segmentId: "d",
    },
  ],
});
const posE = buildParcelPosition({
  propId: "E",
  exposures: [{ road: "FM 350", approxFrontageFt: 980, traffic: FM, segmentId: "e" }],
});

const ab = comparePropertySites(
  [
    { pick: pick("A", 4, "Site A"), position: posA, label: "Site A" },
    { pick: pick("B", 1.59, "Site B"), position: posB, label: "Site B" },
  ],
  [],
);
const ac = comparePropertySites(
  [
    { pick: pick("A", 4, "Site A"), position: posA, label: "Site A" },
    { pick: pick("C", 0.9, "Site C"), position: posC, label: "Site C" },
  ],
  [],
);
const de = comparePropertySites(
  [
    { pick: pick("D", 0.4, "Site D"), position: posD, label: "Site D" },
    { pick: pick("E", 12, "Site E"), position: posE, label: "Site E" },
  ],
  [],
);

const traffic = (r: typeof ab, id: string) => r.rows.find((row) => row.id === id);

assert.equal(ab.ruleVersion, "corridor-property-compare-v1");
assert.deepEqual(traffic(ab, "traffic")?.values, ["31,420/day", "31,420/day"]);
assert.notEqual(traffic(ab, "frontage")?.values[0], traffic(ab, "frontage")?.values[1]);
assert.notEqual(traffic(ab, "acreage")?.values[0], traffic(ab, "acreage")?.values[1]);
assert.match(ab.summary, /same published US 190 count/);
assert.match(ab.summary, /differ/);
assert.match(ab.summary, /No automatic winner/);
assert.doesNotMatch(ab.summary, /best/i);

assert.deepEqual(traffic(ac, "traffic")?.values, ["31,420/day", "31,420/day"]);
assert.equal(traffic(ac, "secondRoad")?.values[0], "—");
assert.match(String(traffic(ac, "secondRoad")?.values[1]), /FM 350/);
assert.match(String(traffic(ac, "secondRoad")?.values[1]), /8,400/);
assert.equal(traffic(ac, "intersection")?.values[0], "—");
assert.match(String(traffic(ac, "intersection")?.values[1]), /Crossing/);
assert.deepEqual(traffic(ac, "access")?.values, ["Not verified", "Not verified"]);
assert.doesNotMatch(JSON.stringify(ac), /39,?820/);
assert.doesNotMatch(ac.summary, /best/i);

assert.ok(
  Number(String(traffic(de, "traffic")?.values[0]).replace(/[^\d]/g, "")) >
    Number(String(traffic(de, "traffic")?.values[1]).replace(/[^\d]/g, "")),
);
assert.match(de.summary, /not automatically the better site/);
assert.match(de.summary, /No automatic winner/);
assert.doesNotMatch(de.summary, /\bbest\b/i);
assert.ok(posE.combinedApproxFrontageFt > posA.combinedApproxFrontageFt);

console.log("run-compare-ae runtime: ok");
