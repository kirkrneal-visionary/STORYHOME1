/**
 * Armor checks for SHI-3 prospect statuses (no DB).
 * Run: node scripts/test-shi-prospects.mjs
 */
import assert from "node:assert/strict";

const SHI_PROSPECT_STATUSES = [
  "Saved",
  "Researching",
  "Watching",
  "Contacted",
  "Qualified",
  "Opportunity",
  "Closed",
  "Archived",
];

function isShiProspectStatus(v) {
  return SHI_PROSPECT_STATUSES.includes(v);
}

assert.equal(isShiProspectStatus("Saved"), true);
assert.equal(isShiProspectStatus("Opportunity"), true);
assert.equal(isShiProspectStatus("Hot Lead"), false);
assert.equal(isShiProspectStatus(""), false);
assert.equal(SHI_PROSPECT_STATUSES.length, 8);

// Unique parcel key shape used by upsert conflict target
function parcelKey(agentId, source, propId) {
  return `${agentId}::${source}::${propId}`;
}
assert.equal(
  parcelKey("a1", "polk_cad", "123"),
  parcelKey("a1", "polk_cad", "123"),
);
assert.notEqual(
  parcelKey("a1", "polk_cad", "123"),
  parcelKey("a1", "tyler_cad", "123"),
);

console.log("shi-prospects armor: ok");
