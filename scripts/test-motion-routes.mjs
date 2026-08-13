/**
 * Armor checks for Story Continuum route hierarchy + gesture physics.
 * Run: node scripts/test-motion-routes.mjs
 */
import assert from "node:assert/strict";

function normalizePath(pathname) {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function routeKind(pathname) {
  const p = normalizePath(pathname);
  if (p.startsWith("/seller")) return "seller";
  if (p === "/login") return "auth";
  if (p.startsWith("/portal/intelligence")) return "archie";
  if (p.startsWith("/portal")) return "portal";
  if (p === "/marketplace" || p.startsWith("/marketplace/")) return "marketplace";
  if (
    p.startsWith("/privacy") ||
    p.startsWith("/terms") ||
    p.startsWith("/fair-housing")
  ) {
    return "utility";
  }
  return "public";
}

function routeDepth(pathname) {
  const p = normalizePath(pathname);
  if (p === "/") return 0;
  if (p === "/login") return 1;
  if (p === "/marketplace") return 2;
  if (p.startsWith("/marketplace/")) return 3;
  if (p === "/network" || p === "/referrals" || p === "/messages") return 2;
  if (p === "/portal") return 2;
  if (p.startsWith("/portal/intelligence")) return 3;
  if (p.startsWith("/portal")) return 2;
  return 1;
}

function inferDirection(from, to, historyDelta) {
  if (normalizePath(from) === normalizePath(to)) return "none";
  if (historyDelta != null && historyDelta < 0) return "back";
  if (historyDelta != null && historyDelta > 0) return "forward";
  const dFrom = routeDepth(from);
  const dTo = routeDepth(to);
  if (dTo > dFrom) return "forward";
  if (dTo < dFrom) return "back";
  return "lateral";
}

function temperatureForPath(pathname) {
  const kind = routeKind(pathname);
  if (kind === "marketplace") return "browse";
  if (kind === "archie") return "study";
  if (kind === "portal") return "work";
  if (kind === "seller" || kind === "auth" || kind === "utility") return "still";
  if (pathname === "/home" || pathname.startsWith("/saved")) return "home";
  if (pathname === "/network" || pathname === "/messages") return "social";
  return "social";
}

function continuumDragPx(dx, viewportWidth) {
  if (dx <= 0) return 0;
  const maxDrag = viewportWidth * 0.82;
  const after = 120;
  const factor = 0.38;
  let visual = dx <= after ? dx : after + (dx - after) * factor;
  return Math.min(visual, maxDrag);
}

function shouldCommitSwipe({ dx, velocityPxPerMs, viewportWidth }) {
  const threshold = Math.max(110, viewportWidth * 0.28);
  if (dx >= threshold) return true;
  if (dx >= 42 && velocityPxPerMs >= 0.55) return true;
  return false;
}

assert.equal(routeKind("/portal/intelligence"), "archie");
assert.equal(temperatureForPath("/portal/intelligence"), "study");
assert.equal(temperatureForPath("/marketplace"), "browse");
assert.equal(temperatureForPath("/portal"), "work");
assert.equal(
  inferDirection("/marketplace", "/marketplace/x"),
  "forward",
);
assert.equal(
  inferDirection("/marketplace/x", "/marketplace"),
  "back",
);
assert.equal(inferDirection("/marketplace", "/network"), "lateral");

// Rubber band: past 120px, drag grows slower than finger
const rubber = continuumDragPx(200, 390);
assert.ok(rubber < 200);
assert.ok(rubber > 120);

// Soft commit thresholds
assert.equal(
  shouldCommitSwipe({ dx: 200, velocityPxPerMs: 0, viewportWidth: 390 }),
  true,
);
assert.equal(
  shouldCommitSwipe({ dx: 50, velocityPxPerMs: 0.7, viewportWidth: 390 }),
  true,
);
assert.equal(
  shouldCommitSwipe({ dx: 20, velocityPxPerMs: 0.9, viewportWidth: 390 }),
  false,
);

console.log("motion-routes armor: ok");
