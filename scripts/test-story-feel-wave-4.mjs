/**
 * Armor for STORY-FEEL-WAVE-4 (no browser).
 * Run: node scripts/test-story-feel-wave-4.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const research = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.doesNotMatch(research, /rounded-2xl border border-hairline/);
assert.match(research, /story-surface/);
assert.match(research, /field-input/);
assert.match(research, /story-well/);

const evidence = read(
  "src/components/broker/intelligence/ShiCadEvidencePanel.tsx",
);
assert.match(evidence, /story-well/);
assert.match(evidence, /Not an AVM|Not a sale prediction/);

const scenario = read(
  "src/components/broker/intelligence/ShiIntelligenceScenarioBoard.tsx",
);
assert.match(scenario, /field-input|story-well/);
assert.match(scenario, /INTELLIGENCE_SCENARIO_HONESTY|data-intelligence-scenario-board/);

const feed = read(
  "src/components/broker/intelligence/ShiCountyChangeFeed.tsx",
);
assert.match(feed, /story-surface|story-well/);
assert.match(feed, /Not deed history/);

const frames = read(
  "src/components/broker/intelligence/ShiMarketFramesPanel.tsx",
);
assert.match(frames, /story-surface/);
assert.match(frames, /story-well/);

const researchMap = read(
  "src/components/broker/intelligence/ShiResearchMap.tsx",
);
assert.match(researchMap, /story-surface|story-chrome/);
assert.doesNotMatch(
  researchMap,
  /bg-\[var\(--paper,#f7f4ec\)\]\/95 p-1 shadow-md/,
);

const corridors = read(
  "src/components/broker/intelligence/ShiCorridorsView.tsx",
);
assert.match(corridors, /story-surface|story-well/);
assert.match(corridors, /field-input/);

const corridorsMap = read(
  "src/components/broker/intelligence/ShiCorridorsMap.tsx",
);
assert.match(corridorsMap, /story-chrome/);

const cadStatus = read("src/components/broker/CadCountyStatusPanel.tsx");
assert.match(cadStatus, /story-surface|story-well/);
assert.match(cadStatus, /cadCoverageHonesty/);

const overlay = read("src/components/map/CadOverlayControl.tsx");
assert.match(overlay, /story-chrome/);

const plan = read("docs/shi/STORY-FEEL-WAVES.md");
assert.match(plan, /STORY-FEEL-WAVE-4/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /STORY-FEEL-WAVE-4/);
assert.match(waves, /id:\s*"STORY-FEEL-WAVE-4"/);

console.log("story-feel-wave-4 armor: ok");
