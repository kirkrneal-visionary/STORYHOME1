/**
 * Armor checks for CAD evidence lane (no DB).
 * Run: node scripts/test-shi-cad-evidence.mjs
 */
import assert from "node:assert/strict";

function computeCadValueTrajectory(values, fallback) {
  const points = (values ?? [])
    .filter((v) => v.marketValue != null && v.marketValue > 0)
    .map((v) => ({ taxYear: v.taxYear, marketValue: v.marketValue }))
    .sort((a, b) => a.taxYear - b.taxYear);
  if (points.length === 0 && fallback?.marketValue > 0) {
    points.push({
      taxYear: fallback.taxYear ?? 0,
      marketValue: fallback.marketValue,
    });
  }
  const latest = points.length ? points[points.length - 1] : null;
  const prior = points.length >= 2 ? points[points.length - 2] : null;
  let deltaAbs = null;
  let deltaPct = null;
  if (latest && prior && prior.marketValue > 0) {
    deltaAbs = latest.marketValue - prior.marketValue;
    deltaPct = (deltaAbs / prior.marketValue) * 100;
  }
  return { points, latest, prior, deltaAbs, deltaPct };
}

function compareSubjectToFrame(subjectMarketValue, analysis) {
  if (
    subjectMarketValue == null ||
    !analysis?.medianMarketValue ||
    analysis.medianMarketValue <= 0
  ) {
    return null;
  }
  const frameMedian = analysis.medianMarketValue;
  const deltaAbs = subjectMarketValue - frameMedian;
  const deltaPct = (deltaAbs / frameMedian) * 100;
  const absPct = Math.abs(deltaPct);
  const position = absPct <= 8 ? "near" : deltaAbs > 0 ? "above" : "below";
  return { frameMedian, deltaAbs, deltaPct, position };
}

function claimStrength({ yearsWithValue, churnBand, hasCentroid }) {
  const claims = [];
  claims.push({
    id: "value_series",
    strength: yearsWithValue >= 2 ? "strong" : yearsWithValue === 1 ? "present" : "absent",
  });
  claims.push({
    id: "owner_obs",
    strength: churnBand === "building" ? "weak" : "observed",
  });
  claims.push({
    id: "map",
    strength: hasCentroid ? "present" : "absent",
  });
  return claims;
}

const traj = computeCadValueTrajectory(
  [
    { taxYear: 2023, marketValue: 100000 },
    { taxYear: 2024, marketValue: 110000 },
  ],
  null,
);
assert.equal(traj.deltaAbs, 10000);
assert.equal(traj.deltaPct, 10);
assert.equal(traj.points.length, 2);

const single = computeCadValueTrajectory([], { marketValue: 50000, taxYear: 2024 });
assert.equal(single.points.length, 1);
assert.equal(single.deltaPct, null);

const near = compareSubjectToFrame(100000, {
  medianMarketValue: 102000,
  valuedParcelCount: 10,
});
assert.equal(near.position, "near");

const above = compareSubjectToFrame(130000, {
  medianMarketValue: 100000,
});
assert.equal(above.position, "above");

assert.equal(
  compareSubjectToFrame(null, { medianMarketValue: 100000 }),
  null,
);

const claims = claimStrength({
  yearsWithValue: 2,
  churnBand: "quiet",
  hasCentroid: true,
});
assert.equal(claims.find((c) => c.id === "value_series")?.strength, "strong");
assert.equal(claims.find((c) => c.id === "owner_obs")?.strength, "observed");

// Honesty: never encode seller probability in evidence API shape
const forbidden = ["willSell", "sellerProbability", "daysOnMarketOdds"];
for (const k of forbidden) {
  assert.equal(Object.hasOwn({ trajectory: traj, claims }, k), false);
}

console.log("shi-cad-evidence armor: ok");
