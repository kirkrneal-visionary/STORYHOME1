/**
 * Armor for Corridors growth scenarios.
 * Run: node scripts/test-growth-scenarios.mjs
 */
import assert from "node:assert/strict";

function compoundAadt(base, annualPct, years) {
  if (!Number.isFinite(base) || base <= 0) return 0;
  return Math.round(base * Math.pow(1 + annualPct / 100, years));
}

assert.equal(compoundAadt(10000, 0, 5), 10000);
assert.ok(compoundAadt(10000, 3, 5) > 10000);
assert.ok(compoundAadt(10000, 3, 5) < 12000);
assert.equal(compoundAadt(0, 3, 5), 0);

const mid = compoundAadt(31868, 1.5, 5);
assert.ok(mid > 31868);
console.log("growth-scenarios armor: ok · sample 5yr +1.5%", mid);
