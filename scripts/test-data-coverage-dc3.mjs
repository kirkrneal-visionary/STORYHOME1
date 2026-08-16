/**
 * Armor for ARCHIE-DATA-COVERAGE DC-3 — environment desk (no browser).
 * Run: node scripts/test-data-coverage-dc3.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/ARCHIE-DATA-COVERAGE.md");
assert.match(doc, /DC-3/);
assert.match(doc, /NWI|Wetlands/);
assert.match(doc, /TIGER/);
assert.match(doc, /zoning context/i);
assert.match(doc, /No invented district/i);

const wet = read("src/lib/shi/wetlands-nwi.ts");
assert.match(wet, /wetlands-nwi-v1/);
assert.match(wet, /fetchWetlandsAtPoint/);
assert.match(wet, /userReveal/);
assert.match(wet, /fwspublicservices\.wim\.usgs\.gov/);

const place = read("src/lib/shi/place-tiger.ts");
assert.match(place, /place-tiger-v1/);
assert.match(place, /school-tiger-v1/);
assert.match(place, /zoning-context-v1/);
assert.match(place, /buildZoningContext/);
assert.match(place, /VERIFY/);
assert.match(place, /city_verify/);
assert.match(place, /no_city_layer/);
assert.doesNotMatch(place, /districtCode:\s*"[A-Z0-9]+"/);

const desk = read("src/lib/shi/environment-desk.ts");
assert.match(desk, /environment-desk-v1/);
assert.match(desk, /fetchEnvironmentAtPoint/);

const route = read("src/app/api/shi/environment/route.ts");
assert.match(route, /fetchEnvironmentAtPoint/);
assert.match(route, /requireStoryPro/);

const panel = read(
  "src/components/broker/intelligence/ShiEnvironmentEvidencePanel.tsx",
);
assert.match(panel, /data-environment-evidence/);
assert.match(panel, /userReveal/);

const research = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(research, /shiEnvironmentAtPoint/);
assert.match(research, /ShiEnvironmentEvidencePanel/);
assert.match(research, /Abstract \/ subdiv/);
assert.match(research, /Tract \/ lot/);
assert.match(research, /First seen/);
assert.match(research, /Last seen/);

const corridors = read(
  "src/components/broker/intelligence/ShiCorridorsView.tsx",
);
assert.match(corridors, /data-data-coverage="dc-[345]"/);
assert.match(corridors, /shiEnvironmentAtPoint/);
assert.match(corridors, /ShiEnvironmentEvidencePanel/);

const client = read("src/lib/shi/client.ts");
assert.match(client, /shiEnvironmentAtPoint/);
assert.match(client, /\/api\/shi\/environment/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /DC-3/);

const pkg = read("package.json");
assert.match(pkg, /test:data-coverage-dc3/);

/* Pure zoning context rules */
function buildZoningContext({ place }) {
  if (place.incorporated && place.placeName) {
    return { status: "city_verify", tier: "VERIFY", districtCode: null };
  }
  return { status: "no_city_layer", tier: "KNOWN", districtCode: null };
}
assert.deepEqual(
  buildZoningContext({
    place: { incorporated: true, placeName: "Lufkin city" },
  }),
  { status: "city_verify", tier: "VERIFY", districtCode: null },
);
assert.deepEqual(
  buildZoningContext({
    place: { incorporated: false, placeName: null },
  }),
  { status: "no_city_layer", tier: "KNOWN", districtCode: null },
);

console.log("data-coverage-dc3 armor: ok");
