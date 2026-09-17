/**
 * First-party Smart Search: interpret, authorize, no model, no warehouse door.
 * Run: node --experimental-strip-types scripts/test-smart-search.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  authorizeSearchInput,
  interpretSearch,
  planToMarketplaceParams,
} from "../src/lib/search/interpret.ts";
import {
  SMART_SEARCH_LISTING_CAP,
  SMART_SEARCH_QUERY_MAX,
  SMART_SEARCH_RECORD_CAP,
} from "../src/lib/search/plan.ts";
import {
  MODEL_PAYLOAD_ALLOWLIST,
  SMART_SEARCH_FIXED_MONTHLY_USD,
  SMART_SEARCH_MODEL_ENABLED,
  SMART_SEARCH_USAGE_USD,
  paidInterpretStatus,
} from "../src/lib/search/provider.ts";
import { filtersFromSearchParams } from "../src/lib/search/url.ts";
import { classifyApiPath } from "../src/lib/security/rate-limit.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const livingston = authorizeSearchInput({
  q: "10+ acre properties around Livingston",
});
assert.equal(livingston.geography.labels[0], "Livingston");
assert.equal(livingston.geography.cadSource, "polk_cad");
assert.equal(livingston.geography.cadQuery, "Livingston");
assert.equal(livingston.filters.acresMin, "10");
assert.equal(livingston.recordsEligible, true);
assert.ok(livingston.geography.cadQuery && livingston.geography.cadQuery.length >= 2);

const price = authorizeSearchInput({
  q: "Homes currently for sale under $400,000",
});
assert.equal(price.filters.priceMax, "400000");
assert.equal(price.recordsEligible, false);

const zip = authorizeSearchInput({ q: "77351" });
assert.equal(zip.geography.kind, "zip");
assert.equal(zip.geography.cadQuery, "77351");

const houston = authorizeSearchInput({ q: "homes in Houston" });
assert.equal(houston.geography.inFootprint, false);
assert.equal(houston.recordsEligible, false);
assert.match(planToMarketplaceParams(houston).get("note") ?? "", /East Texas/i);

const acresOnly = authorizeSearchInput({ q: "10+ acres somewhere" });
assert.equal(acresOnly.recordsEligible, false);
assert.ok(
  acresOnly.unknowns.some((u) => /acreage catalog|city, ZIP/i.test(u)),
);

const shop = authorizeSearchInput({
  q: "Something between Livingston and Lufkin with a shop",
});
assert.deepEqual(shop.geography.labels, ["Livingston", "Lufkin"]);
assert.ok(shop.unknowns.some((u) => /shop/i.test(u)));

const rent = authorizeSearchInput({ q: "house for rent in Livingston" });
assert.ok(rent.unknowns.some((u) => /rental/i.test(u)));

const frontage = authorizeSearchInput({
  q: "Land with strong road frontage worth exploring",
});
assert.ok(frontage.unknowns.some((u) => /Story Pro/i.test(u)));
assert.equal(frontage.recordsEligible, false);

const libertyCounty = authorizeSearchInput({ q: "Liberty County land" });
assert.equal(libertyCounty.geography.kind, "county");
assert.equal(libertyCounty.geography.labels[0], "Liberty County");
assert.equal(libertyCounty.geography.cadSource, "liberty_cad");

const libertyCity = authorizeSearchInput({ q: "Liberty" });
assert.equal(libertyCity.geography.kind, "city");
assert.equal(libertyCity.geography.labels[0], "Liberty");

const tylerBare = authorizeSearchInput({ q: "Tyler" });
assert.equal(tylerBare.recordsEligible, false);
assert.notEqual(tylerBare.geography.cadSource, "tyler_cad");

const combo = authorizeSearchInput({ q: "3/2 in Huntsville under 250k" });
assert.equal(combo.filters.beds, "3");
assert.equal(combo.filters.baths, "2");
assert.equal(combo.filters.priceMax, "250000");

const ranch = authorizeSearchInput({ q: "ranch in Woodville" });
assert.deepEqual(ranch.filters.propertyTypes, ["Farm and Ranch"]);
const ranchParams = planToMarketplaceParams(ranch);
assert.equal(ranchParams.get("types"), "Farm and Ranch");
assert.equal(
  filtersFromSearchParams(ranchParams).propertyTypes[0],
  "Farm and Ranch",
);

const overAcres = authorizeSearchInput({ q: "Polk County land over 20 acres" });
assert.equal(overAcres.filters.acresMin, "20");
assert.equal(overAcres.filters.priceMin, "");

const hostile = authorizeSearchInput({
  q: "Livingston",
  resultCap: 500000,
  lane: "warehouse",
  wantFrontage: true,
  traffic: true,
  neighbors: true,
  serviceRole: true,
  plan: { resultCap: 99999, lane: "shi" },
  advanced: {
    statuses: ["not-a-status"],
    propertyTypes: ["Castle"],
    geojson: true,
  },
});
assert.ok(hostile.filters.statuses.every((s) => s !== "not-a-status"));
assert.equal(hostile.lane === "shi" || hostile.lane === "warehouse", false);
assert.ok(!("resultCap" in hostile));
assert.equal(SMART_SEARCH_LISTING_CAP, 40);
assert.equal(SMART_SEARCH_RECORD_CAP, 30);
assert.equal(SMART_SEARCH_QUERY_MAX, 280);

const long = "x".repeat(400);
const clipped = interpretSearch(long);
assert.ok(clipped.rawQuery.length <= SMART_SEARCH_QUERY_MAX);

assert.equal(SMART_SEARCH_MODEL_ENABLED, false);
assert.equal(paidInterpretStatus().allowed, false);
assert.equal(SMART_SEARCH_FIXED_MONTHLY_USD, 0);
assert.equal(SMART_SEARCH_USAGE_USD, 0);
assert.deepEqual(MODEL_PAYLOAD_ALLOWLIST, ["q", "advanced"]);

assert.equal(classifyApiPath("/api/smart-search/interpret"), "medium");
assert.equal(classifyApiPath("/api/smart-search/run"), "medium");

const run = read("src/lib/search/run.ts");
assert.match(run, /boundedCadSearch/);
assert.match(run, /consumeCadAccess/);
assert.match(run, /SMART_SEARCH_LISTING_CAP/);
assert.doesNotMatch(run, /openai|anthropic|generateText|gpt-/i);
assert.doesNotMatch(run, /corridor_parcel_frontage|parcel_neighbors/);
assert.doesNotMatch(run, /from\(["']county_parcels["']\)/);

const interpretSrc = read("src/lib/search/interpret.ts");
assert.doesNotMatch(interpretSrc, /openai|anthropic|generateText|gpt-/i);
assert.match(interpretSrc, /paidInterpretStatus/);

const provider = read("src/lib/search/provider.ts");
assert.match(provider, /SMART_SEARCH_MODEL_ENABLED = false/);
assert.match(provider, /Paid interpretation stays locked off/);

const interpretRoute = read("src/app/api/smart-search/interpret/route.ts");
assert.match(interpretRoute, /authorizeSearchInput/);
assert.doesNotMatch(interpretRoute, /boundedCadSearch/);
assert.doesNotMatch(interpretRoute, /openai|anthropic/i);

const runRoute = read("src/app/api/smart-search/run/route.ts");
assert.match(runRoute, /authorizeSearchInput/);
assert.match(runRoute, /runAuthorizedPlan/);
assert.doesNotMatch(runRoute, /openai|anthropic/i);

const rate = read("src/lib/security/rate-limit.ts");
assert.match(rate, /\/api\/smart-search\//);

const hero = read("src/components/home/HomeSearchHero.tsx");
assert.match(hero, /home-hero-meadow/);
assert.match(hero, /HomeGhostHint/);
assert.match(hero, /Advanced/);
assert.match(hero, /authorizeSearchInput/);
assert.doesNotMatch(hero, /\/api\/smart-search/);
assert.doesNotMatch(hero, /unsplash/i);
assert.doesNotMatch(hero, /For Rent/);
assert.doesNotMatch(hero, /rgba\(9,21,37,0\.68\)/);

const ghost = read("src/components/home/HomeGhostHint.tsx");
assert.match(ghost, /aria-hidden/);
assert.doesNotMatch(ghost, /setQuery|value=\{/);

console.log("smart-search armor: ok");
