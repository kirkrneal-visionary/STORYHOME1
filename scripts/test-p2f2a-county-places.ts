/**
 * P2F2A County local-place directory locks.
 * Run: npm run test:p2f2a-county-places
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  listPublicCountyPlaces,
  P2F2A_MULTI_PLACE_LAYOUT_FIXTURE,
} from "../src/lib/geo/county-places.ts";
import { isLocalPlaceProductActive } from "../src/lib/geo/local-place-product.ts";
import { resolvePublicCounty } from "../src/lib/geo/county-route.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(
  readdirSync(join(root, "supabase/migrations")).filter((f) =>
    f.startsWith("0078"),
  ).length,
  0,
);
assert.equal(existsSync(join(root, "src/app/tx/[county]/[place]")), true);
assert.equal(
  existsSync(join(root, "src/components/county/CountyLocalPlaceDirectory.tsx")),
  true,
);

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
  assert.equal(isLocalPlaceProductActive(places[0]!.id), true);
}

assert.equal(resolvePublicCounty("montgomery"), null);
assert.deepEqual(
  listPublicCountyPlaces({ countyFips: "48339" }),
  [],
);

const hidden = ["Onalaska", "Corrigan", "Goodrich", "Cleveland", "Diboll", "Trinity"];
const polk = listPublicCountyPlaces(resolvePublicCounty("polk")!);
const liberty = listPublicCountyPlaces(resolvePublicCounty("liberty")!);
const trinity = listPublicCountyPlaces(resolvePublicCounty("trinity")!);
const shown = [...polk, ...liberty, ...trinity].map((p) => p.displayName);
assert.equal(shown.includes("Cleveland"), false);
assert.equal(shown.includes("Onalaska"), false);
assert.equal(shown.includes("Trinity"), false);
assert.deepEqual(
  shown,
  ["Livingston", "Liberty", "Groveton"],
);

const dir = read("src/components/county/CountyLocalPlaceDirectory.tsx");
const page = read("src/app/tx/[county]/page.tsx");
const placesLib = read("src/lib/geo/county-places.ts");
const shell = read("src/components/county/CountyIdentityShell.tsx");
assert.match(page, /CountyLocalPlaceDirectory/);
assert.match(page, /listPublicCountyPlaces/);
assert.match(dir, /Places in \{countyName\}/);
assert.match(dir, /<h2/);
assert.doesNotMatch(dir, /\/tx\/.*\/|marketplace\?q|Coming Soon|FIPS|UUID|place_type|city|town/i);
assert.doesNotMatch(page, /\/tx\/\$\{|\/tx\/polk\/livingston/);
assert.match(placesLib, /isLocalPlaceProductActive/);
assert.doesNotMatch(
  placesLib,
  /from ["']@\/lib\/markets["']|CITY_SOURCE|hubCity|situs_city/,
);
assert.doesNotMatch(placesLib, /d34e1210-95ec-5371-92cf-69271971259e/);
assert.match(shell, /Explore Properties/);
assert.match(shell, /\{children\}/);
assert.equal(P2F2A_MULTI_PLACE_LAYOUT_FIXTURE.length, 4);
assert.equal(
  P2F2A_MULTI_PLACE_LAYOUT_FIXTURE.every((p) => !isLocalPlaceProductActive(p.id)),
  true,
);
for (const name of hidden) {
  assert.equal(
    name === "Trinity" ||
      P2F2A_MULTI_PLACE_LAYOUT_FIXTURE.some((p) => p.displayName === name) ||
      name === "Cleveland" ||
      name === "Diboll",
    true,
  );
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
  assert.doesNotMatch(
    read(rel),
    /listPublicCountyPlaces|CountyLocalPlaceDirectory/,
  );
}

console.log("p2f2a-county-places: ok");
