/**
 * P2F1A County route authority locks.
 * Run: npm run test:p2f1a-county-route
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isCountyProductActive } from "../src/lib/geo/county-product.ts";
import {
  canonicalCountyParam,
  countySlugFromName,
  needsCountyCanonicalRedirect,
  publicCountyPath,
  resolvePublicCounty,
} from "../src/lib/geo/county-route.ts";
import { TX_COUNTIES, txCountyNameByFips } from "../src/lib/tx-counties.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(readdirSync(join(root, "supabase/migrations")).filter((f) => f.startsWith("0077")).length, 0);
assert.equal(existsSync(join(root, "src/app/tx/[county]/page.tsx")), true);
assert.equal(existsSync(join(root, "src/app/tx/[county]/not-found.tsx")), true);
assert.equal(existsSync(join(root, "src/app/tx/[county]/[place]")), true);

const slugs = TX_COUNTIES.map((c) => countySlugFromName(c.name));
assert.equal(slugs.every(Boolean), true);
assert.equal(new Set(slugs).size, 254);
assert.equal(countySlugFromName("Polk County"), "polk");
assert.equal(countySlugFromName("San Jacinto County"), "san-jacinto");
assert.equal(countySlugFromName("Angelina County"), "angelina");

const activeSlugs = TX_COUNTIES.filter((c) => isCountyProductActive(c.fips))
  .map((c) => countySlugFromName(c.name))
  .sort();
assert.deepEqual(activeSlugs, [
  "angelina",
  "liberty",
  "polk",
  "san-jacinto",
  "trinity",
  "tyler",
  "walker",
]);

for (const slug of activeSlugs) {
  const identity = resolvePublicCounty(slug);
  assert.ok(identity, slug);
  assert.equal(identity?.slug, slug);
  assert.equal(identity?.state, "TX");
  assert.equal(identity?.countyFips.length, 5);
  assert.equal(txCountyNameByFips(identity!.countyFips), identity!.canonicalName);
}
assert.equal(resolvePublicCounty("montgomery"), null);
assert.equal(resolvePublicCounty("not-a-county"), null);
assert.equal(resolvePublicCounty("livngston"), null);
assert.equal(resolvePublicCounty("Polk")?.slug, "polk");
assert.equal(canonicalCountyParam("POLK"), "polk");
assert.equal(needsCountyCanonicalRedirect("Polk", "polk"), true);
assert.equal(publicCountyPath("polk"), "/tx/polk");

const liberty = resolvePublicCounty("liberty");
assert.equal(liberty?.countyFips, "48291");
assert.equal(liberty?.canonicalName, "Liberty County");
const trinity = resolvePublicCounty("trinity");
assert.equal(trinity?.countyFips, "48455");
assert.equal(trinity?.canonicalName, "Trinity County");

const page = read("src/app/tx/[county]/page.tsx");
assert.match(page, /resolvePublicCounty/);
assert.match(page, /notFound\(\)/);
assert.match(page, /permanentRedirect/);
assert.doesNotMatch(page, /local_place|listings|professional_|Coming Soon|is_active/);
const mw = read("src/middleware.ts");
assert.match(mw, /resolvePublicCounty/);
assert.match(mw, /status: 404/);
assert.match(mw, /NextResponse.redirect\(next, 308\)/);
const nf = read("src/app/tx/[county]/not-found.tsx");
assert.match(nf, /This page isn’t available|This page isn't available/);
assert.doesNotMatch(nf, /coming soon|inactive|montgomery|activation/i);
for (const rel of [
  "src/app/page.tsx",
  "src/components/GlobalNav.tsx",
  "src/lib/search/url.ts",
  "src/lib/search/interpret.ts",
  "src/lib/markets.ts",
  "src/app/marketplace/page.tsx",
]) {
  assert.doesNotMatch(read(rel), /resolvePublicCounty|publicCountyPath|\/tx\/polk/);
}

console.log("p2f1a-county-route: ok");
