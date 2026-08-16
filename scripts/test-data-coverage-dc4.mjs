/**
 * Armor for ARCHIE-DATA-COVERAGE DC-4 — shared evidence UI (no browser).
 * Run: node scripts/test-data-coverage-dc4.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/ARCHIE-DATA-COVERAGE.md");
assert.match(doc, /DC-4/);
assert.match(doc, /shared chip/i);
assert.match(doc, /Ask Archie/i);
assert.match(doc, /Evidence labels/i);

const tier = read("src/lib/shi/evidence-tier.ts");
assert.match(tier, /EVIDENCE_LEGEND_LINES/);
assert.match(tier, /formatEvidenceTag/);
assert.match(tier, /evidenceLegendHtml/);
assert.match(tier, /KNOWN/);
assert.match(tier, /VERIFY/);

const chip = read(
  "src/components/broker/intelligence/ShiEvidenceChip.tsx",
);
assert.match(chip, /ShiEvidenceChip/);
assert.match(chip, /ShiEvidenceSource/);
assert.match(chip, /ShiEvidenceHeader/);
assert.match(chip, /data-evidence-tier/);
assert.match(chip, /data-evidence-asof/);
assert.match(chip, /data-evidence-source/);

const flood = read(
  "src/components/broker/intelligence/ShiFloodEvidencePanel.tsx",
);
assert.match(flood, /ShiEvidenceHeader/);
assert.match(flood, /ShiEvidenceSource/);

const utilities = read(
  "src/components/broker/intelligence/ShiUtilitiesEvidencePanel.tsx",
);
assert.match(utilities, /ShiEvidenceHeader/);
assert.match(utilities, /ShiEvidenceSource/);

const environment = read(
  "src/components/broker/intelligence/ShiEnvironmentEvidencePanel.tsx",
);
assert.match(environment, /ShiEvidenceHeader/);
assert.match(environment, /ShiEvidenceSource/);

const ask = read("src/lib/shi/corridor-ask.ts");
assert.match(ask, /corridor-ask-v2/);
assert.match(ask, /flood_zone/);
assert.match(ask, /utilities_ccn/);
assert.match(ask, /environment_desk/);
assert.match(ask, /tier\?:/);
assert.match(ask, /source\?:/);

const propReport = read("src/lib/shi/corridor-property-report.ts");
assert.match(propReport, /corridor-property-report-v2/);
assert.match(propReport, /evidenceLegendHtml/);
assert.match(propReport, /formatEvidenceTag/);

const report = read("src/lib/shi/corridor-report.ts");
assert.match(report, /evidenceLegendHtml/);
assert.match(report, /corridors-report-v1\.1/);

const corridors = read(
  "src/components/broker/intelligence/ShiCorridorsView.tsx",
);
assert.match(corridors, /data-data-coverage="dc-[45]"/);
assert.match(corridors, /data-evidence-legend/);
assert.match(corridors, /ShiEvidenceChip/);
assert.match(corridors, /deskFlood/);
assert.match(corridors, /onDeskEvidence/);
assert.match(corridors, /EVIDENCE_LEGEND_LINES/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /DC-4/);

const pkg = read("package.json");
assert.match(pkg, /test:data-coverage-dc4/);

console.log("data-coverage-dc4 armor: ok");
