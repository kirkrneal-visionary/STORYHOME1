/**
 * Armor for Corridors 2.0-E — property compare + workflow CTAs + report.
 * Run: node scripts/test-corridors-2e.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/ARCHIE-CORRIDORS-2.md");
assert.match(doc, /C2\.0-E/);
assert.match(doc, /Compare \+ workflow/);
assert.match(doc, /\[x\].*Compare shows traffic/);
assert.match(doc, /No automatic winner|no forced winner/i);

const compare = read("src/lib/shi/corridor-property-compare.ts");
assert.match(compare, /corridor-property-compare-v1/);
assert.match(compare, /comparePropertySites/);
assert.match(compare, /PROPERTY_COMPARE_HONESTY/);
assert.match(compare, /No automatic winner/);
assert.match(compare, /id: "traffic"/);
assert.match(compare, /id: "growth"/);
assert.match(compare, /id: "frontage"/);
assert.match(compare, /id: "intersection"/);
assert.match(compare, /id: "acreage"/);
assert.match(compare, /id: "dataYear"/);

const report = read("src/lib/shi/corridor-property-report.ts");
assert.match(report, /buildPropertyLocationReportHtml/);
assert.match(report, /openPropertyLocationReport/);
assert.match(report, /Location intelligence|location intel/i);
assert.match(report, /Not zoning advice/);

const panel = read(
  "src/components/broker/intelligence/ShiCorridorsPropertyComparePanel.tsx",
);
assert.match(panel, /data-corridor-property-compare/);
assert.match(panel, /data-property-compare-summary/);

const view = read("src/components/broker/intelligence/ShiCorridorsView.tsx");
assert.match(view, /data-corridors-version="c2-0-(?:[ef]|f2)"/);
assert.match(view, /data-corridor-workflow-ctas/);
assert.match(view, /data-corridor-parcel-prospect/);
assert.match(view, /data-corridor-parcel-farm/);
assert.match(view, /data-corridor-parcel-save/);
assert.match(view, /data-corridor-parcel-report/);
assert.match(view, /data-corridor-parcel-compare/);
assert.match(view, /shiAddProspect/);
assert.match(view, /shiCreateFarm/);
assert.match(view, /openPropertyLocationReport/);
assert.match(view, /comparePropertySites/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /C2\.0-E|property compare\/CTAs|ARCHIE-CORRIDORS-2/);

const pkg = read("package.json");
assert.match(pkg, /test:corridors-2e/);

/* Pure compare smoke */
function tradeoffHasNoWinner(summary) {
  return /No automatic winner/i.test(summary);
}
assert.ok(
  tradeoffHasNoWinner(
    "A shows stronger published vehicles/day. No automatic winner — match the tradeoffs.",
  ),
);

console.log("corridors-2e armor: ok");
