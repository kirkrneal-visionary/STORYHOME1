/**
 * Harden Wave 4B — public CAD search/lookup anti-enumeration.
 * Isolated. No production writes. Does not apply 0056/0057.
 * Run: node --experimental-strip-types scripts/test-harden-wave-4b-enumeration.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CAD_ACCESS_POLICY,
  CAD_SEARCH_MIN_CHARS,
  cadAccessCount,
  classifyCadPublicPath,
  consumeCadAccess,
  isSequentialNumericIdBatch,
  resetCadAccessForTests,
} from "../src/lib/cad/public-access.ts";
import { CAD_SEARCH_FORBIDDEN_FIELDS, CAD_SEARCH_SELECT } from "../src/lib/cad/search-shape.ts";
import { classifyApiPath } from "../src/lib/security/rate-limit.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

// --- Path classification: tiles stay unlimited; search/lookup are lanes ---
assert.equal(classifyCadPublicPath("/api/parcels/search"), "search");
assert.equal(classifyCadPublicPath("/api/parcels/lookup"), "lookup");
assert.equal(classifyCadPublicPath("/api/parcels/13/1/2"), null);
assert.equal(classifyCadPublicPath("/api/parcels/14/3829/6754.pbf"), null);
assert.equal(classifyCadPublicPath("/api/shi/search"), null);
assert.equal(classifyApiPath("/api/parcels/13/1/2"), null);
assert.equal(classifyApiPath("/api/parcels/search"), null);
assert.equal(classifyApiPath("/api/parcels/lookup"), null);
assert.equal(classifyApiPath("/api/shi/search"), "medium");
assert.equal(classifyApiPath("/api/shi/area"), "high");

const mw = read("src/middleware.ts");
assert.match(mw, /classifyCadPublicPath/);
assert.match(mw, /consumeCadAccess/);
assert.match(mw, /classifyRequestPath/);

// --- Policy is multi-window, not a single 60s bucket ---
assert.equal(CAD_ACCESS_POLICY.search.length >= 2, true);
assert.equal(CAD_ACCESS_POLICY.lookup.length >= 2, true);
const searchBurst = CAD_ACCESS_POLICY.search.find((w) => w.id === "burst");
const searchDay = CAD_ACCESS_POLICY.search.find((w) => w.id === "day");
const lookupBurst = CAD_ACCESS_POLICY.lookup.find((w) => w.id === "burst");
const lookupDay = CAD_ACCESS_POLICY.lookup.find((w) => w.id === "day");
assert.ok(searchBurst && searchBurst.enforce && searchBurst.limit === 24);
assert.ok(searchBurst.windowMs === 60_000);
assert.ok(lookupBurst && lookupBurst.enforce && lookupBurst.limit === 30);
assert.ok(searchDay && searchDay.enforce === false && searchDay.windowMs > 60_000);
assert.ok(lookupDay && lookupDay.enforce === false && lookupDay.windowMs > 60_000);

// --- Burst 429 + recover; observe-only day window never 429s ---
resetCadAccessForTests();
const ip = "203.0.113.9";
for (let i = 0; i < 24; i++) {
  assert.equal(consumeCadAccess({ lane: "search", ip, now: 1_000 }).ok, true);
}
const blocked = consumeCadAccess({ lane: "search", ip, now: 1_000 });
assert.equal(blocked.ok, false);
if (!blocked.ok) {
  assert.equal(blocked.windowId, "burst");
  assert.ok(blocked.retryAfterSec >= 1);
}
assert.ok(cadAccessCount("search", "day", ip) >= 25);
assert.equal(consumeCadAccess({ lane: "search", ip, now: 1_000 + 60_000 }).ok, true);

resetCadAccessForTests();
for (let i = 0; i < 30; i++) {
  assert.equal(consumeCadAccess({ lane: "lookup", ip, now: 5_000 }).ok, true);
}
assert.equal(consumeCadAccess({ lane: "lookup", ip, now: 5_000 }).ok, false);
assert.equal(consumeCadAccess({ lane: "lookup", ip, now: 5_000 + 60_000 }).ok, true);

// A person can still search several times in a minute.
resetCadAccessForTests();
for (let i = 0; i < 10; i++) {
  assert.equal(consumeCadAccess({ lane: "search", ip: "198.51.100.4", now: 9_000 }).ok, true);
}

// Search and lookup lanes do not share a burst bucket.
resetCadAccessForTests();
for (let i = 0; i < 24; i++) {
  assert.equal(consumeCadAccess({ lane: "search", ip, now: 20_000 }).ok, true);
}
assert.equal(consumeCadAccess({ lane: "lookup", ip, now: 20_000 }).ok, true);

// --- Sequential ID walk ---
assert.equal(isSequentialNumericIdBatch(["100", "101", "102", "103"]), true);
assert.equal(isSequentialNumericIdBatch(["10", "20", "30", "40"]), true);
assert.equal(isSequentialNumericIdBatch(["46940", "46941", "46942", "46943"]), true);
assert.equal(isSequentialNumericIdBatch(["100", "101", "102"]), false);
assert.equal(isSequentialNumericIdBatch(["100", "250", "900", "1200"]), false);
assert.equal(isSequentialNumericIdBatch(["A-1", "B-2", "C-3", "D-4"]), false);
assert.equal(isSequentialNumericIdBatch([]), false);

const lookupRoute = read("src/app/api/parcels/lookup/route.ts");
assert.match(lookupRoute, /CadLookupRejectedError/);
assert.match(lookupRoute, /status: e\.status/);

const bounded = read("src/lib/cad/bounded-search.ts");
assert.match(bounded, /export const CAD_LOOKUP_MAX = 12/);
assert.match(bounded, /isSequentialNumericIdBatch/);
assert.match(bounded, /CAD_SEARCH_SELECT/);
assert.match(bounded, /CAD_LOOKUP_SELECT/);
assert.match(bounded, /CAD_SEARCH_MIN_CHARS/);
assert.doesNotMatch(bounded, /export const CAD_LOOKUP_MAX = 40/);

// --- Slim search ---
for (const field of CAD_SEARCH_FORBIDDEN_FIELDS) {
  assert.doesNotMatch(
    CAD_SEARCH_SELECT,
    new RegExp(`\\b${field}\\b`),
    `search select still asks for ${field}`,
  );
}
assert.match(CAD_SEARCH_SELECT, /\bprop_id\b/);
assert.match(CAD_SEARCH_SELECT, /\bowner_name\b/);
assert.match(CAD_SEARCH_SELECT, /\bsitus_address\b/);
assert.match(CAD_SEARCH_SELECT, /\bcentroid_lat\b/);
assert.doesNotMatch(CAD_SEARCH_SELECT, /\bgeojson\b/);

const searchRoute = read("src/app/api/parcels/search/route.ts");
assert.match(searchRoute, /CAD_SEARCH_MIN_CHARS/);
assert.match(searchRoute, /boundedCadSearch/);

const parcels = read("src/lib/supabase/parcels.ts");
assert.match(parcels, /hydrateParcel/);
assert.match(parcels, /const LOOKUP_CHUNK = 12/);

const listingForm = read("src/components/broker/ListingForm.tsx");
assert.match(listingForm, /hydrateParcel/);
assert.match(listingForm, /linkedFromCountyParcel/);
assert.match(listingForm, /searchParcelsStatewide/);

const homePanel = read("src/components/home/CountyRecordPanel.tsx");
assert.match(homePanel, /hydrateParcel/);
assert.match(homePanel, /searchParcels/);

const listingMap = read("src/components/broker/ListingCadMap.tsx");
assert.match(listingMap, /\/api\/parcels\/\{z\}\/\{x\}\/\{y\}/);
assert.match(listingMap, /fetchParcelsByPropIdsAny/);

const marketMap = read("src/components/marketplace/MarketplaceMap.tsx");
assert.match(marketMap, /\/api\/parcels\/\{z\}\/\{x\}\/\{y\}/);
assert.doesNotMatch(marketMap, /\/api\/parcels\/search/);
assert.doesNotMatch(marketMap, /\/api\/parcels\/lookup/);

const shiSearch = read("src/app/api/shi/search/route.ts");
assert.match(shiSearch, /requireStoryPro/);
assert.doesNotMatch(shiSearch, /classifyCadPublicPath/);

assert.equal(CAD_SEARCH_MIN_CHARS, 2);

console.log("harden-wave-4b-enumeration: ok");
