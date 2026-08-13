/**
 * Armor for Corridors V.1 analysis contract.
 * Run: node scripts/test-corridor-analysis.mjs
 */
import assert from "node:assert/strict";

function listingInBoundary(point, boundary) {
  if (boundary.type === "rectangle" || boundary.type === "viewport") {
    const b = boundary.bounds;
    return (
      point.lat <= b.north &&
      point.lat >= b.south &&
      point.lng <= b.east &&
      point.lng >= b.west
    );
  }
  return true;
}

function composeLite(opts) {
  const MODEL = "corridors-v1.0.0";
  const inArea = opts.stations.filter((s) =>
    listingInBoundary({ lat: s.lat, lng: s.lng }, opts.boundary),
  );
  const withImprove = opts.area.parcels.filter(
    (p) => (p.improvementValue ?? 0) > 0,
  ).length;
  const observed = [
    { id: "parcels", value: String(opts.area.parcelCount) },
    { id: "stations", value: String(inArea.length) },
  ];
  let confidence = "MODERATE";
  if (opts.area.parcelCount >= 40 && inArea.length >= 2) confidence = "HIGH";
  if (opts.area.parcelCount < 8) confidence = "LIMITED EVIDENCE";
  return {
    modelVersion: MODEL,
    observed,
    stationCount: inArea.length,
    confidence,
    withImprove,
    hasInterpretation: true,
  };
}

const boundary = {
  type: "rectangle",
  bounds: { west: -95.1, south: 30.6, east: -94.8, north: 30.9 },
};

const area = {
  parcelCount: 50,
  parcels: [
    { improvementValue: 10000 },
    { improvementValue: 0 },
    { improvementValue: 5000 },
  ],
};

const stations = [
  { lat: 30.75, lng: -94.95, latestAadt: 12000 },
  { lat: 31.5, lng: -94.95, latestAadt: 8000 }, // outside
  { lat: 30.7, lng: -94.9, latestAadt: 4000 },
];

const r = composeLite({ boundary, area, stations });
assert.equal(r.modelVersion, "corridors-v1.0.0");
assert.equal(r.stationCount, 2);
assert.equal(r.confidence, "HIGH");
assert.equal(r.withImprove, 2);
assert.ok(r.observed.some((o) => o.id === "parcels"));

const thin = composeLite({
  boundary,
  area: { parcelCount: 3, parcels: [] },
  stations: [],
});
assert.equal(thin.confidence, "LIMITED EVIDENCE");

console.log("corridor-analysis armor: ok");
