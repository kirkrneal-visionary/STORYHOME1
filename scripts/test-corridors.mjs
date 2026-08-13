/**
 * Armor checks for Archie Corridors Wave 1 helpers.
 * Run: node scripts/test-corridors.mjs
 */
import assert from "node:assert/strict";

const CORRIDOR_COUNTIES = [
  { fips: "48373", shortName: "Polk", txdotCountyNbr: 187 },
  { fips: "48005", shortName: "Angelina", txdotCountyNbr: 3 },
  { fips: "48455", shortName: "Trinity", txdotCountyNbr: 228 },
  { fips: "48457", shortName: "Tyler", txdotCountyNbr: 229 },
  { fips: "48407", shortName: "San Jacinto", txdotCountyNbr: 204 },
  { fips: "48291", shortName: "Liberty", txdotCountyNbr: 146 },
  { fips: "48471", shortName: "Walker", txdotCountyNbr: 236 },
];

function trendFromHistory(history) {
  const vals = history
    .filter((h) => h.aadt != null && Number.isFinite(h.aadt))
    .map((h) => h.aadt);
  if (vals.length < 2) return "Thin history";
  const newest = vals[0];
  const oldest = vals[vals.length - 1];
  if (oldest <= 0) return "Thin history";
  const pct = ((newest - oldest) / oldest) * 100;
  if (pct >= 8) return "Rising";
  if (pct <= -8) return "Falling";
  return "Flat";
}

assert.equal(CORRIDOR_COUNTIES.length, 7);
assert.equal(
  trendFromHistory([
    { year: 2025, aadt: 12000 },
    { year: 2024, aadt: 11000 },
    { year: 2023, aadt: 10000 },
  ]),
  "Rising",
);
assert.equal(
  trendFromHistory([
    { year: 2025, aadt: 9000 },
    { year: 2024, aadt: 10000 },
    { year: 2023, aadt: 11000 },
  ]),
  "Falling",
);
assert.equal(
  trendFromHistory([{ year: 2025, aadt: 5000 }]),
  "Thin history",
);

console.log("corridors armor: ok");
