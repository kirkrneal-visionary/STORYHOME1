/**
 * Armor for ARCHIE-INTELLIGENCE Phase 2 — spatial desk context.
 * Run: node scripts/test-archie-intelligence-p2.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const lib = read("src/lib/shi/archie-phase1.ts");
assert.match(lib, /archie-intelligence-p2/);
assert.match(lib, /findNearbyExactOwners/);
assert.match(lib, /ARCHIE_NEARBY_OWNER_MAX_MILES/);
assert.match(lib, /associateParcelTraffic/);
assert.match(lib, /nearby-owner|nearby-traffic|intersection/);
assert.match(lib, /formatApproxIntersectionM/);
assert.match(lib, /nearbySummary/);
assert.doesNotMatch(lib, /openai|anthropic|gpt-4/i);

const panel = read(
  "src/components/broker/intelligence/ShiArchieIntelligencePanel.tsx",
);
assert.match(panel, /data-archie-intelligence="p[234]"/);
assert.match(panel, /stations/);
assert.match(panel, /nearbySummary/);
assert.doesNotMatch(panel, /Phase 1 does not invent/);

const view = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(view, /stations=\{accessStations\}/);
assert.match(view, /ensureAccessStations/);
assert.match(view, /P2 — load planning stations|Archie spatial/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /ARCHIE-INTELLIGENCE/);
assert.match(waves, /P2:/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-(INTELLIGENCE|DEEDS|NEIGHBORS)"/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /ARCHIE-INTELLIGENCE/);
assert.match(wavesDoc, /P2/);

const pkg = read("package.json");
assert.match(pkg, /test:archie-intelligence-p2/);

console.log("archie-intelligence-p2 armor: ok");
