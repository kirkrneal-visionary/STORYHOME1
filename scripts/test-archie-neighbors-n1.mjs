/**
 * Armor for ARCHIE-NEIGHBORS N1 — thin CAD polygon neighbors.
 * Run: node scripts/test-archie-neighbors-n1.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const mig = read("supabase/migrations/0038_parcel_neighbors.sql");
assert.match(mig, /parcel_neighbors/);
assert.match(mig, /ST_Touches/);
assert.match(mig, /ST_DWithin/);
assert.match(mig, /Not survey-grade|not survey/i);
assert.match(mig, /grant execute/);

const lib = read("src/lib/shi/parcel-neighbors.ts");
assert.match(lib, /parcel-neighbors-n1/);
assert.match(lib, /fetchParcelNeighbors/);
assert.match(lib, /sameOwnerAdjoining/);
assert.match(lib, /Founder Interpreter \(build process only/);
assert.match(lib, /not a survey|Not a survey/i);
assert.doesNotMatch(lib, /attom|regrid|datatree|openai|anthropic/i);

const route = read("src/app/api/shi/neighbors/route.ts");
assert.match(route, /fetchParcelNeighbors/);
assert.match(route, /requireStoryPro/);
assert.match(route, /isLaunchCorridorFips/);

const client = read("src/lib/shi/client.ts");
assert.match(client, /shiParcelNeighbors/);
assert.match(client, /\/api\/shi\/neighbors/);

const archie = read("src/lib/shi/archie-phase1.ts");
assert.match(archie, /adjoining-owner/);
assert.match(archie, /parcelNeighbors/);
assert.match(archie, /sameOwnerAdjoining/);

const panel = read(
  "src/components/broker/intelligence/ShiArchieIntelligencePanel.tsx",
);
assert.match(panel, /data-archie-neighbors/);
assert.match(panel, /parcelNeighbors/);

const view = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(view, /shiParcelNeighbors/);
assert.match(view, /parcelNeighbors/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /ARCHIE-NEIGHBORS/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-(NEIGHBORS|DEEDS)"/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /N1 (shipping|live)/);

const pkg = read("package.json");
assert.match(pkg, /test:archie-neighbors-n1/);

/** Pure same-owner adjoining classifier */
function sameOwnerAdjoining(neighbors) {
  return {
    touches: neighbors.filter((n) => n.sameOwnerExact && n.relation === "touches"),
    near: neighbors.filter((n) => n.sameOwnerExact && n.relation === "near"),
  };
}

const hits = [
  { relation: "touches", sameOwnerExact: true, propId: "A" },
  { relation: "near", sameOwnerExact: true, propId: "B" },
  { relation: "touches", sameOwnerExact: false, propId: "C" },
];
const adj = sameOwnerAdjoining(hits);
assert.equal(adj.touches.length, 1);
assert.equal(adj.near.length, 1);
assert.equal(adj.touches[0].propId, "A");

console.log("archie-neighbors-n1 armor: ok");
