/**
 * P2F3B local-place identity shell locks.
 * Run: npm run test:p2f3b-place-identity
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolvePublicCounty } from "../src/lib/geo/county-route.ts";
import { listPublicCountyPlaces } from "../src/lib/geo/county-places.ts";
import {
  localPlaceMarketplacePath,
  publicLocalPlacePath,
  resolvePublicLocalPlace,
} from "../src/lib/geo/local-place-route.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(
  readdirSync(join(root, "supabase/migrations")).filter((f) =>
    f.startsWith("0078"),
  ).length,
  0,
);
assert.equal(
  existsSync(join(root, "src/components/county/LocalPlaceIdentityShell.tsx")),
  true,
);

const active = {
  angelina: ["lufkin", "Lufkin"],
  liberty: ["liberty", "Liberty"],
  polk: ["livingston", "Livingston"],
  "san-jacinto": ["coldspring", "Coldspring"],
  trinity: ["groveton", "Groveton"],
  tyler: ["woodville", "Woodville"],
  walker: ["huntsville", "Huntsville"],
} as const;

for (const [county, [slug, name]] of Object.entries(active)) {
  const resolved = resolvePublicLocalPlace(county, slug);
  assert.equal(resolved.status, "ok", `${county}/${slug}`);
  if (resolved.status !== "ok") continue;
  assert.equal(resolved.identity.displayName, name);
  assert.equal(
    localPlaceMarketplacePath(resolved.identity),
    `/marketplace?q=${encodeURIComponent(`${name}, TX`)}&intent=sale`,
  );
  const places = listPublicCountyPlaces(resolvePublicCounty(county)!);
  assert.equal(places.length, 1);
  assert.equal(places[0]?.displayName, name);
}

assert.equal(resolvePublicLocalPlace("polk", "onalaska").status, "not_found");
assert.equal(resolvePublicLocalPlace("polk", "corrigan").status, "not_found");
assert.equal(resolvePublicLocalPlace("liberty", "cleveland").status, "not_found");
assert.equal(resolvePublicLocalPlace("san-jacinto", "cold-spring").status, "redirect");
assert.equal(resolvePublicLocalPlace("Polk", "Livingston").status, "redirect");
assert.equal(
  localPlaceMarketplacePath({
    displayName: "Livingston",
    county: { state: "TX" },
  }),
  "/marketplace?q=Livingston%2C%20TX&intent=sale",
);
assert.equal(publicLocalPlacePath("polk", "livingston"), "/tx/polk/livingston");

const shell = read("src/components/county/LocalPlaceIdentityShell.tsx");
const page = read("src/app/tx/[county]/[place]/page.tsx");
const dir = read("src/components/county/CountyLocalPlaceDirectory.tsx");
const countyPage = read("src/app/tx/[county]/page.tsx");
const countyShell = read("src/components/county/CountyIdentityShell.tsx");
assert.match(page, /LocalPlaceIdentityShell/);
assert.match(page, /index: false/);
assert.match(shell, /<h1/);
assert.match(shell, /Explore Properties/);
assert.match(shell, /localPlaceMarketplacePath/);
assert.match(shell, /publicCountyPath/);
assert.match(shell, /min-h-11/);
assert.match(shell, /focus-visible:outline-gold/);
assert.match(shell, /max-w-xl/);
assert.doesNotMatch(shell, /CountyIdentityShell|placeType|Coming Soon|FIPS|48373/i);
assert.doesNotMatch(shell, /<img|next\/image|Unsplash|population|school|weather/i);
assert.match(dir, /publicLocalPlacePath|resolvePublicLocalPlace/);
assert.match(dir, /min-h-11/);
assert.match(countyPage, /countySlug=\{identity\.slug\}/);
assert.match(countyShell, /Explore Properties/);
assert.doesNotMatch(countyShell, /LocalPlaceIdentityShell|Livingston/);

for (const rel of [
  "src/app/page.tsx",
  "src/components/GlobalNav.tsx",
  "src/lib/search/url.ts",
  "src/lib/search/interpret.ts",
  "src/lib/markets.ts",
  "src/app/marketplace/page.tsx",
]) {
  assert.doesNotMatch(
    read(rel),
    /LocalPlaceIdentityShell|localPlaceMarketplacePath/,
  );
}

console.log("p2f3b-place-identity: ok");
