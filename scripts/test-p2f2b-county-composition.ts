/**
 * P2F2B County discovery composition locks.
 * Run: npm run test:p2f2b-county-composition
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listPublicCountyPlaces } from "../src/lib/geo/county-places.ts";
import { P2F2A_MULTI_PLACE_LAYOUT_FIXTURE } from "../src/lib/geo/county-places.ts";
import { isLocalPlaceProductActive } from "../src/lib/geo/local-place-product.ts";
import {
  countyMarketplacePath,
  resolvePublicCounty,
} from "../src/lib/geo/county-route.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(
  readdirSync(join(root, "supabase/migrations")).filter((f) =>
    f.startsWith("0078"),
  ).length,
  0,
);

const shell = read("src/components/county/CountyIdentityShell.tsx");
const dir = read("src/components/county/CountyLocalPlaceDirectory.tsx");
const page = read("src/app/tx/[county]/page.tsx");
const fixture = read("src/app/internal/p2f2a-fixture/page.tsx");
const placeShell = read("src/components/county/LocalPlaceIdentityShell.tsx");
const placePage = read("src/app/tx/[county]/[place]/page.tsx");

assert.match(shell, /data-county-composition/);
assert.match(shell, /data-county-cover-fallback/);
assert.match(shell, /data-county-where/);
assert.match(shell, /data-county-property/);
assert.match(shell, /data-county-ending/);
assert.match(shell, /<h1/);
assert.match(shell, /<h2/);
assert.match(shell, /Explore Properties/);
assert.match(shell, /countyMarketplacePath/);
assert.match(shell, /\{children\}/);
assert.match(shell, /min-h-11/);
assert.match(shell, /focus-visible:outline-gold/);
assert.match(shell, /Texas/);
assert.doesNotMatch(shell, /<img|next\/image|Unsplash|Coming Soon|FIPS|48373/i);
assert.doesNotMatch(
  shell,
  /Livingston|Onalaska|listing|carousel|parcel|mapbox|weather|school|Realtor|Story circle/i,
);

assert.match(dir, /Places in \{countyName\}/);
assert.match(dir, /<h2/);
assert.match(dir, /data-county-places/);
assert.match(dir, /min-h-11/);
assert.doesNotMatch(
  dir,
  /\/tx\/.*\/|marketplace\?q|Coming Soon|FIPS|UUID|place_type|city|town/i,
);
assert.doesNotMatch(dir, /rounded-2xl|listing card|0 listings|Coming Soon/i);

assert.match(page, /CountyIdentityShell/);
assert.match(page, /CountyLocalPlaceDirectory/);
assert.match(page, /index: false/);
assert.match(page, /Explore property across/);
assert.doesNotMatch(page, /Coming Soon|FIPS|48373|<img|next\/image/);

assert.match(fixture, /CountyIdentityShell/);
assert.match(fixture, /P2F2A_PLACE_FIXTURE/);
assert.match(fixture, /P2F2A_MULTI_PLACE_LAYOUT_FIXTURE/);
assert.match(fixture, /notFound\(\)/);

assert.doesNotMatch(placeShell, /data-county-composition|CountyIdentityShell/);
assert.match(placePage, /LocalPlaceIdentityShell/);
assert.doesNotMatch(placePage, /CountyIdentityShell|data-county-composition/);

const expected = {
  polk: "Livingston",
  angelina: "Lufkin",
  liberty: "Liberty",
  "san-jacinto": "Coldspring",
  trinity: "Groveton",
  tyler: "Woodville",
  walker: "Huntsville",
} as const;

for (const [slug, name] of Object.entries(expected)) {
  const identity = resolvePublicCounty(slug);
  assert.ok(identity, slug);
  const places = listPublicCountyPlaces(identity!);
  assert.equal(places.length, 1, slug);
  assert.equal(places[0]?.displayName, name);
  assert.equal(
    countyMarketplacePath(identity!),
    `/marketplace?q=${encodeURIComponent(`${identity!.canonicalName}, TX`)}&intent=sale`,
  );
}

assert.equal(resolvePublicCounty("montgomery"), null);
assert.equal(resolvePublicCounty("not-a-county"), null);
assert.equal(P2F2A_MULTI_PLACE_LAYOUT_FIXTURE.length, 4);
assert.deepEqual(
  P2F2A_MULTI_PLACE_LAYOUT_FIXTURE.map((p) => p.displayName),
  ["Livingston", "Onalaska", "Corrigan", "Goodrich"],
);
assert.equal(
  P2F2A_MULTI_PLACE_LAYOUT_FIXTURE.every((p) => !isLocalPlaceProductActive(p.id)),
  true,
);

const hidden = ["Onalaska", "Corrigan", "Goodrich", "Cleveland"];
const shown = listPublicCountyPlaces(resolvePublicCounty("polk")!).map(
  (p) => p.displayName,
);
for (const name of hidden) {
  assert.equal(shown.includes(name), false, name);
}

for (const rel of [
  "src/app/page.tsx",
  "src/components/home/HomeSearchHero.tsx",
  "src/components/GlobalNav.tsx",
  "src/lib/search/url.ts",
  "src/lib/search/interpret.ts",
  "src/lib/markets.ts",
  "src/app/marketplace/page.tsx",
]) {
  const src = read(rel);
  assert.doesNotMatch(
    src,
    /data-county-composition|CountyLocalPlaceDirectory|listPublicCountyPlaces/,
  );
}

assert.equal(existsSync(join(root, "src/components/county/LocalPlaceIdentityShell.tsx")), true);

console.log("p2f2b-county-composition: ok");
