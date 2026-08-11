import type { Map as MapLibreMap } from "maplibre-gl";
import type { LatLng } from "@/lib/geo";
import { SHI_CAPS } from "@/lib/shi/caps";
import {
  FREEHAND_MIN_STEP_PX,
  FREEHAND_SNAP_PX,
  finalizeFreehandPoints,
  isNearStart,
  pointsFarEnoughPx,
} from "@/lib/shi/freehand";

/** Shared freehand draw state for SHI + Marketplace Draw OS. */
export type FreehandSession = {
  active: boolean;
  leftStart: boolean;
  points: LatLng[];
  canClose: boolean;
};

export function emptyFreehandSession(): FreehandSession {
  return { active: false, leftStart: false, points: [], canClose: false };
}

export function freehandPointerDown(
  map: MapLibreMap,
  session: FreehandSession,
  tip: LatLng,
): FreehandSession {
  const next: FreehandSession = {
    ...session,
    active: true,
    points: [...session.points],
  };
  if (next.points.length === 0) {
    next.points = [tip];
    next.leftStart = false;
    next.canClose = false;
    return next;
  }
  const last = next.points[next.points.length - 1]!;
  if (
    pointsFarEnoughPx(map, last, tip, FREEHAND_MIN_STEP_PX) &&
    next.points.length < SHI_CAPS.maxFreehandVertices
  ) {
    next.points.push(tip);
  }
  return next;
}

export function freehandPointerMove(
  map: MapLibreMap,
  session: FreehandSession,
  tip: LatLng,
): FreehandSession {
  if (!session.points.length) return session;
  const next: FreehandSession = {
    ...session,
    points: [...session.points],
  };
  const start = next.points[0]!;

  if (next.active) {
    const last = next.points[next.points.length - 1]!;
    if (
      pointsFarEnoughPx(map, last, tip, FREEHAND_MIN_STEP_PX) &&
      next.points.length < SHI_CAPS.maxFreehandVertices
    ) {
      next.points.push(tip);
    }
    if (
      !next.leftStart &&
      pointsFarEnoughPx(map, start, tip, FREEHAND_SNAP_PX * 2.2)
    ) {
      next.leftStart = true;
    }
  }

  next.canClose =
    next.leftStart &&
    next.points.length >= SHI_CAPS.minFreehandVertices &&
    isNearStart(map, tip, start, FREEHAND_SNAP_PX);
  return next;
}

/** Returns sealed polygon points, or null if not ready. */
export function freehandSealPoints(session: FreehandSession): LatLng[] | null {
  if (!session.canClose) return null;
  const pts = finalizeFreehandPoints(session.points);
  if (pts.length < SHI_CAPS.minFreehandVertices) return null;
  return pts;
}

export function freehandForceSeal(session: FreehandSession): LatLng[] | null {
  const pts = finalizeFreehandPoints(session.points);
  if (pts.length < SHI_CAPS.minFreehandVertices) return null;
  return pts;
}
