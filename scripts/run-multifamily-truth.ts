/**
 * Multifamily truth tests — seven counties + honesty lock.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ensureHousingIndex,
  fetchHousingAtPoint,
  findHousingTractAtPoint,
  headlineForHousing,
} from "../src/lib/shi/housing-acs";
import {
  MULTIFAMILY_COPY,
  MULTIFAMILY_FORBIDDEN,
  MULTIFAMILY_LAYERS,
} from "../src/lib/shi/multifamily";
import { buildMultifamilyRead } from "../src/lib/shi/multifamily-read";
import {
  reviewMultifamilyFrame,
  whatStillNeedsVerification,
  whyThisPropertySurfaced,
} from "../src/lib/shi/multifamily-review";
import { reviewMultifamilyScenarios } from "../src/lib/shi/multifamily-scenarios";
import {
  canShowUnitStudy,
  estimatePreliminaryUsableLand,
} from "../src/lib/shi/multifamily-usable-land";
import { fetchUtilitiesAtPoint } from "../src/lib/shi/utilities-ccn";

const COUNTIES = [
  { fips: "48373", name: "Polk", lat: 30.726, lng: -94.942 },
  { fips: "48005", name: "Angelina", lat: 31.338, lng: -94.729 },
  { fips: "48455", name: "Trinity", lat: 31.145, lng: -95.078 },
  { fips: "48457", name: "Tyler", lat: 30.775, lng: -94.415 },
  { fips: "48407", name: "San Jacinto", lat: 30.592, lng: -95.129 },
  { fips: "48291", name: "Liberty", lat: 30.058, lng: -94.795 },
  { fips: "48471", name: "Walker", lat: 30.723, lng: -95.55 },
] as const;

function blob(v: unknown): string {
  return JSON.stringify(v).toLowerCase();
}

/* A — ACS file covers all 7 */
const acs = JSON.parse(
  readFileSync(join(process.cwd(), "data/shi/acs5-housing-launch7.json"), "utf8"),
);
assert.equal(acs.version, "acs5-housing-launch7-v1");
assert.equal(acs.tractCount, 83);
assert.equal(acs.geometryCount, 83);
for (const c of COUNTIES) {
  assert.ok(
    acs.counties[c.fips]?.tractCount >= 1,
    `${c.name} missing ACS tracts`,
  );
}
assert.equal(acs.householdChangeStatus, "not_verified");

