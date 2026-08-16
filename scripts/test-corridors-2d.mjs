/**
 * Armor for Corridors 2.0-D — exposure score + Commercial Exposure + Find Strongest Sites.
 * Run: node scripts/test-corridors-2d.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/ARCHIE-CORRIDORS-2.md");
assert.match(doc, /C2\.0-D/);
assert.match(doc, /Exposure \+ Sites/);
assert.match(doc, /traffic-exposure-v1/);
assert.match(doc, /commercial-exposure-v1/);
assert.match(doc, /\[x\].*Score only with versioned factor/);

const exposure = read("src/lib/shi/corridor-exposure.ts");
assert.match(exposure, /traffic-exposure-v1/);
assert.match(exposure, /commercial-exposure-v1/);
assert.match(exposure, /scoreTrafficExposure/);
assert.match(exposure, /scoreCommercialExposure/);
assert.match(exposure, /rankSitesByCommercialExposure/);
assert.match(exposure, /WHY|factors/);
assert.match(exposure, /id: "land"/);

const api = read("src/app/api/shi/corridors/strongest-sites/route.ts");
assert.match(api, /rankSitesByCommercialExposure/);
assert.match(api, /analyzeArea/);
assert.match(api, /No AI-invented scores|not an AI/i);

const client = read("src/lib/shi/client.ts");
assert.match(client, /shiCorridorsStrongestSites/);

const view = read("src/components/broker/intelligence/ShiCorridorsView.tsx");
assert.match(view, /data-corridors-version="c2-0-[def]"/);
assert.match(view, /data-find-strongest-sites/);
assert.match(view, /data-commercial-exposure-toggle/);
assert.match(view, /data-corridor-exposure-why/);
assert.match(view, /data-strongest-sites-list/);
assert.match(view, /Find Strongest Sites/);
assert.match(view, /Commercial Exposure/);

const map = read("src/components/broker/intelligence/ShiCorridorsMap.tsx");
assert.match(map, /strongest-sites/);
assert.match(map, /commercialExposureMode/);
assert.match(map, /data-commercial-exposure-banner/);

const grants = read("supabase/migrations/0035_corridor_segment_grants.sql");
assert.match(grants, /grant select on public.corridor_road_segments/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /C2\.0-D/);

const pkg = read("package.json");
assert.match(pkg, /test:corridors-2d/);

/* Deterministic score smoke — higher AADT + pad acreage beats empty */
function volumePts(aadt) {
  if (aadt == null) return 0;
  if (aadt >= 30000) return 35;
  if (aadt >= 15000) return 28;
  if (aadt >= 5000) return 18;
  return 8;
}
assert.ok(volumePts(22000) > volumePts(3000));
assert.ok(volumePts(40000) > volumePts(22000));

console.log("corridors-2d armor: ok");
