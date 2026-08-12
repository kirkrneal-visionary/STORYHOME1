/**
 * Armor checks for county observation change feed (no DB).
 * Run: node scripts/test-shi-change-feed.mjs
 */
import assert from "node:assert/strict";
import {
  parcelFieldsChanged,
  ownerFieldsChanged,
  WATCHED_FIELDS,
} from "./lib/parcel-diff.mjs";

assert.ok(WATCHED_FIELDS.includes("owner_name"));
assert.ok(WATCHED_FIELDS.includes("situs_address"));
assert.ok(WATCHED_FIELDS.includes("market_value"));
assert.ok(WATCHED_FIELDS.includes("legal_acreage"));

assert.deepEqual(
  parcelFieldsChanged(
    {
      cad_owner_id: "A",
      owner_name: "SMITH",
      situs_address: "1 MAIN",
      market_value: 100,
      legal_acreage: 1.5,
    },
    {
      cad_owner_id: "A",
      owner_name: "SMITH",
      situs_address: "1 MAIN",
      market_value: 100,
      legal_acreage: 1.5,
    },
  ),
  [],
);

const multi = parcelFieldsChanged(
  {
    cad_owner_id: "A",
    owner_name: "SMITH",
    situs_address: "1 MAIN",
    market_value: 100,
    legal_acreage: 1.5,
  },
  {
    cad_owner_id: "A",
    owner_name: "SMITH",
    situs_address: "2 MAIN",
    market_value: 200,
    legal_acreage: 1.5,
  },
);
assert.equal(multi.length, 2);
assert.deepEqual(
  multi.map((d) => d.field).sort(),
  ["market_value", "situs_address"],
);
assert.equal(multi.find((d) => d.field === "market_value")?.old_value, "100");
assert.equal(multi.find((d) => d.field === "market_value")?.new_value, "200");

// Numeric string vs number should not false-diff
assert.deepEqual(
  parcelFieldsChanged(
    { market_value: "150000", legal_acreage: "2" },
    { market_value: 150000, legal_acreage: 2 },
  ),
  [],
);

// ownerFieldsChanged stays owner-only (back-compat)
assert.equal(
  ownerFieldsChanged(
    { cad_owner_id: "A", owner_name: "X", situs_address: "1" },
    { cad_owner_id: "A", owner_name: "X", situs_address: "2" },
  ).length,
  0,
);

function summarizePresence(ev) {
  if (ev.field !== "presence") return null;
  if (ev.new_value === "absent") {
    return "Missing from latest full-county CAD pull (Archie marked absent)";
  }
  if (ev.new_value === "present") {
    return "Seen again in a CAD pull after being marked absent";
  }
  return null;
}

assert.match(
  summarizePresence({ field: "presence", new_value: "absent" }),
  /absent/i,
);
assert.match(
  summarizePresence({ field: "presence", new_value: "present" }),
  /Seen again/i,
);

// Absence marking: only mark rows not already absent and not in seen set
function wouldMarkAbsent(row, seenPropIds) {
  return !seenPropIds.has(row.prop_id) && !row.absent_at;
}
const seen = new Set(["1", "2"]);
assert.equal(wouldMarkAbsent({ prop_id: "3", absent_at: null }, seen), true);
assert.equal(
  wouldMarkAbsent({ prop_id: "3", absent_at: "2026-01-01T00:00:00Z" }, seen),
  false,
);
assert.equal(wouldMarkAbsent({ prop_id: "1", absent_at: null }, seen), false);

console.log("shi-change-feed armor: ok");
