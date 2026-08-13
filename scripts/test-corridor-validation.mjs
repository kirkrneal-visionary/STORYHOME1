/**
 * Armor for Corridors validation / backtest harness.
 * Run: node scripts/test-corridor-validation.mjs
 */
import assert from "node:assert/strict";

const MIN = 20;

function isHit(predicted, observed) {
  if (observed === "unknown") return null;
  const bullish =
    predicted === "HIGH" || predicted === "ELEVATED" || predicted === "MODERATE";
  const bearish =
    predicted === "LOW" || predicted === "LIMITED" || predicted === "UNAVAILABLE";
  if (bullish) {
    if (observed === "strengthened" || observed === "stable") return true;
    if (observed === "weakened") return false;
  }
  if (bearish) {
    if (observed === "weakened" || observed === "stable") return true;
    if (observed === "strengthened") return false;
  }
  return null;
}

function summarize(cases) {
  let hits = 0;
  let scored = 0;
  for (const c of cases) {
    const h = isHit(c.predictedLevel, c.observedOutcome);
    if (h == null) continue;
    scored += 1;
    if (h) hits += 1;
  }
  const enough = scored >= MIN;
  return {
    scored,
    hits,
    hitRate: enough && scored > 0 ? hits / scored : null,
    label: enough
      ? `${Math.round((hits / scored) * 100)}% on ${scored} scored cases`
      : `Sample too small to publish a rate (${scored}/${MIN} scored)`,
  };
}

assert.equal(isHit("HIGH", "strengthened"), true);
assert.equal(isHit("HIGH", "weakened"), false);
assert.equal(isHit("LOW", "stable"), true);
assert.equal(isHit("HIGH", "unknown"), null);

const small = summarize([
  { predictedLevel: "HIGH", observedOutcome: "strengthened" },
  { predictedLevel: "HIGH", observedOutcome: "weakened" },
  { predictedLevel: "ELEVATED", observedOutcome: "stable" },
]);
assert.equal(small.scored, 3);
assert.equal(small.hitRate, null);
assert.match(small.label, /too small/i);

const big = [];
for (let i = 0; i < 25; i++) {
  big.push({
    predictedLevel: "HIGH",
    observedOutcome: i < 20 ? "strengthened" : "weakened",
  });
}
const pub = summarize(big);
assert.equal(pub.scored, 25);
assert.ok(pub.hitRate != null);
assert.ok(pub.hitRate >= 0.79 && pub.hitRate <= 0.81);
assert.doesNotMatch(pub.label, /87%/);

console.log("corridor-validation armor: ok");
