/**
 * Armor for ARCHIE-DATA-COVERAGE DC-5 — deeds dark store (no browser).
 * Run: node scripts/test-data-coverage-dc5.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/ARCHIE-DATA-COVERAGE.md");
assert.match(doc, /DC-5/);
assert.match(doc, /[Dd]ark store/);
assert.match(doc, /clerk-grade/i);
assert.match(doc, /userReveal/);
assert.match(doc, /DataTree|ATTOM/);
assert.match(doc, /never invents|not deeds|not deed/i);

const lib = read("src/lib/shi/deeds-clerk.ts");
assert.match(lib, /deeds-clerk-v1/);
assert.match(lib, /fetchDeedsForParcel/);
assert.match(lib, /isClerkCoverageReady/);
assert.match(lib, /canRevealDeeds/);
assert.match(lib, /userReveal/);
assert.match(lib, /CLERK_COVERAGE_READY_FIPS/);
assert.match(lib, /DEEDS_USER_REVEAL_OPEN\s*=\s*false/);
assert.doesNotMatch(lib, /attom|datatree|corelogic|regrid|zoneomics/i);
/* Coverage registry starts with empty readyFips — dark by default */
const cov = JSON.parse(read("data/shi/clerk-coverage-launch7.json"));
assert.ok(Array.isArray(cov.readyFips));
assert.equal(cov.readyFips.length, 0);

const route = read("src/app/api/shi/deeds/route.ts");
assert.match(route, /fetchDeedsForParcel/);
assert.match(route, /requireStoryPro/);
assert.match(route, /isLaunchCorridorFips/);
assert.match(route, /dark/);

const panel = read(
  "src/components/broker/intelligence/ShiDeedsEvidencePanel.tsx",
);
assert.match(panel, /userReveal/);
assert.match(panel, /return null/);
assert.match(panel, /data-deeds-evidence/);

const research = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(research, /shiDeedsForParcel/);
assert.match(research, /ShiDeedsEvidencePanel/);

const corridors = read(
  "src/components/broker/intelligence/ShiCorridorsView.tsx",
);
assert.match(corridors, /data-data-coverage="dc-5"/);
assert.match(corridors, /shiDeedsForParcel/);
assert.match(corridors, /ShiDeedsEvidencePanel/);

const client = read("src/lib/shi/client.ts");
assert.match(client, /shiDeedsForParcel/);
assert.match(client, /\/api\/shi\/deeds/);

const sources = read("src/lib/shi/corridor-sources.ts");
assert.match(sources, /clerk_deeds/);
assert.match(sources, /Dark until Archie owns clerk-grade/);

const ask = read("src/lib/shi/corridor-ask.ts");
assert.match(ask, /deed_history/);
assert.match(ask, /stays dark/i);
assert.match(ask, /Not deed history/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /DC-5/);

const pkg = read("package.json");
assert.match(pkg, /test:data-coverage-dc5/);

/* Pure gate mirrors — stay dark */
function isClerkCoverageReady(countyFips, readySet = new Set()) {
  const launch = new Set([
    "48373",
    "48005",
    "48455",
    "48457",
    "48407",
    "48291",
    "48471",
  ]);
  return launch.has(countyFips) && readySet.has(countyFips);
}
function canRevealDeeds({ countyFips, transfers }) {
  if (!isClerkCoverageReady(countyFips)) return false;
  void transfers;
  return false;
}
assert.equal(isClerkCoverageReady("48005"), false);
assert.equal(canRevealDeeds({ countyFips: "48005", transfers: [] }), false);
assert.equal(
  canRevealDeeds({
    countyFips: "48005",
    transfers: [{ recordedDate: "2020-01-01" }],
  }),
  false,
);

console.log("data-coverage-dc5 armor: ok");
