/**
 * Armor for STORY-GLASS Phase F (Archie study) — no browser.
 * Run: node scripts/test-story-glass-f.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const css = read("src/app/globals.css");
assert.match(css, /--story-archie-ribbon-h:\s*40px/);

const portal = read("src/components/broker/BrokerPortal.tsx");
assert.match(portal, /--story-archie-ribbon-h/);
assert.match(portal, /--story-header-h|--story-safe-top/);
assert.doesNotMatch(portal, /pt-\[128px\]/);

const ribbon = read("src/components/nav/NetworkContextRibbon.tsx");
assert.match(ribbon, /story-glass/);
assert.match(ribbon, /--story-header-h|--story-safe-top/);
assert.match(ribbon, /--story-archie-ribbon-h/);
assert.doesNotMatch(ribbon, /top-\[72px\]/);
assert.doesNotMatch(ribbon, /navy-deep\)_92%/);

const researchMap = read(
  "src/components/broker/intelligence/ShiResearchMap.tsx",
);
assert.match(researchMap, /story-glass/);
assert.doesNotMatch(
  researchMap,
  /story-chrome rounded-\[var\(--radius-md\)\] border p-1/,
);

const corridorsMap = read(
  "src/components/broker/intelligence/ShiCorridorsMap.tsx",
);
assert.match(corridorsMap, /story-glass/);

const overlay = read("src/components/map/CadOverlayControl.tsx");
assert.match(overlay, /story-glass/);

const compare = read(
  "src/components/broker/intelligence/ShiCorridorsComparePanel.tsx",
);
assert.match(compare, /story-surface/);
assert.doesNotMatch(compare, /bg-\[var\(--surface\)\] p-4/);

const analysis = read(
  "src/components/broker/intelligence/ShiCorridorsAnalysisPanel.tsx",
);
assert.match(analysis, /story-surface/);
assert.doesNotMatch(analysis, /bg-\[var\(--surface\)\] p-4/);

const workspace = read(
  "src/components/broker/intelligence/ShiWorkspace.tsx",
);
assert.match(workspace, /story-surface/);
assert.doesNotMatch(workspace, /bg-white ring-1 ring-hairline shadow-sm/);

const plan = read("docs/shi/STORY-GLASS.md");
assert.match(plan, /Phase F/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /STORY-GLASS-F/);
assert.match(waves, /id:\s*"STORY-GLASS-F"/);

console.log("story-glass-f armor: ok");
