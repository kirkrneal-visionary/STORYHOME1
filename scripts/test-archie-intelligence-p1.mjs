/**
 * Armor for ARCHIE-INTELLIGENCE Phase 1 — property-aware Archie panel.
 * Run: node scripts/test-archie-intelligence-p1.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const lib = read("src/lib/shi/archie-phase1.ts");
assert.match(lib, /archie-intelligence-p1/);
assert.match(lib, /buildArchiePropertyBrief/);
assert.match(lib, /classification: "known"/);
assert.match(lib, /classification: "estimated"/);
assert.match(lib, /classification: "verify"/);
assert.doesNotMatch(lib, /openai|anthropic|gpt-4/i);

const panel = read(
  "src/components/broker/intelligence/ShiArchieIntelligencePanel.tsx",
);
assert.match(panel, /data-archie-intelligence="p[1234]"/);
assert.match(panel, /data-archie-findings/);
assert.match(panel, /data-archie-chips/);
assert.match(panel, /Ownership/);
assert.match(panel, /Ask Archie/);
assert.doesNotMatch(panel, /Founder Interpreter/);

const view = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(view, /ShiArchieIntelligencePanel/);
const archieIdx = view.indexOf("ShiArchieIntelligencePanel");
const factIdx = view.indexOf('<dl className="grid grid-cols-2 gap-2 text-xs">');
assert.ok(archieIdx > 0 && factIdx > archieIdx, "Archie panel before CAD fact grid");

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /ARCHIE-INTELLIGENCE/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-INTELLIGENCE"/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /ARCHIE-INTELLIGENCE/);
assert.match(wavesDoc, /P1/);

const pkg = read("package.json");
assert.match(pkg, /test:archie-intelligence-p1/);

console.log("archie-intelligence-p1 armor: ok");
