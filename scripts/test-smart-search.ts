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
import {
  filtersFromSearchParams,
  hasMarketplaceHandoffParams,
} from "../src/lib/search/url.ts";
import { classifyApiPath } from "../src/lib/security/rate-limit.ts";
import {
  DEFAULT_SEARCH_FILTERS,
  applySearchFilters,
  countActiveFilters,
  countActiveFiltersInGroup,
} from "../src/lib/listing-filters.ts";
import {
  GHOST_PHRASES,
  GHOST_STATIC_HINT,
  createGhostRotation,
} from "../src/lib/search/ghost-phrases.ts";
import type { DemoListing } from "../src/lib/demo-data.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const livingston = authorizeSearchInput({
  q: "10+ acre properties around Livingston",
  advanced: {
    query: "",
    acresMin: "",
    priceMax: "",
    statuses: ["Active", "Option Pending Continue to Show"],
  },
});
assert.equal(livingston.geography.labels[0], "Livingston");
assert.equal(livingston.geography.cadSource, "polk_cad");
assert.equal(livingston.geography.cadQuery, "Livingston");
assert.equal(livingston.filters.acresMin, "10");
assert.equal(livingston.filters.query, "Livingston");
assert.equal(livingston.recordsEligible, true);
assert.equal(planToMarketplaceParams(livingston).get("acresMin"), "10");
assert.equal(planToMarketplaceParams(livingston).get("q"), "Livingston");
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

const css = read("src/app/globals.css");
assert.doesNotMatch(css, /\.story-home-search\.story-glass[\s\S]{0,80}--paper/);
assert.doesNotMatch(css, /storyGhostIn/);

