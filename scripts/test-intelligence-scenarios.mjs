/**
 * Armor for ARCHIE-INTELLIGENCE-SCENARIOS (no DB).
 * Run: node scripts/test-intelligence-scenarios.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

function monthlyMortgagePayment(principal, annualRatePct, termYears) {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  const months = Math.max(1, Math.round(termYears * 12));
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  const factor = Math.pow(1 + r, months);
  return (principal * r * factor) / (factor - 1);
}

function stressValue(base, pct) {
  if (!Number.isFinite(base) || base <= 0) return 0;
  return Math.max(0, Math.round(base * (1 + pct / 100)));
}

function runIntelligenceScenario({
  subjectCadValue,
  taxYearCount = 0,
  lookalikeValuedCount = 0,
  lookalikeMatchCount = 0,
  assumptions,
}) {
  const hasCad =
    subjectCadValue != null &&
    Number.isFinite(subjectCadValue) &&
    subjectCadValue > 0;
  if (!hasCad) {
    return {
      coverage: { hasCadValue: false, confidence: "unavailable" },
      bands: [],
    };
  }
  let confidence = "thin";
  if (taxYearCount >= 3 && lookalikeValuedCount >= 8) confidence = "strong";
  else if (taxYearCount >= 2 || lookalikeValuedCount >= 4) confidence = "moderate";

  const rate = Math.max(0, assumptions.ratePct);
  const down = Math.min(Math.max(assumptions.downPct, 0), 100);
  const term = assumptions.termYears > 0 ? assumptions.termYears : 30;
  const specs = [
    { id: "low", pct: assumptions.valueStressLowPct },
    { id: "mid", pct: assumptions.valueStressMidPct },
    { id: "high", pct: assumptions.valueStressHighPct },
  ];
  const bands = specs.map((s) => {
    const stressedCadValue = stressValue(subjectCadValue, s.pct);
    const downPayment = Math.round((stressedCadValue * down) / 100);
    const principal = Math.max(0, stressedCadValue - downPayment);
    const monthlyPi =
      Math.round(monthlyMortgagePayment(principal, rate, term) * 100) / 100;
    return { id: s.id, stressedCadValue, monthlyPi, downPayment, principal };
  });
  return {
    coverage: {
      hasCadValue: true,
      confidence,
      lookalikeMatchCount,
    },
    bands,
  };
}

// Kill switch — no CAD value
const dead = runIntelligenceScenario({
  subjectCadValue: null,
  assumptions: {
    valueStressLowPct: -10,
    valueStressMidPct: 0,
    valueStressHighPct: 10,
    ratePct: 6.5,
    downPct: 20,
    termYears: 30,
  },
});
assert.equal(dead.coverage.hasCadValue, false);
assert.equal(dead.bands.length, 0);

const live = runIntelligenceScenario({
  subjectCadValue: 400_000,
  taxYearCount: 3,
  lookalikeValuedCount: 10,
  lookalikeMatchCount: 12,
  assumptions: {
    valueStressLowPct: -10,
    valueStressMidPct: 0,
    valueStressHighPct: 10,
    ratePct: 6.5,
    downPct: 20,
    termYears: 30,
  },
});
assert.equal(live.coverage.confidence, "strong");
assert.equal(live.bands.length, 3);
assert.equal(live.bands[1].stressedCadValue, 400_000);
assert.equal(live.bands[0].stressedCadValue, 360_000);
assert.equal(live.bands[2].stressedCadValue, 440_000);
assert.ok(live.bands[0].monthlyPi < live.bands[1].monthlyPi);
assert.ok(live.bands[1].monthlyPi < live.bands[2].monthlyPi);

const thin = runIntelligenceScenario({
  subjectCadValue: 250_000,
  taxYearCount: 1,
  lookalikeValuedCount: 1,
  assumptions: {
    valueStressLowPct: -5,
    valueStressMidPct: 0,
    valueStressHighPct: 5,
    ratePct: 7,
    downPct: 10,
    termYears: 30,
  },
});
assert.equal(thin.coverage.confidence, "thin");

const lib = read("src/lib/shi/intelligence-scenarios.ts");
assert.match(lib, /INTELLIGENCE_SCENARIO_HONESTY/);
assert.match(lib, /runIntelligenceScenario/);
assert.match(lib, /not a predicted sale/i);
assert.match(lib, /Never seller probability/);

const board = read(
  "src/components/broker/intelligence/ShiIntelligenceScenarioBoard.tsx",
);
assert.match(board, /data-intelligence-scenario-board/);
assert.match(board, /Meeting pack/);
assert.match(board, /Coverage/);

const panel = read(
  "src/components/broker/intelligence/ShiCadEvidencePanel.tsx",
);
assert.match(panel, /ShiIntelligenceScenarioBoard/);
assert.doesNotMatch(panel, /Illustrative carry \(your assumptions\)/);

console.log(
  "intelligence-scenarios armor: ok · mid P&I",
  live.bands[1].monthlyPi,
);
