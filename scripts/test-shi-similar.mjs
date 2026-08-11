/**
 * Armor checks for SHI-5 similar ranking helpers (no DB).
 * Run: node scripts/test-shi-similar.mjs
 */
import assert from "node:assert/strict";

function withinPct(subject, candidate, tolPct) {
  const tol = Math.abs(subject) * (tolPct / 100);
  const pad = Math.max(tol, subject * 0.02);
  return Math.abs(candidate - subject) <= pad;
}

function strengthFromReasons(count) {
  if (count >= 4) return "strong";
  if (count >= 2) return "close";
  return "related";
}

assert.equal(withinPct(10, 12, 25), true);
assert.equal(withinPct(10, 20, 25), false);
assert.equal(strengthFromReasons(4), "strong");
assert.equal(strengthFromReasons(2), "close");
assert.equal(strengthFromReasons(1), "related");

console.log("shi-similar armor: ok");
