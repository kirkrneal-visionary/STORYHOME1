/**
 * P2F1B County identity shell locks.
 * Run: npm run test:p2f1b-county-identity
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isCountyProductActive } from "../src/lib/geo/county-product.ts";
import {
  countyMarketplacePath,
  countySlugFromName,
  resolvePublicCounty,
} from "../src/lib/geo/county-route.ts";
import { TX_COUNTIES } from "../src/lib/tx-counties.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(
  readdirSync(join(root, "supabase/migrations")).filter((f) =>
    f.startsWith("0077"),
  ).length,
  0,
);
assert.equal(existsSync(join(root, "src/app/tx/[county]/page.tsx")), true);
assert.equal(
  existsSync(join(root, "src/components/county/CountyIdentityShell.tsx")),
  true,
);
assert.equal(existsSync(join(root, "src/app/tx/[county]/[place]")), false);

const active = TX_COUNTIES.filter((c) => isCountyProductActive(c.fips));
assert.equal(active.length, 7);

const shell = read("src/components/county/CountyIdentityShell.tsx");
const page = read("src/app/tx/[county]/page.tsx");
const route = read("src/lib/geo/county-route.ts");

assert.match(page, /CountyIdentityShell/);
assert.match(page, /resolvePublicCounty/);
assert.match(page, /notFound\(\)/);
assert.match(shell, /Explore Properties/);
assert.match(shell, /countyMarketplacePath/);
assert.match(shell, /<h1/);
assert.match(shell, /aria-label="Story Home"/);
assert.match(shell, /min-h-11/);
assert.match(shell, /focus-visible:outline-gold/);
assert.doesNotMatch(shell, /countyFips|FIPS|48373|is_active|Coming Soon/i);
assert.doesNotMatch(
  shell,
  /Livingston|Onalaska|Corrigan|Goodrich|Story circle|Open House|Realtor|parcel|mapbox|weather|school/i,
);
assert.doesNotMatch(page, /countyFips|FIPS|48373|Coming Soon|is_active/);
assert.doesNotMatch(page, /<img|next\/image|storyhome-meadow/);
assert.doesNotMatch(shell, /<img|next\/image|storyhome-meadow/);

for (const county of active) {
  const slug = countySlugFromName(county.name);
  const identity = resolvePublicCounty(slug);
  assert.ok(identity, slug ?? county.name);
  assert.equal(identity?.canonicalName, county.name);
  assert.equal(identity?.state, "TX");
  assert.equal(
    countyMarketplacePath(identity!),
    `/marketplace?q=${encodeURIComponent(`${county.name}, TX`)}&intent=sale`,
  );
}

assert.equal(
  countyMarketplacePath({ canonicalName: "Polk County", state: "TX" }),
  "/marketplace?q=Polk%20County%2C%20TX&intent=sale",
);
assert.equal(
  countyMarketplacePath({
    canonicalName: "San Jacinto County",
    state: "TX",
  }),
  "/marketplace?q=San%20Jacinto%20County%2C%20TX&intent=sale",
);
assert.equal(resolvePublicCounty("montgomery"), null);
assert.equal(resolvePublicCounty("not-a-county"), null);

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
  assert.doesNotMatch(src, /CountyIdentityShell|countyMarketplacePath|\/tx\/polk/);
}

assert.match(route, /function resolvePublicCounty/);
assert.match(route, /isCountyProductActive/);
assert.doesNotMatch(
  read("src/middleware.ts"),
  /CountyIdentityShell|Explore Properties/,
);

console.log("p2f1b-county-identity: ok");
