/**
 * Armor for ARCHIE-INTELLIGENCE Phase 3 — conclusion assistance.
 * Run: node scripts/test-archie-intelligence-p3.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const lib = read("src/lib/shi/archie-phase1.ts");
assert.match(lib, /archie-intelligence-p3/);
assert.match(lib, /buildArchieConclusion/);
assert.match(lib, /confidenceBand/);
assert.match(lib, /verifyNeeds/);
assert.match(lib, /alternatives/);
assert.match(lib, /nextAction/);
assert.match(lib, /decision maker|not buy\/sell|Not buy/i);
assert.doesNotMatch(lib, /openai|anthropic|gpt-4/i);
assert.doesNotMatch(lib, /you should (buy|sell)/i);

const panel = read(
  "src/components/broker/intelligence/ShiArchieIntelligencePanel.tsx",
);
assert.match(panel, /data-archie-intelligence="p3"/);
assert.match(panel, /data-archie-conclusion/);
assert.match(panel, /data-archie-confidence/);
assert.match(panel, /data-archie-alternatives|View reasoning/);
assert.match(panel, /Current read/);
assert.match(panel, /ARCHIE_DECISION_DISCLAIMER|decision maker/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /P3:/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-INTELLIGENCE"/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /P3/);

const pkg = read("package.json");
assert.match(pkg, /test:archie-intelligence-p3/);

console.log("archie-intelligence-p3 armor: ok");
