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

function normalizeProspectTags(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const t = raw.trim().replace(/\s+/g, " ").slice(0, 24);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= 12) break;
  }
  return out;
}

assert.deepEqual(normalizeProspectTags([" Farm ", "farm", "HOT"]), [
  "Farm",
  "HOT",
]);
assert.equal(normalizeProspectTags(["a".repeat(40)]).length, 1);
assert.equal(normalizeProspectTags(["a".repeat(40)])[0].length, 24);
assert.equal(
  normalizeProspectTags(Array.from({ length: 20 }, (_, i) => `t${i}`)).length,
  12,
);

function isSystemNote(body) {
  return (
    body.startsWith("Status changed:") ||
    body.startsWith("Created Story Pro seller lead")
  );
}
assert.equal(isSystemNote("Status changed: Saved → Watching."), true);
assert.equal(isSystemNote("Called the owner."), false);

console.log("shi-prospects armor: ok");
