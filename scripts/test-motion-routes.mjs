/**
 * Armor checks for Story Home motion route hierarchy (no browser).
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

assert.equal(routeKind("/portal/intelligence"), "archie");
assert.equal(routeKind("/marketplace/abc"), "marketplace");
assert.equal(routeDepth("/marketplace"), 2);
assert.equal(routeDepth("/marketplace/x"), 3);
assert.equal(
  inferDirection("/marketplace", "/marketplace/x"),
  "forward",
);
assert.equal(
  inferDirection("/marketplace/x", "/marketplace"),
  "back",
);
assert.equal(inferDirection("/marketplace", "/network"), "lateral");
assert.equal(
  inferDirection("/marketplace/x", "/marketplace", -1),
  "back",
);

console.log("motion-routes armor: ok");
