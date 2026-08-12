/**
 * Armor checks for Ownership Stability Index (no DB).
 * Run: node scripts/test-shi-ownership-churn.mjs
 */
import assert from "node:assert/strict";
import { ownerFieldsChanged } from "./lib/owner-diff.mjs";

function hasSuccessiveObservation(firstSeenAt, lastSeenAt) {
  if (!firstSeenAt || !lastSeenAt) return false;
  const a = new Date(firstSeenAt).getTime();
  const b = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return b - a >= 12 * 3600 * 1000;
}

function computeOwnershipChurnSignal({ firstSeenAt, lastSeenAt, ownerEvents }) {
  const moments = new Set(
    ownerEvents
      .filter((e) => e.field === "cad_owner_id" || e.field === "owner_name")
      .map((e) => e.observedAt.slice(0, 19)),
  );
  const changeCount = moments.size;
  if (!firstSeenAt && changeCount === 0) {
    return { index: null, band: "building", ownerChangeCount: 0 };
  }
  if (changeCount === 0 && !hasSuccessiveObservation(firstSeenAt, lastSeenAt)) {
    return { index: null, band: "building", ownerChangeCount: 0, awaiting: true };
  }
  if (changeCount === 0) return { index: 820, band: "quiet", ownerChangeCount: 0 };
  if (changeCount === 1)
    return { index: 680, band: "some_movement", ownerChangeCount: 1 };
  if (changeCount === 2)
    return { index: 560, band: "some_movement", ownerChangeCount: 2 };
  return {
    index: Math.max(320, 520 - (changeCount - 3) * 40),
    band: "active",
    ownerChangeCount: changeCount,
  };
}

assert.deepEqual(
  ownerFieldsChanged(
    { cad_owner_id: "A", owner_name: "SMITH" },
    { cad_owner_id: "A", owner_name: "SMITH" },
  ),
  [],
);
assert.equal(
  ownerFieldsChanged(
    { cad_owner_id: "A", owner_name: "SMITH" },
    { cad_owner_id: "B", owner_name: "SMITH" },
  ).length,
  1,
);
assert.equal(
  ownerFieldsChanged(
    { cad_owner_id: "A", owner_name: "SMITH" },
    { cad_owner_id: "B", owner_name: "JONES" },
  ).length,
  2,
);

const quiet = computeOwnershipChurnSignal({
  firstSeenAt: "2026-01-01T00:00:00Z",
  lastSeenAt: "2026-02-01T00:00:00Z",
  ownerEvents: [],
});
assert.equal(quiet.band, "quiet");
assert.equal(quiet.index, 820);

const awaiting = computeOwnershipChurnSignal({
  firstSeenAt: "2026-01-01T00:00:00Z",
  lastSeenAt: "2026-01-01T00:00:00Z",
  ownerEvents: [],
});
assert.equal(awaiting.band, "building");
assert.equal(awaiting.index, null);
assert.equal(awaiting.awaiting, true);

const active = computeOwnershipChurnSignal({
  firstSeenAt: "2026-01-01T00:00:00Z",
  lastSeenAt: "2026-04-01T00:00:00Z",
  ownerEvents: [
    { field: "owner_name", observedAt: "2026-02-01T00:00:00Z" },
    { field: "cad_owner_id", observedAt: "2026-02-01T00:00:00Z" },
    { field: "owner_name", observedAt: "2026-03-01T00:00:00Z" },
    { field: "owner_name", observedAt: "2026-04-01T00:00:00Z" },
  ],
});
assert.equal(active.band, "active");
assert.equal(active.ownerChangeCount, 3);

const building = computeOwnershipChurnSignal({
  firstSeenAt: null,
  lastSeenAt: null,
  ownerEvents: [],
});
assert.equal(building.band, "building");
assert.equal(building.index, null);

console.log("shi-ownership-churn armor: ok");
