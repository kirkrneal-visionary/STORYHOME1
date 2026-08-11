/**
 * Armor checks for SHI-4 farm baseline diffs (no DB).
 * Run: node scripts/test-shi-farms.mjs
 */
import assert from "node:assert/strict";

function keyOf(p) {
  return `${p.source}:${p.propId}`;
}

function diffFarmBaseline(live, baseline) {
  const liveMap = new Map(live.map((p) => [keyOf(p), p]));
  const baseMap = new Map(baseline.map((p) => [keyOf(p), p]));
  const changes = [];
  for (const [k, cur] of liveMap) {
    const prev = baseMap.get(k);
    if (!prev) {
      changes.push({ kind: "appeared", propId: cur.propId });
      continue;
    }
    if ((prev.ownerName ?? "") !== (cur.ownerName ?? "")) {
      changes.push({ kind: "owner", propId: cur.propId });
    }
    if ((prev.marketValue ?? null) !== (cur.marketValue ?? null)) {
      changes.push({ kind: "value", propId: cur.propId });
    }
  }
  for (const [k, prev] of baseMap) {
    if (!liveMap.has(k)) {
      changes.push({ kind: "disappeared", propId: prev.propId });
    }
  }
  return changes;
}

const baseline = [
  {
    source: "polk_cad",
    propId: "1",
    ownerName: "A",
    marketValue: 100,
  },
  {
    source: "polk_cad",
    propId: "2",
    ownerName: "B",
    marketValue: 200,
  },
];
const live = [
  {
    source: "polk_cad",
    propId: "1",
    ownerName: "A2",
    marketValue: 100,
  },
  {
    source: "polk_cad",
    propId: "3",
    ownerName: "C",
    marketValue: 300,
  },
];

const changes = diffFarmBaseline(live, baseline);
assert.equal(changes.some((c) => c.kind === "owner" && c.propId === "1"), true);
assert.equal(changes.some((c) => c.kind === "appeared" && c.propId === "3"), true);
assert.equal(
  changes.some((c) => c.kind === "disappeared" && c.propId === "2"),
  true,
);

console.log("shi-farms armor: ok");
