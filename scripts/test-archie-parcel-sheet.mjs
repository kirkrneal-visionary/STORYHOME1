/**
 * Armor — Research parcel one-sheet + utilities menu (founder GO 2026-11-28).
 * Run: node scripts/test-archie-parcel-sheet.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const menu = read(
  "src/components/broker/intelligence/ShiParcelSectionMenu.tsx",
);
assert.match(menu, /Overview/);
assert.match(menu, /Values/);
assert.match(menu, /Roads/);
assert.match(menu, /Traffic/);
assert.match(menu, /Analyze/);
assert.match(menu, /Utilities/);
assert.match(menu, /data-parcel-section-menu/);

const body = read(
  "src/components/broker/intelligence/ShiParcelRecordBody.tsx",
);
assert.match(body, /ShiParcelSectionMenu/);
assert.match(body, /hasUtilityProviderRows/);
assert.match(body, /data-parcel-section-panel="utilities"/);
assert.doesNotMatch(body, /cannot determine/i);

const view = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(view, /ShiParcelRecordBody/);
assert.match(view, /parcelSection/);

const archie = read(
  "src/components/broker/intelligence/ShiArchieIntelligencePanel.tsx",
);
assert.doesNotMatch(archie, /data-archie-chips/);
assert.match(archie, /insufficient/);
assert.match(archie, /provenFindings|isProvenFinding/);

const map = read(
  "src/components/broker/intelligence/ShiResearchMap.tsx",
);
assert.match(map, /data-map-chrome-cluster/);
assert.match(map, /RESEARCH_VIEW_SKINS/);

const css = read("src/app/globals.css");
assert.match(css, /data-map-chrome-cluster/);
assert.match(css, /data-parcel-record-body/);

const utilPanel = read(
  "src/components/broker/intelligence/ShiUtilitiesEvidencePanel.tsx",
);
assert.doesNotMatch(utilPanel, /border-sky/);
assert.match(utilPanel, /data-utilities-provider-rows/);

const pkg = read("package.json");
assert.match(pkg, /test:archie-parcel-sheet/);

console.log("archie-parcel-sheet armor: ok");
