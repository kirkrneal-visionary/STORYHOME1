/**
 * Story Continuum — physics helpers for gesture + temperature.
 * Walk rooms of one house. Hand stays honest until commit.
 */

import {
  CONTINUUM_TEMPERATURE,
  SWIPE_BACK,
  type ContinuumTemperature,
} from "@/lib/motion/tokens";
import { routeKind, type RouteKind } from "@/lib/motion/routes";

export function temperatureForPath(pathname: string): ContinuumTemperature {
  const kind: RouteKind = routeKind(pathname);
  switch (kind) {
    case "marketplace":
      return "browse";
    case "archie":
      return "study";
    case "portal":
      return "work";
    case "seller":
    case "auth":
    case "utility":
      return "still";
    case "public":
    default: {
      const p = pathname;
      if (p === "/home" || p.startsWith("/saved") || p.startsWith("/following")) {
        return "home";
      }
      if (
        p === "/network" ||
        p === "/messages" ||
        p === "/referrals" ||
        p.startsWith("/agents")
      ) {
        return "social";
      }
      return "social";
    }
  }
}

export function continuumProfile(temp: ContinuumTemperature) {
  return CONTINUUM_TEMPERATURE[temp];
}

/** Map finger dx → visual drag with progressive rubber-band. */
export function continuumDragPx(dx: number, viewportWidth: number): number {
  if (dx <= 0) return 0;
  const maxDrag = viewportWidth * SWIPE_BACK.maxDragViewport;
  const after = SWIPE_BACK.rubberAfterPx;
  let visual: number;
  if (dx <= after) {
    visual = dx;
  } else {
    visual = after + (dx - after) * SWIPE_BACK.rubberFactor;
  }
  return Math.min(visual, maxDrag);
}

export function continuumCommitThreshold(viewportWidth: number): number {
  return Math.max(
    SWIPE_BACK.thresholdPx,
    viewportWidth * SWIPE_BACK.thresholdViewport,
  );
}

/**
 * Commit if distance OR decisive velocity.
 * velocityPxPerMs from touch samples.
 */
export function shouldCommitSwipe(opts: {
  dx: number;
  velocityPxPerMs: number;
  viewportWidth: number;
}): boolean {
  const threshold = continuumCommitThreshold(opts.viewportWidth);
  if (opts.dx >= threshold) return true;
  if (
    opts.dx >= SWIPE_BACK.minDxForVelocity &&
    opts.velocityPxPerMs >= SWIPE_BACK.velocityCommit
  ) {
    return true;
  }
  return false;
}

export function peekOpacityForDrag(dragPx: number, viewportWidth: number): number {
  const max = viewportWidth * SWIPE_BACK.maxDragViewport;
  if (max <= 0) return 0;
  const t = Math.min(1, Math.max(0, dragPx / max));
  // Ease peek in — barely there at first, clearer near commit
  const curved = t * t * (3 - 2 * t);
  return curved * SWIPE_BACK.peekMaxOpacity;
}
