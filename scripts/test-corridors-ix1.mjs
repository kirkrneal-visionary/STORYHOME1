/**
 * Armor for ARCHIE-IX IX-1 — intersection meter distance (no browser).
 * Run: node scripts/test-corridors-ix1.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");
const require = createRequire(import.meta.url);

const doc = read("docs/shi/ARCHIE-CORRIDORS-2.md");
assert.match(doc, /IX-1/);
assert.match(doc, /corridor-intersection-v1/);
assert.match(doc, /approxDistanceToIntersectionM|approx meters/i);
assert.match(doc, /not survey|Not survey/i);

const mig = read("supabase/migrations/0037_corridor_intersection_distance.sql");
assert.match(mig, /corridor_parcel_intersection_distance/);
assert.match(mig, /approx_distance_m/);
assert.match(mig, /corridor-intersection-v1/);
assert.match(mig, /authenticated/);

const frontage = read("src/lib/shi/corridor-frontage.ts");
assert.match(frontage, /corridor-intersection-v1/);
assert.match(frontage, /approxDistanceToIntersectionM/);
assert.match(frontage, /approxIntersectionDistanceFromGeojson/);
assert.match(frontage, /formatApproxIntersectionM/);
assert.match(frontage, /INTERSECTION_JOIN_M/);
assert.match(frontage, /not a survey/i);

const api = read("src/app/api/shi/corridors/parcel-location/route.ts");
assert.match(api, /corridor_parcel_intersection_distance/);
assert.match(api, /approxIntersectionDistanceFromGeojson/);
assert.match(api, /intersectionRuleVersion/);

const ask = read("src/lib/shi/corridor-ask.ts");
assert.match(ask, /corridor-ask-v2\.2/);
assert.match(ask, /approxDistanceToIntersectionM/);
assert.match(ask, /not a survey/i);
assert.doesNotMatch(ask, /distance TBD until we own a versioned field/);

const view = read(
  "src/components/broker/intelligence/ShiCorridorsView.tsx",
);
assert.match(view, /data-corridor-ix="ix-1"/);
assert.match(view, /formatApproxIntersectionM/);
assert.match(view, /approxIntersectionDistanceFromGeojson/);

const compare = read("src/lib/shi/corridor-property-compare.ts");
assert.match(compare, /approxDistanceToIntersectionM/);

const report = read("src/lib/shi/corridor-property-report.ts");
assert.match(report, /approxDistanceToIntersectionM/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /ARCHIE-IX|IX-1/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-(IX|NEIGHBORS|DEEDS)"/);

const pkg = read("package.json");
assert.match(pkg, /test:corridors-ix1/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /IX-1/);

/* Geometry smoke: crossing roads near parcel → finite meters */
function toRad(d) {
  return (d * Math.PI) / 180;
}
function project(lng, lat, oLng, oLat) {
  return [
    toRad(lng - oLng) * 6371000 * Math.cos(toRad(oLat)),
    toRad(lat - oLat) * 6371000,
  ];
}
function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
function distPointToSeg(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 <= 1e-9) return Math.sqrt(dist2(px, py, ax, ay));
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(dist2(px, py, ax + t * abx, ay + t * aby));
}
function nearCrossing(ax, ay, bx, by, cx, cy, dx, dy, joinM) {
  const den = (ax - bx) * (cy - dy) - (ay - by) * (cx - dx);
  if (Math.abs(den) > 1e-9) {
    const t = ((ax - cx) * (cy - dy) - (ay - cy) * (cx - dx)) / den;
    const u = -((ax - bx) * (ay - cy) - (ay - by) * (ax - cx)) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return [ax + t * (bx - ax), ay + t * (by - ay)];
    }
  }
  let bestD = Infinity;
  let best = null;
  for (const [px, py, qx1, qy1, qx2, qy2] of [
    [ax, ay, cx, cy, dx, dy],
    [bx, by, cx, cy, dx, dy],
    [cx, cy, ax, ay, bx, by],
    [dx, dy, ax, ay, bx, by],
  ]) {
    const d = distPointToSeg(px, py, qx1, qy1, qx2, qy2);
    if (d < bestD) {
      bestD = d;
      const abx = qx2 - qx1;
      const aby = qy2 - qy1;
      const ab2 = abx * abx + aby * aby;
      let t = ab2 <= 1e-9 ? 0 : ((px - qx1) * abx + (py - qy1) * aby) / ab2;
      t = Math.max(0, Math.min(1, t));
      best = [(px + qx1 + t * abx) / 2, (py + qy1 + t * aby) / 2];
    }
  }
  if (best && bestD <= joinM) return best;
  return null;
}

const oLng = -94.7;
const oLat = 31.3;
const h1 = project(-94.701, 31.3, oLng, oLat);
const h2 = project(-94.699, 31.3, oLng, oLat);
const v1 = project(-94.7, 31.299, oLng, oLat);
const v2 = project(-94.7, 31.301, oLng, oLat);
const cross = nearCrossing(h1[0], h1[1], h2[0], h2[1], v1[0], v1[1], v2[0], v2[1], 20);
assert.ok(cross, "expected crossing for perpendicular roads");
const parcelC = project(-94.7005, 31.3005, oLng, oLat);
const meters = Math.sqrt(dist2(cross[0], cross[1], parcelC[0], parcelC[1]));
assert.ok(Number.isFinite(meters) && meters < 200, `meters=${meters}`);

console.log("corridors-ix1 armor: ok");
void require;
