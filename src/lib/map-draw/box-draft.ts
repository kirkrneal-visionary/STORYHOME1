import type { FeatureCollection } from "geojson";
import type { LatLng } from "@/lib/geo";

/** Rubber-band rectangle while the box tool waits for the second corner. */
export function buildBoxDraftGeoJSON(
  corner: LatLng,
  tip: LatLng | null,
): FeatureCollection {
  const features: FeatureCollection["features"] = [
    {
      type: "Feature",
      properties: { kind: "corner" },
      geometry: {
        type: "Point",
        coordinates: [corner.lng, corner.lat],
      },
    },
  ];
  if (!tip) {
    return { type: "FeatureCollection", features };
  }
  const north = Math.max(corner.lat, tip.lat);
  const south = Math.min(corner.lat, tip.lat);
  const east = Math.max(corner.lng, tip.lng);
  const west = Math.min(corner.lng, tip.lng);
  const ring: number[][] = [
    [west, north],
    [east, north],
    [east, south],
    [west, south],
    [west, north],
  ];
  features.push(
    {
      type: "Feature",
      properties: { kind: "poly" },
      geometry: { type: "Polygon", coordinates: [ring] },
    },
    {
      type: "Feature",
      properties: { kind: "tip" },
      geometry: {
        type: "Point",
        coordinates: [tip.lng, tip.lat],
      },
    },
  );
  return { type: "FeatureCollection", features };
}
