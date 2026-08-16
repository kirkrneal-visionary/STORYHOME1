/**
 * Print launch-7 union bbox + suggested owned-tile build steps (L7-2 prep).
 * Run: node scripts/plan-launch7-basemap.mjs
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

/** Keep in sync with src/lib/shi/corridors.ts CORRIDOR_COUNTIES bboxes. */
const COUNTIES = [
  { name: "Polk", fips: "48373", bbox: [-95.2, 30.49, -94.54, 31.15] },
  { name: "Angelina", fips: "48005", bbox: [-95.01, 31.03, -94.13, 31.53] },
  { name: "Trinity", fips: "48455", bbox: [-95.43, 30.82, -94.84, 31.39] },
  { name: "Tyler", fips: "48457", bbox: [-94.66, 30.53, -94.05, 31.06] },
  { name: "San Jacinto", fips: "48407", bbox: [-95.36, 30.32, -94.83, 30.91] },
  { name: "Liberty", fips: "48291", bbox: [-95.17, 29.89, -94.44, 30.49] },
  { name: "Walker", fips: "48471", bbox: [-95.86, 30.5, -95.33, 31.06] },
];

let minLng = Infinity;
let minLat = Infinity;
let maxLng = -Infinity;
let maxLat = -Infinity;
for (const c of COUNTIES) {
  const [w, s, e, n] = c.bbox;
  minLng = Math.min(minLng, w);
  minLat = Math.min(minLat, s);
  maxLng = Math.max(maxLng, e);
  maxLat = Math.max(maxLat, n);
}
const pad = 0.04;
const union = [
  +(minLng - pad).toFixed(5),
  +(minLat - pad).toFixed(5),
  +(maxLng + pad).toFixed(5),
  +(maxLat + pad).toFixed(5),
];

const plan = {
  wave: "L7-2",
  sovereignty: "l7-1 → l7-2",
  counties: COUNTIES,
  unionBbox: union,
  env: {
    NEXT_PUBLIC_LAUNCH7_STREETS_TILES:
      "https://YOUR_CDN/launch7/streets/{z}/{x}/{y}.png",
    NEXT_PUBLIC_LAUNCH7_SATELLITE_TILES:
      "https://YOUR_CDN/launch7/naip/{z}/{x}/{y}.png",
  },
  notes: [
    "Clip OpenMapTiles / Protomaps extract to unionBbox for vector streets.",
    "Clip USDA NAIP (or peer-grade aerial) to unionBbox for imagery.",
    "Serve via CDN; point env overrides — Research stays free-world.",
    "Do not introduce Mapbox or Google Dynamic Maps for the Research canvas.",
  ],
};

const out = join(process.cwd(), "data/shi/launch7-basemap-plan.json");
writeFileSync(out, JSON.stringify(plan, null, 2) + "\n");
console.log("launch7 basemap plan →", out);
console.log("unionBbox", union.join(", "));
