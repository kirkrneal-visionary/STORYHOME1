import type { DrawnBoundary, LatLng } from "@/lib/geo";
import { SHI_CAPS } from "@/lib/shi/caps";

/**
 * Build a rectangle farm boundary around selected Discover centroids.
 * Pads and enforces min span so createFarm / analyzeArea accept it.
 */
export function boundsAroundPoints(
  points: LatLng[],
  padDegrees = 0.003,
): DrawnBoundary | null {
  if (points.length === 0) return null;

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  for (const p of points) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    north = Math.max(north, p.lat);
    south = Math.min(south, p.lat);
    east = Math.max(east, p.lng);
    west = Math.min(west, p.lng);
  }
  if (north < south || east < west) return null;

  const minSpan = Math.max(SHI_CAPS.minAreaSpanDegrees * 2, 0.002);
  if (north - south < minSpan) {
    const mid = (north + south) / 2;
    north = mid + minSpan / 2;
    south = mid - minSpan / 2;
  }
  if (east - west < minSpan) {
    const mid = (east + west) / 2;
    east = mid + minSpan / 2;
    west = mid - minSpan / 2;
  }

  return {
    type: "rectangle",
    bounds: {
      north: north + padDegrees,
      south: south - padDegrees,
      east: east + padDegrees,
      west: west - padDegrees,
    },
  };
}
