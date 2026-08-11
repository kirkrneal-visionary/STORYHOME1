import type { Map as MapLibreMap } from "maplibre-gl";
import { distanceMiles, type LatLng } from "@/lib/geo";
import { SHI_CAPS } from "@/lib/shi/caps";

/** Screen-pixel magnet for closing a freehand loop (precise but usable). */
export const FREEHAND_SNAP_PX = 14;
/** Min movement before logging another vertex (keeps paths smooth, not noisy). */
export const FREEHAND_MIN_STEP_PX = 3;
/** Visible vertex radius — small for precision; hit target is larger in UI. */
export const FREEHAND_VERTEX_RADIUS_PX = 2.25;

/**
 * Convert a screen-pixel radius at map center into approximate miles.
 * Used for snap-close recognition that stays consistent across zoom.
 */
export function pixelRadiusMiles(map: MapLibreMap, px: number): number {
  const c = map.getCenter();
  const p = map.project(c);
  const ll = map.unproject([p.x + px, p.y]);
  return Math.max(distanceMiles({ lat: c.lat, lng: c.lng }, { lat: ll.lat, lng: ll.lng }), 1e-9);
}

export function pointsFarEnoughPx(
  map: MapLibreMap,
  a: LatLng,
  b: LatLng,
  minPx: number,
): boolean {
  const pa = map.project([a.lng, a.lat]);
  const pb = map.project([b.lng, b.lat]);
  const dx = pa.x - pb.x;
  const dy = pa.y - pb.y;
  return Math.hypot(dx, dy) >= minPx;
}

export function isNearStart(
  map: MapLibreMap,
  tip: LatLng,
  start: LatLng,
  snapPx = FREEHAND_SNAP_PX,
): boolean {
  if (!start) return false;
  const miles = pixelRadiusMiles(map, snapPx);
  return distanceMiles(tip, start) <= miles;
}

/**
 * Cap + light spacing cleanup so freehand never grows without bound.
 */
export function finalizeFreehandPoints(points: LatLng[]): LatLng[] {
  if (points.length < 3) return points;
  const capped =
    points.length > SHI_CAPS.maxFreehandVertices
      ? downsample(points, SHI_CAPS.maxFreehandVertices)
      : points;
  // Ensure closed ring does not duplicate the first point at the end.
  const first = capped[0]!;
  const last = capped[capped.length - 1]!;
  if (first.lat === last.lat && first.lng === last.lng) {
    return capped.slice(0, -1);
  }
  return capped;
}

function downsample(points: LatLng[], max: number): LatLng[] {
  if (points.length <= max) return points;
  const out: LatLng[] = [points[0]!];
  const step = (points.length - 1) / (max - 1);
  for (let i = 1; i < max - 1; i++) {
    out.push(points[Math.round(i * step)]!);
  }
  out.push(points[points.length - 1]!);
  return out;
}
