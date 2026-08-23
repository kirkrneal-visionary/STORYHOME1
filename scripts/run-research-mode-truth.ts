/**
 * Truth tests A–G against research-mode-reason (runtime).
 */
import assert from "node:assert/strict";
import {
  isRankEligible,
  reviewSitesForMode,
  type ModeSiteEvidence,
} from "../src/lib/shi/research-mode-reason";
import { RESEARCH_MODES } from "../src/lib/shi/research-modes";

function ev(partial: Partial<ModeSiteEvidence> & { propId: string }): ModeSiteEvidence {
  return {
    acres: null,
    primaryAadt: null,
    primaryRoad: null,
    secondaryRoad: null,
    secondaryAadt: null,
    frontageFt: null,
    positionClass: null,
    trafficYear: null,
    ...partial,
  };
}

/* A — same highway traffic does not separate */
const sameT = 18166;
const A = [
  ev({ propId: "A1", primaryAadt: sameT, primaryRoad: "US 190", acres: 4, frontageFt: 610 }),
  ev({ propId: "A2", primaryAadt: sameT, primaryRoad: "US 190", acres: 1.59, frontageFt: 200 }),
  ev({ propId: "A3", primaryAadt: sameT, primaryRoad: "US 190", acres: 2.2, frontageFt: 410, secondaryRoad: "FM 350" }),
  ev({ propId: "A4", primaryAadt: sameT, primaryRoad: "US 190", acres: 0.9, frontageFt: null }),
  ev({ propId: "A5", primaryAadt: sameT, primaryRoad: "US 190", acres: 3.1, frontageFt: 300 }),
];
const aGas = reviewSitesForMode({ mode: "gas_station", sites: A });
assert.ok(aGas.tieNote);
assert.match(aGas.tieNote!, /same nearby published highway count|cannot separate them on traffic/i);
assert.ok(!aGas.items.some((i) => /best/i.test(i.whySurfaced)));
assert.notEqual(aGas.items.find((i) => i.propId === "A3")?.secondaryRoad, null);

/* B — corner does not automatically win */
const B = [
  ev({
    propId: "corner",
    primaryAadt: 8000,
    secondaryAadt: 3000,
    secondaryRoad: "Side St",
    primaryRoad: "FM 1",
    acres: 1,
    frontageFt: 180,
    positionClass: "intersection_corner",
  }),
  ev({
    propId: "mid",
    primaryAadt: 35000,
    primaryRoad: "US 59",
    acres: 5,
    frontageFt: 620,
    positionClass: "mid_block",
  }),
];
const bGas = reviewSitesForMode({ mode: "gas_station", sites: B });
assert.equal(bGas.items[0].propId, "mid");
assert.ok(bGas.items[0].whySurfaced.includes("35,000"));

/* C — massive tract, no traffic */
const C = [
  ev({ propId: "tract", acres: 1495, primaryRoad: null }),
  ev({ propId: "pad", acres: 1.2, primaryAadt: 18000, primaryRoad: "US 190", frontageFt: 300 }),
];
assert.equal(isRankEligible("land_development", C[0]), true);
assert.equal(isRankEligible("gas_station", C[0]), false);
const cLand = reviewSitesForMode({ mode: "land_development", sites: C });
assert.equal(cLand.items[0].propId, "tract");
assert.match(cLand.items[0].whySurfaced, /1,495|larger|development review/i);
const cGas = reviewSitesForMode({ mode: "gas_station", sites: C });
assert.ok(!cGas.items.some((i) => i.propId === "tract"));
assert.equal(cGas.excludedCount, 1);

/* D — high traffic small parcel */
const D = [
  ev({
    propId: "tiny",
    acres: 0.4,
    primaryAadt: 45000,
    primaryRoad: "US 59",
    frontageFt: 40,
    positionClass: "mid_block",
  }),
];
const dGas = reviewSitesForMode({ mode: "gas_station", sites: D });
assert.ok(dGas.items[0].whySurfaced.includes("45,000"));
assert.ok(dGas.items[0].needsVerification.some((l) => /access/i.test(l)));
assert.ok(!/strong site solely|perfect|best investment/i.test(dGas.items[0].whySurfaced));

/* E — missing traffic is not zero */
const E = ev({ propId: "E", acres: 8, frontageFt: 200 });
const eWhy = reviewSitesForMode({ mode: "land_development", sites: [E] }).items[0].whySurfaced;
assert.match(eWhy, /not available/i);
assert.doesNotMatch(eWhy, /0 vehicles/);

/* F — mode switch changes interpretation, not facts */
const F = ev({
  propId: "F",
  acres: 1495,
  primaryAadt: 4153,
  primaryRoad: "FM 350",
  frontageFt: 779,
});
const fLand = reviewSitesForMode({ mode: "land_development", sites: [F] });
const fGas = reviewSitesForMode({ mode: "gas_station", sites: [F] });
assert.equal(fLand.items[0].acres, fGas.items[0].acres);
assert.equal(fLand.items[0].primaryAadt, fGas.items[0].primaryAadt);
assert.notEqual(fLand.reviewLabel, fGas.reviewLabel);
assert.match(fLand.items[0].whySurfaced, /development review/);
assert.match(fGas.items[0].whySurfaced, /large for typical fuel/i);

/* G — evidence is traceable */
assert.match(fGas.items[0].whySurfaced, /4,153/);
assert.match(fGas.items[0].whySurfaced, /779/);
assert.ok(fGas.items[0].needsVerification.length > 0);

assert.equal(RESEARCH_MODES.energy_rei.enabled, false);
assert.equal(reviewSitesForMode({ mode: "energy_rei", sites: [F] }).items.length, 0);

console.log("run-research-mode-truth: ok");
