/**
 * Armor for ARCHIE-INTELLIGENCE Phase 4 — persistent reasoning memory.
 * Run: node scripts/test-archie-intelligence-p4.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const mem = read("src/lib/shi/archie-reasoning-memory.ts");
assert.match(mem, /archie\.intelligence\.reasoning\.v1/);
assert.match(mem, /diffArchieReasoning/);
assert.match(mem, /rememberArchieReasoning/);
assert.match(mem, /ARCHIE_REASONING_MEMORY_HONESTY/);
assert.match(mem, /this browser only|Not synced across devices/i);
assert.match(mem, /not buy\/sell|Not buy/i);
assert.match(mem, /Founder Interpreter \(build process only/);
assert.doesNotMatch(mem, /openai|anthropic|gpt-4/i);
assert.doesNotMatch(mem, /you should (buy|sell)/i);
assert.doesNotMatch(mem, /supabase\.from|createClient/);

const lib = read("src/lib/shi/archie-phase1.ts");
assert.match(lib, /archie-intelligence-p4/);
assert.match(lib, /ARCHIE_BRIEF_VERSION = ARCHIE_PHASE4_VERSION/);

const panel = read(
  "src/components/broker/intelligence/ShiArchieIntelligencePanel.tsx",
);
assert.match(panel, /data-archie-intelligence="p4"/);
assert.match(panel, /data-archie-memory/);
assert.match(panel, /Since last look/);
assert.match(panel, /rememberArchieReasoning/);
assert.match(panel, /ARCHIE_REASONING_MEMORY_HONESTY/);
assert.doesNotMatch(panel, /Founder Interpreter product/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /P4:/);
assert.match(waves, /archie-reasoning-memory/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-(INTELLIGENCE|DEEDS)"/);
assert.match(waves, /Founder Interpreter product/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /P4 (shipping|live)/);

const pkg = read("package.json");
assert.match(pkg, /test:archie-intelligence-p4/);

/** Pure fingerprint compare (mirrors lib — no DOM). */
function fingerprintsEqual(a, b) {
  if (a.kind !== b.kind) return false;
  if (a.statement !== b.statement) return false;
  if (a.confidenceBand !== b.confidenceBand) return false;
  if (a.nextAction !== b.nextAction) return false;
  if (a.findingIds.length !== b.findingIds.length) return false;
  for (let i = 0; i < a.findingIds.length; i++) {
    if (a.findingIds[i] !== b.findingIds[i]) return false;
  }
  return true;
}

function diffArchieReasoning(previous, current) {
  if (!previous) {
    return { status: "first", previousAt: null };
  }
  return {
    status: fingerprintsEqual(previous.fingerprint, current) ? "same" : "shifted",
    previousAt: previous.capturedAt,
    previousStatement: previous.fingerprint.statement,
  };
}

const fpA = {
  kind: "analytical",
  statement: "Ownership concentration is the strongest desk signal.",
  confidence: 54,
  confidenceBand: "moderate",
  findingIds: ["owner-exact"],
  nextAction: "Examine ownership",
};
const fpB = { ...fpA, statement: "Road position warrants a development look." };
const prior = {
  source: "polk",
  propId: "1",
  capturedAt: "2026-08-01T00:00:00.000Z",
  fingerprint: fpA,
};

assert.equal(diffArchieReasoning(null, fpA).status, "first");
assert.equal(diffArchieReasoning(prior, fpA).status, "same");
assert.equal(diffArchieReasoning(prior, fpB).status, "shifted");
assert.equal(diffArchieReasoning(prior, fpB).previousStatement, fpA.statement);

console.log("archie-intelligence-p4 armor: ok");