async function main() {
await ensureHousingIndex();

/* B — housing at a city pin in every county */
for (const c of COUNTIES) {
  const fact = await fetchHousingAtPoint({
    countyFips: c.fips,
    lat: c.lat,
    lng: c.lng,
  });
  assert.equal(fact.version, "acs5-housing-launch7-v1");
  if (fact.userReveal) {
    assert.ok(fact.geoid);
    assert.ok(fact.population == null || fact.population > 0);
    assert.match(fact.honesty, /not apartment demand/i);
    assert.equal(fact.householdChange, null);
  }
}

/* C — usable land never invents acres */
const usableNull = estimatePreliminaryUsableLand({ grossAcres: null });
assert.equal(usableNull.status, "insufficient");
assert.match(usableNull.summary, /Not enough verified data/i);
assert.equal(canShowUnitStudy(usableNull), false);

const usableBig = estimatePreliminaryUsableLand({
  grossAcres: 20,
  geometryValid: true,
});
assert.equal(usableBig.status, "insufficient");
assert.equal(usableBig.usableAcresLow, null);
assert.equal(usableBig.usableAcresHigh, null);
assert.equal(canShowUnitStudy(usableBig), false);

const usableInvalid = estimatePreliminaryUsableLand({
  grossAcres: 40,
  geometryValid: false,
});
assert.equal(usableInvalid.status, "insufficient");

/* D — scenarios never emit units; small vs large */
const scLarge = reviewMultifamilyScenarios({
  grossAcres: 14.8,
  usable: usableBig,
  mappedWater: true,
  mappedSewer: true,
});
assert.equal(scLarge.unitStudy, null);
assert.equal(
  scLarge.scenarios.find((s) => s.id === "garden")?.status,
  "worth_studying",
);
assert.equal(
  scLarge.scenarios.find((s) => s.id === "higher")?.status,
  "insufficient_evidence",
);
assert.doesNotMatch(blob(scLarge), /\d+ units/);

const scTiny = reviewMultifamilyScenarios({
  grossAcres: 0.4,
  usable: usableBig,
  mappedWater: false,
  mappedSewer: false,
});
assert.equal(
  scTiny.scenarios.find((s) => s.id === "garden")?.status,
  "constrained",
);

const scMissing = reviewMultifamilyScenarios({
  grossAcres: null,
  usable: usableNull,
  mappedWater: false,
  mappedSewer: false,
});
assert.equal(
  scMissing.scenarios.find((s) => s.id === "garden")?.status,
  "insufficient_evidence",
);

/* E — discovery groups: not traffic, not a score; one parcel in many groups */
const review = await reviewMultifamilyFrame({
  parcelCount: 4,
  medianAcres: 1.4,
  sites: [
    {
      propId: "BIG",
      source: "polk_cad",
      label: "Big tract",
      acres: 18.2,
      lat: 30.726,
      lng: -94.942,
      countyFips: "48373",
      frontageFt: 620,
    },
    {
      propId: "PAD",
      source: "polk_cad",
      acres: 0.8,
      lat: 30.726,
      lng: -94.942,
      countyFips: "48373",
    },
    {
      propId: "MID",
      source: "angelina_cad",
      acres: 6,
      lat: 31.338,
      lng: -94.729,
      countyFips: "48005",
    },
    {
      propId: "NOAC",
      source: "trinity_cad",
      acres: null,
      lat: 31.145,
      lng: -95.078,
      countyFips: "48455",
    },
  ],
});
assert.ok(!review.groups.some((g) => g.id === ("lower_physical_constraint" as never)));
assert.ok(review.missingGroups.some((g) => g.id === "lower_physical_constraint"));
const big = review.items.find((i) => i.propId === "BIG");
assert.ok(big);
assert.ok(big!.groups.includes("strong_land_fit"));
assert.ok(big!.whySurfaced.some((l) => /18\.2/.test(l)));
assert.ok(big!.whySurfaced.some((l) => /median parcel/i.test(l)));
assert.doesNotMatch(blob(review), /82\/100|best apartment|demand score/);
assert.ok(review.items.every((i) => i.whatArchieDoesNotKnow.includes("Zoning")));

/* F — utilities honesty at a launch pin */
const util = await fetchUtilitiesAtPoint({
  countyFips: "48005",
  lat: 31.338,
  lng: -94.729,
});
assert.equal(util.userReveal, true);
assert.doesNotMatch(util.headline.toLowerCase(), /water available|sewer available/);
assert.match(util.honesty, /not a guarantee/i);

/* G — parcel read forbids marketing language */
const read = await buildMultifamilyRead({
  propId: "T1",
  source: "walker_cad",
  countyFips: "48471",
  lat: 30.723,
  lng: -95.55,
  acres: 11.8,
  address: "Huntsville test",
});
assert.equal(read.usableLand.status, "insufficient");
assert.equal(read.advertised.topography, false);
assert.equal(read.advertised.unitStudy, false);
assert.equal(read.advertised.apartmentInventory, false);
assert.equal(read.utilities.capacity, MULTIFAMILY_COPY.capacityNotVerified);
assert.doesNotMatch(blob(read), /nearby apartments|buildable acres|173 units/);
assert.doesNotMatch(blob(read), /buildable acres|can build \d+|sewer available|water available|strong apartment demand/);
assert.doesNotMatch(blob(read), /unbuildable because slope/);
void MULTIFAMILY_FORBIDDEN;

/* H — flags stay closed for failed layers */
assert.equal(MULTIFAMILY_LAYERS.topography, false);
assert.equal(MULTIFAMILY_LAYERS.floodAcreage, false);
assert.equal(MULTIFAMILY_LAYERS.unitStudy, false);
assert.equal(MULTIFAMILY_LAYERS.apartmentInventory, false);
assert.equal(MULTIFAMILY_LAYERS.usableLand, false);
assert.equal(MULTIFAMILY_LAYERS.housingAcs, true);
assert.equal(MULTIFAMILY_LAYERS.utilitiesCcn, true);

/* I — why / unknown helpers */
const why = whyThisPropertySurfaced({
  acres: 14.8,
  waterProvider: "City Water",
  sewerProvider: null,
  renterShare: 0.34,
  frameMedianAcres: 1.4,
  frameMedianRenter: 0.26,
});
assert.ok(why.some((l) => /14\.8/.test(l)));
assert.ok(why.some((l) => /34%/.test(l) && /26%/.test(l)));
assert.ok(why.some((l) => /no mapped sewer/i.test(l)));
const unknown = whatStillNeedsVerification({
  mappedWater: true,
  mappedSewer: false,
  hasHousing: true,
});
assert.ok(unknown.includes("Mapped sewer service area"));
assert.ok(!unknown.includes("Local housing context"));
assert.ok(unknown.includes("Utility capacity"));

/* J — CCN dataset mentions every launch county */
const ccn = JSON.parse(
  readFileSync(join(process.cwd(), "data/shi/puct-ccn-launch7.json"), "utf8"),
);
const countyBlob = ccn.features
  .map((f: { properties?: { county?: string } }) => f.properties?.county || "")
  .join(" | ")
  .toUpperCase();
for (const name of [
  "POLK",
  "ANGELINA",
  "TRINITY",
  "TYLER",
  "SAN JACINTO",
  "LIBERTY",
  "WALKER",
]) {
  assert.ok(countyBlob.includes(name), `CCN missing ${name}`);
}

void findHousingTractAtPoint;
void headlineForHousing;

console.log("multifamily truth: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
