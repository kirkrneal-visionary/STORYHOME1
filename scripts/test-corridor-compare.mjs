/**
 * Armor for Corridors V.2 compare + report helpers.
 * Run: node scripts/test-corridor-compare.mjs
 */
import assert from "node:assert/strict";

function compareLite(left, right) {
  const honesty =
    "Comparison shows how two outlines differ in the evidence Archie has";
  const rows = [
    {
      id: "parcels",
      left: String(left.parcelCount),
      right: String(right.parcelCount),
    },
  ];
  let summary = "similar";
  if (left.trafficRank > right.trafficRank) summary = "left_stronger";
  if (left.trafficRank < right.trafficRank) summary = "right_stronger";
  return { honesty, rows, summary };
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildReportTitle(name) {
  return `${escapeHtml(name)} — Development Intelligence Report`;
}

const c = compareLite(
  { parcelCount: 100, trafficRank: 5 },
  { parcelCount: 40, trafficRank: 2 },
);
assert.match(c.honesty, /evidence/i);
assert.equal(c.rows[0].left, "100");
assert.equal(c.summary, "left_stronger");
assert.equal(buildReportTitle("Polk study"), "Polk study — Development Intelligence Report");
assert.equal(escapeHtml("<x>"), "&lt;x&gt;");
assert.doesNotMatch(c.honesty, /will sell|guaranteed/i);

console.log("corridor-compare armor: ok");
