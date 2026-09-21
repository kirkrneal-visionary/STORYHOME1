/**
 * P2F3A public local-place route authority locks.
 * Run: npm run test:p2f3a-local-place-route
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isLocalPlaceProductActive } from "../src/lib/geo/local-place-product.ts";
import {
  P2F3A_SECONDARY_COUNTY_FIXTURE,
  publicLocalPlacePath,
  resolvePublicLocalPlace,
  resolvePublicLocalPlaceFromCatalog,
} from "../src/lib/geo/local-place-route.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(
  readdirSync(join(root, "supabase/migrations")).filter((f) =>
    f.startsWith("0077"),
  ).length,
  0,
);
assert.equal(existsSync(join(root, "src/app/tx/[county]/[place]/page.tsx")), true);

const active = {
  angelina: "lufkin",
  liberty: "liberty",
  polk: "livingston",
  "san-jacinto": "coldspring",
  trinity: "groveton",
  tyler: "woodville",
  walker: "huntsville",
} as const;

for (const [county, place] of Object.entries(active)) {
  const resolved = resolvePublicLocalPlace(county, place);
  assert.equal(resolved.status, "ok", `${county}/${place}`);
  if (resolved.status !== "ok") continue;
  assert.equal(resolved.identity.canonicalSlug, place);
  assert.equal(resolved.identity.county.slug, county);
  assert.equal(isLocalPlaceProductActive(resolved.identity.localPlaceId), true);
}

assert.equal(resolvePublicLocalPlace("polk", "onalaska").status, "not_found");
assert.equal(resolvePublicLocalPlace("polk", "corrigan").status, "not_found");
assert.equal(resolvePublicLocalPlace("liberty", "cleveland").status, "not_found");
assert.equal(resolvePublicLocalPlace("montgomery", "cleveland").status, "not_found");
assert.equal(resolvePublicLocalPlace("montgomery", "conroe").status, "not_found");
assert.equal(resolvePublicLocalPlace("polk", "lufkin").status, "not_found");
assert.equal(resolvePublicLocalPlace("polk", "not-a-place").status, "not_found");
assert.equal(resolvePublicLocalPlace("not-a-county", "livingston").status, "not_found");

const mixed = resolvePublicLocalPlace("Polk", "Livingston");
assert.equal(mixed.status, "redirect");
assert.equal(mixed.status === "redirect" && mixed.path, "/tx/polk/livingston");

const alias = resolvePublicLocalPlace("san-jacinto", "cold-spring");
assert.equal(alias.status, "redirect");
assert.equal(alias.status === "redirect" && alias.path, "/tx/san-jacinto/coldspring");

const secondary = resolvePublicLocalPlaceFromCatalog(
  "walker",
  "livingston",
  P2F3A_SECONDARY_COUNTY_FIXTURE,
);
assert.equal(secondary.status, "redirect");
assert.equal(
  secondary.status === "redirect" && secondary.path,
  "/tx/polk/livingston",
);
assert.equal(resolvePublicLocalPlace("walker", "livingston").status, "not_found");
assert.equal(isLocalPlaceProductActive(P2F3A_SECONDARY_COUNTY_FIXTURE[0]!.id), true);
assert.equal(publicLocalPlacePath("polk", "livingston"), "/tx/polk/livingston");

const page = read("src/app/tx/[county]/[place]/page.tsx");
const route = read("src/lib/geo/local-place-route.ts");
const dir = read("src/components/county/CountyLocalPlaceDirectory.tsx");
const countyPage = read("src/app/tx/[county]/page.tsx");
const mw = read("src/middleware.ts");
assert.match(page, /resolvePublicLocalPlace/);
assert.match(page, /index: false/);
assert.match(page, /LocalPlaceIdentityShell|<h1/);
assert.doesNotMatch(page, /Coming Soon/i);
assert.match(route, /isLocalPlaceProductActive/);
assert.match(route, /resolvePublicCounty/);
assert.match(mw, /resolvePublicLocalPlace/);
assert.doesNotMatch(dir, /marketplace\?q|Coming Soon|FIPS|UUID/i);
assert.doesNotMatch(countyPage, /\/tx\/polk\/livingston/);
assert.doesNotMatch(
  route,
  /from ["']@\/lib\/markets["']|CITY_SOURCE|hubCity|situs_city/,
);
for (const rel of [
  "src/app/page.tsx",
  "src/components/GlobalNav.tsx",
  "src/lib/search/url.ts",
  "src/lib/search/interpret.ts",
  "src/lib/markets.ts",
  "src/app/marketplace/page.tsx",
]) {
  assert.doesNotMatch(read(rel), /resolvePublicLocalPlace|local-place-route/);
}

console.log("p2f3a-local-place-route: ok");