const hero = read("src/components/home/HomeSearchHero.tsx");
assert.match(hero, /home-hero-meadow/);
assert.match(hero, /HomeGhostHint/);
assert.match(hero, /Filters/);
assert.match(hero, /story-home-filters-trigger/);
assert.match(hero, /story-home-search-submit/);
assert.match(hero, /story-home-search/);
assert.match(hero, /story-glass/);
assert.match(hero, /items-center justify-center/);
assert.match(hero, /whitespace-nowrap/);
assert.doesNotMatch(hero, /Pause examples/);
assert.doesNotMatch(hero, /GhostPauseButton/);
assert.doesNotMatch(hero, /Play|Pause/);
assert.doesNotMatch(hero, />Advanced</);
assert.doesNotMatch(hero, /story-wordmark/);
assert.match(hero, /story-home-wave-a-search/);
assert.match(hero, /countActiveFilters/);
assert.match(hero, /["']sold["']/);
assert.match(hero, /authorizeSearchInput/);
assert.doesNotMatch(hero, /\/api\/smart-search/);
assert.doesNotMatch(hero, /unsplash/i);
assert.doesNotMatch(hero, /For Rent/);
assert.doesNotMatch(hero, /rgba\(9,21,37,0\.68\)/);

const ghost = read("src/components/home/HomeGhostHint.tsx");
assert.match(ghost, /aria-hidden/);
assert.match(ghost, /TYPE_MS/);
assert.match(ghost, /ERASE_MS/);
assert.match(ghost, /HOLD_MS/);
assert.match(ghost, /visibilitychange/);
assert.match(ghost, /useAnimatedSearchExamples/);
assert.match(ghost, /GHOST_STATIC_HINT/);
assert.doesNotMatch(ghost, /setQuery|value=\{/);
assert.doesNotMatch(ghost, /fetch\(|openai|anthropic/i);
assert.doesNotMatch(ghost, /setInterval/);
assert.doesNotMatch(ghost, /truncate/);
assert.doesNotMatch(ghost, /Livingston/);

const phrasesSrc = read("src/lib/search/ghost-phrases.ts");
assert.match(phrasesSrc, /A little more land in Corrigan—5 acres or more…/);
assert.match(phrasesSrc, /Three bedrooms in Onalaska, under \$350k…/);
assert.match(phrasesSrc, /Room to spread out—10\+ acres in Groveton…/);
assert.match(phrasesSrc, /A home in Trinity with a garage under \$300k…/);
assert.match(phrasesSrc, /A pool at home in Lufkin, under \$450k…/);
assert.match(phrasesSrc, /Three bedrooms and two baths in Diboll…/);
assert.match(phrasesSrc, /A home in Woodville without an HOA…/);
assert.match(phrasesSrc, /More land with the house—5\+ acres in Colmesneil…/);
assert.match(phrasesSrc, /A Coldspring home on at least 2 acres…/);
assert.match(phrasesSrc, /Shepherd homes with a garage, under \$325k…/);
assert.match(phrasesSrc, /Four bedrooms in Dayton, no more than \$400k…/);
assert.match(phrasesSrc, /A home in Liberty with a separate office…/);
assert.match(phrasesSrc, /Three bedrooms and no HOA in Huntsville…/);
assert.match(phrasesSrc, /Somewhere with 5–15 acres in New Waverly…/);
assert.match(phrasesSrc, /5\+ acres in Corrigan/);
assert.match(phrasesSrc, /3 bed in Onalaska under \$350k/);
assert.equal(GHOST_PHRASES.length, 14);
assert.equal(new Set(GHOST_PHRASES.map((row) => row.county)).size, 7);
assert.match(GHOST_STATIC_HINT.full, /Search homes/);

function seeded(start: number) {
  let seed = start;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
const rotation = createGhostRotation(seeded(11));
const firstPass = Array.from({ length: 7 }, () => rotation.next());
assert.equal(new Set(firstPass.map((row) => row.county)).size, 7);
const secondPass = Array.from({ length: 7 }, () => rotation.next());
assert.equal(new Set(secondPass.map((row) => row.county)).size, 7);
assert.notEqual(firstPass[6].county, secondPass[0].county);
assert.notEqual(firstPass[6].id, secondPass[0].id);
const walk = createGhostRotation(seeded(3));
const seen = Array.from({ length: 14 }, () => walk.next());
assert.equal(new Set(seen.map((row) => row.id)).size, 14);

const pref = read("src/lib/search/ghost-preference.ts");
assert.match(pref, /story-home-animated-search-examples/);
assert.match(pref, /prefers-reduced-motion/);
assert.match(pref, /localStorage/);

const motionUi = read("src/components/home/GhostExamplesControl.tsx");
assert.match(motionUi, /Animated search examples/);
assert.match(motionUi, /aria-pressed/);
const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /HeaderMotionMenu/);
assert.match(nav, /href=\"\/rent\"/);
assert.doesNotMatch(nav, /intent=rent/);
const drawer = read("src/components/nav/FederatedNavDrawer.tsx");
assert.match(drawer, /GhostExamplesControl/);
assert.match(drawer, /xl:hidden/);

const advanced = read("src/components/home/HomeAdvancedSearch.tsx");
assert.match(advanced, />\s*Apply\s*</);
assert.match(advanced, /story-filter-wing/);
assert.match(advanced, /Price & land/);
assert.match(advanced, /onApply/);
assert.match(advanced, /Escape/);
assert.match(advanced, /visualViewport/);
assert.match(advanced, /preventScroll/);
assert.match(advanced, /createPortal/);
assert.match(advanced, /data-advanced-chrome="pinned"/);
assert.match(advanced, /flex h-fit flex-col/);
assert.match(advanced, /min-h-\[3\.75rem\]/);
assert.match(advanced, /story-home-search-submit/);
assert.doesNotMatch(advanced, /inset-0/);
assert.doesNotMatch(advanced, /bg-\[var\(--paper\)\]/);
assert.doesNotMatch(advanced, /aria-modal="true"/);

assert.match(css, /story-filter-wing/);
assert.match(css, /280ms/);

const phrasePlans = [
  {
    q: "A little more land in Corrigan—5 acres or more…",
    city: "Corrigan",
    acresMin: "5",
  },
  {
    q: "Three bedrooms in Onalaska, under $350k…",
    city: "Onalaska",
    beds: "3",
    priceMax: "350000",
  },
  {
    q: "Room to spread out—10+ acres in Groveton…",
    city: "Groveton",
    acresMin: "10",
  },
  {
    q: "A home in Trinity with a garage under $300k…",
    city: "Trinity",
    garage: true,
    priceMax: "300000",
  },
  {
    q: "A pool at home in Lufkin, under $450k…",
    city: "Lufkin",
    pool: true,
    priceMax: "450000",
  },
  {
    q: "Three bedrooms and two baths in Diboll…",
    city: "Diboll",
    beds: "3",
    baths: "2",
  },
  {
    q: "A home in Woodville without an HOA…",
    city: "Woodville",
    hoa: "no_hoa",
  },
  {
    q: "More land with the house—5+ acres in Colmesneil…",
    city: "Colmesneil",
    acresMin: "5",
  },
  {
    q: "A Coldspring home on at least 2 acres…",
    city: "Coldspring",
    acresMin: "2",
  },
  {
    q: "Shepherd homes with a garage, under $325k…",
    city: "Shepherd",
    garage: true,
    priceMax: "325000",
  },
  {
    q: "Four bedrooms in Dayton, no more than $400k…",
    city: "Dayton",
    beds: "4",
    priceMax: "400000",
  },
  {
    q: "A home in Liberty with a separate office…",
    city: "Liberty",
    office: true,
  },
  {
    q: "Three bedrooms and no HOA in Huntsville…",
    city: "Huntsville",
    beds: "3",
    hoa: "no_hoa",
  },
  {
    q: "Somewhere with 5–15 acres in New Waverly…",
    city: "New Waverly",
    acresMin: "5",
    acresMax: "15",
  },
] as const;

for (const row of phrasePlans) {
  const plan = authorizeSearchInput({ q: row.q });
  assert.equal(plan.geography.labels[0], row.city, row.q);
  if ("acresMin" in row) assert.equal(plan.filters.acresMin, row.acresMin, row.q);
  if ("acresMax" in row) assert.equal(plan.filters.acresMax, row.acresMax, row.q);
  if ("priceMax" in row) assert.equal(plan.filters.priceMax, row.priceMax, row.q);
  if ("beds" in row) assert.equal(plan.filters.beds, row.beds, row.q);
  if ("baths" in row) assert.equal(plan.filters.baths, row.baths, row.q);
  if ("garage" in row) assert.equal(plan.filters.garage, true, row.q);
  if ("pool" in row) assert.equal(plan.filters.pool, true, row.q);
  if ("office" in row) assert.equal(plan.filters.office, true, row.q);
  if ("hoa" in row) assert.equal(plan.filters.hoa, "no_hoa", row.q);
}

const grouped = {
  ...DEFAULT_SEARCH_FILTERS,
  priceMax: "350000",
  acresMin: "5",
  beds: "3",
  garage: true,
};
assert.equal(countActiveFiltersInGroup(grouped, "price_land"), 2);
assert.equal(countActiveFiltersInGroup(grouped, "home"), 1);
assert.equal(countActiveFiltersInGroup(grouped, "features"), 1);

const fixtures: DemoListing[] = [
  {
    id: "keep",
    agentId: "a",
    price: 350000,
    addressSerif: "1 Pine",
    city: "Livingston",
    countyName: "Polk County",
    beds: 3,
    baths: 2,
    sqft: 1800,
    acres: 12,
    lotSize: "12 acres",
    yearBuilt: 1990,
    description: "Land",
    status: "Active",
    propertyType: "Farm and Ranch",
    hasOffice: false,
    hasGarage: true,
    hasPool: false,
    hasHoa: false,
    photoUrl: "",
    likeCount: 0,
    saveCount: 0,
    commentCount: 0,
    lat: 30.7,
    lng: -94.9,
  },
  {
    id: "drop-price",
    agentId: "a",
    price: 900000,
    addressSerif: "2 Pine",
    city: "Livingston",
    countyName: "Polk County",
    beds: 3,
    baths: 2,
    sqft: 1800,
    acres: 14,
    lotSize: "14 acres",
    yearBuilt: 1990,
    description: "Land",
    status: "Active",
    propertyType: "Farm and Ranch",
    hasOffice: false,
    hasGarage: true,
    hasPool: false,
    hasHoa: false,
    photoUrl: "",
    likeCount: 0,
    saveCount: 0,
    commentCount: 0,
    lat: 30.7,
    lng: -94.9,
  },
  {
    id: "drop-acres",
    agentId: "a",
    price: 300000,
    addressSerif: "3 Pine",
    city: "Livingston",
    countyName: "Polk County",
    beds: 3,
    baths: 2,
    sqft: 1800,
    acres: 2,
    lotSize: "2 acres",
    yearBuilt: 1990,
    description: "Land",
    status: "Active",
    propertyType: "Farm and Ranch",
    hasOffice: false,
    hasGarage: true,
    hasPool: false,
    hasHoa: false,
    photoUrl: "",
    likeCount: 0,
    saveCount: 0,
    commentCount: 0,
    lat: 30.7,
    lng:  -94.9,
  },
];

const applied = {
  ...DEFAULT_SEARCH_FILTERS,
  acresMin: "10",
  priceMax: "400000",
  beds: "3",
  keyword: "Land",
};
assert.ok(countActiveFilters(applied) >= 3);
const handed = authorizeSearchInput({
  q: "Livingston",
  advanced: applied,
});
const params = planToMarketplaceParams(handed);
assert.equal(hasMarketplaceHandoffParams(new URLSearchParams()), false);
assert.equal(hasMarketplaceHandoffParams(params), true);
const received = filtersFromSearchParams(params);
assert.equal(received.query, "Livingston");
assert.equal(received.acresMin, "10");
assert.equal(received.priceMax, "400000");
assert.equal(received.beds, "3");
assert.equal(received.keyword, "Land");
const matched = applySearchFilters(fixtures, received);
assert.deepEqual(
  matched.map((row) => row.id),
  ["keep"],
);
const reset = applySearchFilters(fixtures, DEFAULT_SEARCH_FILTERS);
assert.ok(reset.length >= 2);

const rentPage = read("src/app/rent/page.tsx");
assert.match(rentPage, /does not have rental inventory/);
assert.doesNotMatch(rentPage, /intent=rent/);

console.log("smart-search armor: ok");
