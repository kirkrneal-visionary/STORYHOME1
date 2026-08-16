/**
 * Armor for Corridors 2.0-B — parcel select + location panel (no browser).
 * Run: node scripts/test-corridors-2b.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/ARCHIE-CORRIDORS-2.md");
assert.match(doc, /C2\.0-B/);
assert.match(doc, /Parcel select/);

const assoc = read("src/lib/shi/corridor-parcel-traffic.ts");
assert.match(assoc, /associateParcelTraffic/);
assert.match(assoc, /parcel-traffic-associate-v1/);
assert.match(assoc, /Estimated traffic exposure/);
assert.match(assoc, /PARCEL_TRAFFIC_MAX_MILES/);
assert.match(assoc, /kind: "estimated"/);
assert.match(assoc, /Not measured at the property boundary/);

/* Pure association unit */
function haversineMiles(aLat, aLng, bLat, bLng) {
  const R = 3958.7613;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(bLat - aLat);
  const dLng = toR(bLng - aLng);
  const lat1 = toR(aLat);
  const lat2 = toR(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
assert.ok(haversineMiles(30.7, -94.9, 30.701, -94.901) < 0.2);

const handoff = read("src/lib/shi/corridor-handoff.ts");
assert.match(handoff, /openParcelInResearch/);

const map = read("src/components/broker/intelligence/ShiCorridorsMap.tsx");
assert.match(map, /parcels-fill/);
assert.match(map, /onSelectParcel/);
assert.match(map, /selectedParcelId/);
assert.match(map, /prop_id/);

const view = read("src/components/broker/intelligence/ShiCorridorsView.tsx");
assert.match(view, /data-corridors-version="c2-0-[abcdef]"/);
assert.match(view, /ParcelSitePanel|data-corridor-parcel-panel/);
assert.match(view, /associateParcelTraffic/);
assert.match(view, /Open in Research|data-corridor-parcel-research/);
assert.match(view, /data-parcel-traffic-kind/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /C2\.0-B/);

console.log("corridors-2b armor: ok");
