/**
 * Plan expanding the launch-7 map footprint by FIPS.
 * Run: node scripts/plan-launch7-expand.mjs --add=48201,48071
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Lightweight duplicate of estimate helpers — keep script runnable without tsx.
const CORRIDOR = [
  { fips: "48373", name: "Polk", bbox: [-95.2, 30.49, -94.54, 31.15] },
  { fips: "48005", name: "Angelina", bbox: [-95.01, 31.03, -94.13, 31.53] },
  { fips: "48455", name: "Trinity", bbox: [-95.43, 30.82, -94.84, 31.39] },
  { fips: "48457", name: "Tyler", bbox: [-94.66, 30.53, -94.05, 31.06] },
  { fips: "48407", name: "San Jacinto", bbox: [-95.36, 30.32, -94.83, 30.91] },
  { fips: "48291", name: "Liberty", bbox: [-95.17, 29.89, -94.44, 30.49] },
  { fips: "48471", name: "Walker", bbox: [-95.86, 30.5, -95.33, 31.06] },
];

function argList(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return [];
  return hit
    .slice(name.length + 3)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function union(counties, pad = 0.04) {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const c of counties) {
    const [w, s, e, n] = c.bbox;
    minLng = Math.min(minLng, w);
    minLat = Math.min(minLat, s);
    maxLng = Math.max(maxLng, e);
    maxLat = Math.max(maxLat, n);
  }
  return [
    +(minLng - pad).toFixed(5),
    +(minLat - pad).toFixed(5),
    +(maxLng + pad).toFixed(5),
    +(maxLat + pad).toFixed(5),
  ];
}

function long2tile(lon, z) {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}
function lat2tile(lat, z) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z,
  );
}
function tileCount(bbox, maxZoom, minZoom = 0) {
  const [w, s, e, n] = bbox;
  let total = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const xs = Math.abs(long2tile(e, z) - long2tile(w, z)) + 1;
    const ys = Math.abs(lat2tile(s, z) - lat2tile(n, z)) + 1;
    total += xs * ys;
  }
  return total;
}

const add = argList("add");
const byFips = new Map(CORRIDOR.map((c) => [c.fips, c]));
const missing = add.filter((f) => !byFips.has(f));
const next = [
  ...CORRIDOR,
  ...add.filter((f) => byFips.has(f)).map((f) => byFips.get(f)),
].filter(
  (c, i, arr) => arr.findIndex((x) => x.fips === c.fips) === i,
);

const currentBbox = union(CORRIDOR);
const nextBbox = union(next);
const plan = {
  wave: "l7-3",
  action: "expand-plan",
  at: new Date().toISOString(),
  addFips: add,
  missingBboxInCorridorRegistry: missing,
  ok: missing.length === 0,
  playbook: [
    "1. Add county to AVAILABLE_COUNTIES + CORRIDOR_COUNTIES with bbox.",
    "2. Re-run this plan until missingBboxInCorridorRegistry is empty.",
    "3. npm run build:launch7-tiles (seed new union).",
    "4. npm run publish:launch7-tiles (R2) once credentials exist.",
    "5. Point NEXT_PUBLIC_LAUNCH7_CDN_BASE (or keep API serve mode).",
    "6. Armor + owner gate on eqmg.",
  ],
  current: {
    counties: CORRIDOR.map((c) => c.name),
    bbox: currentBbox,
    streetsTilesZ10: tileCount(currentBbox, 10),
    imageryTilesZ6to11: tileCount(currentBbox, 11, 6),
  },
  next: {
    counties: next.map((c) => c.name),
    bbox: nextBbox,
    streetsTilesZ10: tileCount(nextBbox, 10),
    imageryTilesZ6to11: tileCount(nextBbox, 11, 6),
  },
};

const out = join(process.cwd(), "data/shi/launch7-expand-plan.json");
writeFileSync(out, JSON.stringify(plan, null, 2) + "\n");
console.log(JSON.stringify(plan, null, 2));
console.log("plan →", out);
void require;
process.exit(plan.ok || add.length === 0 ? 0 : 1);
