import type { FeatureCollection } from "geojson";
import type { LatLng } from "@/lib/geo";
import { FREEHAND_SNAP_PX } from "@/lib/shi/freehand";

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

/**
 * Shared freehand draft GeoJSON for SHI + Marketplace draw OS.
 * Small precision vertices + snap magnet when closeable.
 */
export function buildFreehandGeoJSON(
  points: LatLng[],
  tip: LatLng | null,
  canClose: boolean,
): FeatureCollection {
  if (!points.length) return EMPTY_FC;

  const pathPts = tip ? [...points, tip] : points;
  const lineCoords = pathPts.map((p) => [p.lng, p.lat]);
  const features: FeatureCollection["features"] = [
    {
      type: "Feature",
      geometry: { type: "LineString", coordinates: lineCoords },
      properties: { kind: "path", closeable: canClose ? 1 : 0 },
    },
  ];

  if (canClose && pathPts.length >= 3) {
    const ring = pathPts.map((p) => [p.lng, p.lat]);
    ring.push(ring[0]!);
    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: { kind: "poly", closeable: 1 },
    });
  }

  const start = points[0]!;
  features.push({
    type: "Feature",
    geometry: { type: "Point", coordinates: [start.lng, start.lat] },
    properties: { kind: "start", closeable: canClose ? 1 : 0 },
  });

  if (canClose) {
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [start.lng, start.lat] },
      properties: { kind: "snap", closeable: 1 },
    });
  }

  const step = Math.max(1, Math.floor(points.length / 48));
  for (let i = 0; i < points.length; i += step) {
    if (i === 0) continue;
    const p = points[i]!;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { kind: "vertex" },
    });
  }
  if (points.length > 1) {
    const last = points[points.length - 1]!;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [last.lng, last.lat] },
      properties: { kind: "vertex" },
    });
  }

  return { type: "FeatureCollection", features };
}

export { FREEHAND_SNAP_PX };
