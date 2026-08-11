import type { DrawnBoundary, MapBounds } from "@/lib/geo";
import { SHI_CAPS } from "@/lib/shi/caps";

/** Pure boundary bounding box — used by analyzer + armor tests. */
export function boundsOfBoundary(boundary: DrawnBoundary): MapBounds | null {
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
    let north = -90;
    let south = 90;
    let east = -180;
    let west = 180;
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

export type BoundaryCapResult =
  | { ok: true; bounds: MapBounds }
  | { ok: false; error: string };

/** Server + client safety check before analyze/save. */
export function validateBoundaryCaps(
  boundary: DrawnBoundary,
): BoundaryCapResult {
  const bounds = boundsOfBoundary(boundary);
  if (!bounds) {
    return { ok: false, error: "Draw a box, freehand loop, or radius first" };
  }
  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;
  if (latSpan <= 0 || lngSpan <= 0) {
    return { ok: false, error: "Invalid frame size" };
  }
  if (
    latSpan < SHI_CAPS.minAreaSpanDegrees &&
    lngSpan < SHI_CAPS.minAreaSpanDegrees
  ) {
    return { ok: false, error: "Frame is too small — draw a larger area" };
  }
  if (
    latSpan > SHI_CAPS.maxAreaSpanDegrees ||
    lngSpan > SHI_CAPS.maxAreaSpanDegrees
  ) {
    return {
      ok: false,
      error:
        "Frame is too large — zoom in or draw a smaller market frame (safety cap)",
    };
  }
  return { ok: true, bounds };
}
