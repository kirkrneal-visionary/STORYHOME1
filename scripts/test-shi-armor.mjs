/**
 * Armor checks for SHI Draw OS + boundary caps (no DB).
 * Run: node scripts/test-shi-armor.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// Lightweight pure re-implementations mirroring src/lib/shi/* (keeps script dependency-free).
const SHI_CAPS = {
  maxFreehandVertices: 400,
  minFreehandVertices: 3,
  maxAreaSpanDegrees: 0.45,
  minAreaSpanDegrees: 0.0003,
};

function downsample(points, max) {
  if (points.length <= max) return points;
  const out = [points[0]];
  const step = (points.length - 1) / (max - 1);
  for (let i = 1; i < max - 1; i++) out.push(points[Math.round(i * step)]);
  out.push(points[points.length - 1]);
  return out;
}

function finalizeFreehandPoints(points) {
  if (points.length < 3) return points;
  const capped =
    points.length > SHI_CAPS.maxFreehandVertices
      ? downsample(points, SHI_CAPS.maxFreehandVertices)
      : points;
  const first = capped[0];
  const last = capped[capped.length - 1];
  if (first.lat === last.lat && first.lng === last.lng) {
    return capped.slice(0, -1);
  }
  return capped;
}

function boundsOfBoundary(boundary) {
  if (boundary.type === "rectangle" || boundary.type === "viewport") {
    return boundary.bounds;
  }
  if (boundary.type === "circle") {
    const { center, radiusMiles } = boundary;
    const latR = radiusMiles / 69;
    const lngR =
      radiusMiles / (69 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180)));
    return {
      north: center.lat + latR,
      south: center.lat - latR,
      east: center.lng + lngR,
      west: center.lng - lngR,
    };
  }
  if (boundary.type === "polygon" && boundary.points.length >= 3) {
    let north = -90,
      south = 90,
      east = -180,
      west = 180;
    for (const p of boundary.points) {
      north = Math.max(north, p.lat);
      south = Math.min(south, p.lat);
      east = Math.max(east, p.lng);
      west = Math.min(west, p.lng);
    }
    return { north, south, east, west };
  }
  return null;
}

function validateBoundaryCaps(boundary) {
  const bounds = boundsOfBoundary(boundary);
  if (!bounds) return { ok: false, error: "missing" };
  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;
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
  return { ok: true, bounds };
}

function buildFreehandGeoJSON(points, tip, canClose) {
  if (!points.length) return { type: "FeatureCollection", features: [] };
  const pathPts = tip ? [...points, tip] : points;
  const features = [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: pathPts.map((p) => [p.lng, p.lat]),
      },
      properties: { kind: "path", closeable: canClose ? 1 : 0 },
    },
  ];
  if (canClose && pathPts.length >= 3) {
    const ring = pathPts.map((p) => [p.lng, p.lat]);
    ring.push(ring[0]);
    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: { kind: "poly", closeable: 1 },
    });
  }
  return { type: "FeatureCollection", features };
}

// --- tests ---
const pts = Array.from({ length: 500 }, (_, i) => ({
  lat: 30 + i * 0.00001,
  lng: -95 - i * 0.00001,
}));
const finalized = finalizeFreehandPoints(pts);
assert.equal(finalized.length, SHI_CAPS.maxFreehandVertices);

const tiny = validateBoundaryCaps({
  type: "rectangle",
  bounds: { north: 30.00001, south: 30, east: -95, west: -95.00001 },
});
assert.equal(tiny.ok, false);

const huge = validateBoundaryCaps({
  type: "rectangle",
  bounds: { north: 32, south: 30, east: -94, west: -96 },
});
assert.equal(huge.ok, false);

const okBox = validateBoundaryCaps({
  type: "rectangle",
  bounds: { north: 30.1, south: 30.0, east: -95.0, west: -95.1 },
});
assert.equal(okBox.ok, true);

const freehandPoly = {
  type: "polygon",
  points: [
    { lat: 30.05, lng: -95.05 },
    { lat: 30.06, lng: -95.05 },
    { lat: 30.06, lng: -95.04 },
    { lat: 30.05, lng: -95.04 },
  ],
};
assert.equal(validateBoundaryCaps(freehandPoly).ok, true);

const fc = buildFreehandGeoJSON(freehandPoly.points, null, true);
assert.ok(fc.features.some((f) => f.properties.kind === "poly"));

console.log("shi-armor: ok");
void createRequire;
