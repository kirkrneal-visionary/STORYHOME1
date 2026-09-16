/**
 * Harden Wave 3 — Category C brains execute on the server.
 * Isolated. No production writes. Before ≈ after on the same engines.
 * Run: node --experimental-strip-types scripts/test-harden-wave-3-brain.ts
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const RECIPE_CALLS = [
  "composeCorridorAnalysis(",
  "scoreCommercialExposure(",
  "buildArchiePropertyBrief(",
  "answerCorridorAsk(",
  "runGrowthScenario(",
  "runIntelligenceScenario(",
  "approxFrontageFromGeojson(",
  "associateParcelTraffic(",
  "compareCorridorAnalyses(",
  "pickFromCandidates(",
  "modeReviewFromRankedFacts(",
  "comparePropertySites(",
];

function walk(dir: string, name = "route.ts"): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p, name));
    else if (ent.name.endsWith(".tsx") || ent.name === name) out.push(p);
  }
  return out;
}

const clientFiles = walk(join(root, "src/components/broker/intelligence")).filter(
  (p) => p.endsWith(".tsx"),
);
assert.ok(clientFiles.length > 8);
for (const file of clientFiles) {
  const src = readFileSync(file, "utf8");
  for (const call of RECIPE_CALLS) {
    assert.equal(
      src.includes(call),
      false,
      `${file} still executes ${call}`,
    );
  }
}

const requiredRoutes = [
  "src/app/api/shi/corridors/analyze/route.ts",
  "src/app/api/shi/corridors/ask/route.ts",
  "src/app/api/shi/corridors/compare/route.ts",
  "src/app/api/shi/corridors/growth-scenario/route.ts",
  "src/app/api/shi/corridors/parcel-location/route.ts",
  "src/app/api/shi/archie/brief/route.ts",
  "src/app/api/shi/intelligence/scenario/route.ts",
  "src/app/api/shi/research/pick/route.ts",
  "src/app/api/shi/research/mode-review/route.ts",
  "src/app/api/shi/research/compare-sites/route.ts",
];
for (const rel of requiredRoutes) {
  const src = read(rel);
  assert.match(src, /requireStoryPro/);
}

assert.match(read("src/app/api/shi/corridors/analyze/route.ts"), /composeCorridorAnalysis/);
assert.match(read("src/app/api/shi/corridors/ask/route.ts"), /answerCorridorAsk/);
assert.match(read("src/app/api/shi/archie/brief/route.ts"), /buildArchiePropertyBrief/);
assert.match(read("src/app/api/shi/corridors/parcel-location/route.ts"), /scoreCommercialExposure/);
const printReport = read("src/lib/shi/corridor-property-report.ts");
assert.doesNotMatch(printReport, /scoreCommercialExposure\(/);
assert.doesNotMatch(printReport, /associateParcelTraffic\(/);
assert.doesNotMatch(printReport, /comparePropertySites\(/);
assert.match(read("src/app/api/shi/corridors/growth-scenario/route.ts"), /runGrowthScenario/);
assert.match(read("src/app/api/shi/intelligence/scenario/route.ts"), /runIntelligenceScenario/);
assert.match(read("src/components/broker/intelligence/ShiCorridorsView.tsx"), /shiCorridorsAnalyze/);
assert.match(read("src/components/broker/intelligence/ShiArchieIntelligencePanel.tsx"), /shiArchieBrief/);
assert.doesNotMatch(
  read("src/app/api/shi/archie/brief/route.ts"),
  /alter table public\.county_parcels/i,
);

assert.match(
  read("src/lib/shi/corridor-analysis.ts"),
  /export function composeCorridorAnalysis/,
);
assert.match(
  read("src/lib/shi/archie-phase1.ts"),
  /export function buildArchiePropertyBrief/,
);
assert.match(
  read("src/lib/shi/corridor-exposure.ts"),
  /export function scoreCommercialExposure/,
);
assert.doesNotMatch(
  read("src/app/api/shi/corridors/analyze/route.ts"),
  /delete from public\.county_parcels/i,
);

console.log("harden-wave-3-brain: ok");
