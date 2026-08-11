/**
 * Backlog harden checks (pure helpers mirrored from src).
 * Run via: npm run test:shi
 */
import assert from "node:assert/strict";

const SHI_CAPS = {
  maxParcelsPerAnalyze: 1500,
  maxAreaSpanDegrees: 0.45,
  minAreaSpanDegrees: 0.0003,
};

function validateBoundaryCaps(boundary) {
  if (boundary.type !== "rectangle") return { ok: false };
  const b = boundary.bounds;
  const latSpan = b.north - b.south;
  const lngSpan = b.east - b.west;
  if (latSpan <= 0 || lngSpan <= 0) return { ok: false, error: "invalid" };
  if (
    latSpan < SHI_CAPS.minAreaSpanDegrees &&
    lngSpan < SHI_CAPS.minAreaSpanDegrees
  ) {
    return { ok: false, error: "too-small" };
  }
  if (
    latSpan > SHI_CAPS.maxAreaSpanDegrees ||
    lngSpan > SHI_CAPS.maxAreaSpanDegrees
  ) {
    return { ok: false, error: "too-large" };
  }
  return { ok: true, bounds: b };
}

/** Mirrors analyzeArea capped detection: fetch limit+1. */
function detectScanCap(rowCount, max = SHI_CAPS.maxParcelsPerAnalyze) {
  const hitCap = rowCount >= max + 1;
  const kept = hitCap ? max : rowCount;
  return { hitCap, kept };
}

function formatShiVaultError(err) {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (/shi_study_folders|schema cache/i.test(msg)) {
    return "Study Vault is not set up";
  }
  return msg;
}

// County stick: frame keeps its own county even if UI selector changes.
const frame = { countySource: "polk_cad", boundary: { type: "rectangle", bounds: { north: 30.2, south: 30.1, east: -94.9, west: -95.0 } } };
const uiSource = "liberty_cad";
const analyzeSource = frame.countySource || uiSource;
assert.equal(analyzeSource, "polk_cad");

// Caps
assert.equal(
  validateBoundaryCaps({
    type: "rectangle",
    bounds: { north: 32, south: 30, east: -94, west: -96 },
  }).ok,
  false,
);
assert.equal(detectScanCap(1501).hitCap, true);
assert.equal(detectScanCap(1501).kept, 1500);
assert.equal(detectScanCap(40).hitCap, false);

// Vault error mapping
assert.match(
  formatShiVaultError(new Error("Could not find the table 'public.shi_study_folders' in the schema cache")),
  /Study Vault is not set up/,
);

// Folder move destination capacity
function canMoveToFolder(destCount, max = 40) {
  return destCount < max;
}
assert.equal(canMoveToFolder(39), true);
assert.equal(canMoveToFolder(40), false);

// Box draft GeoJSON (rubber-band) — mirrors src/lib/map-draw/box-draft.ts
function buildBoxDraftGeoJSON(corner, tip) {
  const features = [
    {
      type: "Feature",
      properties: { kind: "corner" },
      geometry: { type: "Point", coordinates: [corner.lng, corner.lat] },
    },
  ];
  if (!tip) return { type: "FeatureCollection", features };
  const north = Math.max(corner.lat, tip.lat);
  const south = Math.min(corner.lat, tip.lat);
  const east = Math.max(corner.lng, tip.lng);
  const west = Math.min(corner.lng, tip.lng);
  features.push({
    type: "Feature",
    properties: { kind: "poly" },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [west, north],
          [east, north],
          [east, south],
          [west, south],
          [west, north],
        ],
      ],
    },
  });
  return { type: "FeatureCollection", features };
}
const draft = buildBoxDraftGeoJSON(
  { lat: 30.0, lng: -95.1 },
  { lat: 30.1, lng: -95.0 },
);
assert.ok(draft.features.some((f) => f.properties.kind === "poly"));
assert.equal(
  validateBoundaryCaps({
    type: "rectangle",
    bounds: { north: 30.1, south: 30.0, east: -95.0, west: -95.1 },
  }).ok,
  true,
);

// Thumbnail byte-size estimate — mirrors fitThumbnailDataUrl early-exit
function approxDataUrlBytes(dataUrl) {
  return Math.ceil(((dataUrl.length - dataUrl.indexOf(",")) * 3) / 4);
}
const tiny = "data:image/jpeg;base64," + "A".repeat(40);
assert.ok(approxDataUrlBytes(tiny) < 100_000);

console.log("shi-backlog: ok");
