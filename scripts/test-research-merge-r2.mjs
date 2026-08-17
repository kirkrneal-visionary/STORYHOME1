/**
 * Armor for ARCHIE-RESEARCH-MERGE R2 — Access desk in Research + soft-hide tab.
 * Run: node scripts/test-research-merge-r2.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const desk = read(
  "src/components/broker/intelligence/ShiResearchAccessDesk.tsx",
);
assert.match(desk, /data-research-access-desk="r2"/);
assert.match(desk, /ShiCorridorsAskPanel/);
assert.match(desk, /Find Strongest Sites/);
assert.match(desk, /ShiCorridorsPropertyComparePanel/);
assert.match(desk, /accessTab|Sites|Compare|Ask/);

const askPanel = read(
  "src/components/broker/intelligence/ShiCorridorsAskPanel.tsx",
);
assert.match(askPanel, /data-corridor-ask-chips/);
assert.match(askPanel, /corridorAskIntentsForUser/);

const view = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(view, /ShiResearchAccessDesk/);
assert.match(view, /shiCorridorsStrongestSites/);
assert.match(view, /answerCorridorAsk/);
assert.match(view, /comparePropertySites/);
assert.match(view, /mode === "access"|get\("mode"\)/);

const researchMap = read(
  "src/components/broker/intelligence/ShiResearchMap.tsx",
);
assert.match(researchMap, /data-research-map-fallback/);
assert.match(researchMap, /setMapFailed/);

const corridorsView = read(
  "src/components/broker/intelligence/ShiCorridorsView.tsx",
);
assert.match(corridorsView, /ShiCorridorsAskPanel/);
assert.doesNotMatch(corridorsView, /function AskArchiePanel/);

const workspace = read(
  "src/components/broker/intelligence/ShiWorkspace.tsx",
);
assert.match(workspace, /mode", "access"|mode=access/);
assert.doesNotMatch(workspace, /ShiCorridorsView/);

const nav = read("src/lib/navigation/networks.ts");
assert.doesNotMatch(nav, /id: "corridors"/);
assert.match(nav, /soft-hidden|Access desk is inside Research/);

const mem = read("src/lib/navigation/archieMemory.ts");
assert.match(mem, /mode=access/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /R2/);
assert.match(waves, /ARCHIE-RESEARCH-MERGE/);

const pkg = read("package.json");
assert.match(pkg, /test:research-merge-r2/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /R2/);

console.log("research-merge-r2 armor: ok");
