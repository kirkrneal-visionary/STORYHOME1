/**
 * Route hierarchy for directional Story Home transitions.
 * Depth increases as the user drills into a network.
 */

export type RouteKind =
  | "public"
  | "marketplace"
  | "portal"
  | "archie"
  | "auth"
  | "seller"
  | "utility";

export type NavDirection = "forward" | "back" | "lateral" | "none";

/** Normalize pathname (no trailing slash except root). */
export function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function routeKind(pathname: string): RouteKind {
  const p = normalizePath(pathname);
  if (p.startsWith("/seller")) return "seller";
  if (p === "/login") return "auth";
  if (p.startsWith("/portal/intelligence")) return "archie";
  if (p.startsWith("/portal")) return "portal";
  if (p === "/marketplace" || p.startsWith("/marketplace/")) return "marketplace";
  if (
    p.startsWith("/privacy") ||
    p.startsWith("/terms") ||
    p.startsWith("/fair-housing") ||
    p.startsWith("/accessibility") ||
    p.startsWith("/about") ||
    p.startsWith("/contact")
  ) {
    return "utility";
  }
  return "public";
}

/**
 * Hierarchical depth — higher = deeper drill-in.
 * Sibling top-level networks share similar depths for lateral motion.
 */
export function routeDepth(pathname: string): number {
  const p = normalizePath(pathname);
  if (p === "/") return 0;
  if (p === "/login") return 1;

  if (p === "/marketplace") return 2;
  if (p.startsWith("/marketplace/")) return 3;

  if (p === "/network" || p === "/referrals" || p === "/messages") return 2;
  if (p.startsWith("/agents/")) return 3;
  if (p.startsWith("/b/")) return 3;

  if (p === "/home" || p === "/saved" || p === "/following") return 2;
  if (p.startsWith("/saved/")) return 3;
  if (p === "/profile" || p === "/settings") return 2;

  if (p === "/portal") return 2;
  if (p.startsWith("/portal/intelligence")) return 3;
  if (p.startsWith("/portal")) return 2;

  if (p.startsWith("/seller/portal/")) return 3;
  if (p.startsWith("/seller")) return 2;

  return 1;
}

/** Same major network (e.g. both marketplace) — used for lateral vs drill. */
export function sameNetwork(a: string, b: string): boolean {
  return routeKind(a) === routeKind(b) && routeKind(a) !== "public";
}

/**
 * Infer navigation direction from path change.
 * Prefer browser history delta when provided by MotionProvider.
 */
export function inferDirection(
  from: string,
  to: string,
  historyDelta?: number | null,
): NavDirection {
  if (normalizePath(from) === normalizePath(to)) return "none";
  if (historyDelta != null && historyDelta < 0) return "back";
  if (historyDelta != null && historyDelta > 0) return "forward";

  const dFrom = routeDepth(from);
  const dTo = routeDepth(to);
  if (dTo > dFrom) return "forward";
  if (dTo < dFrom) return "back";

  // Same depth: lateral between top-level networks
  if (!sameNetwork(from, to) || routeKind(from) === "public") {
    return "lateral";
  }
  return "lateral";
}

/**
 * Routes that should skip spatial page slides (maps, auth, seller, utilities).
 * They still get opacity/reduced transitions via the shell when appropriate.
 */
export function excludeSpatialTransition(pathname: string): boolean {
  const kind = routeKind(pathname);
  if (kind === "seller" || kind === "auth" || kind === "utility") return true;
  return false;
}

/** Archie surfaces get a slightly tighter enter curve (identity, not flashy). */
export function isArchieRoute(pathname: string): boolean {
  return routeKind(pathname) === "archie";
}

export function isMapHeavyRoute(pathname: string): boolean {
  const p = normalizePath(pathname);
  return (
    p === "/marketplace" ||
    p.startsWith("/portal/intelligence") ||
    p.startsWith("/portal")
  );
}
