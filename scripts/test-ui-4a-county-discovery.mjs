/**
 * UI-4A — Homepage County discovery + below-fold composition.
 * Run: node scripts/test-ui-4a-county-discovery.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SERVICE_COUNTIES, REGION_CITIES } from "../src/lib/markets.ts";
import {
  countySlugFromName,
  publicCountyPath,
  resolvePublicCounty,
} from "../src/lib/geo/county-route.ts";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const expected = {
  "Polk County": "/tx/polk",
  "Trinity County": "/tx/trinity",
  "Angelina County": "/tx/angelina",
  "Tyler County": "/tx/tyler",
  "San Jacinto County": "/tx/san-jacinto",
  "Liberty County": "/tx/liberty",
  "Walker County": "/tx/walker",
};

assert.equal(SERVICE_COUNTIES.length, 7);
for (const county of SERVICE_COUNTIES) {
  const slug = countySlugFromName(county.name);
  assert.ok(slug, county.name);
  assert.equal(publicCountyPath(slug), expected[county.name], county.name);
  assert.ok(resolvePublicCounty(slug), `active ${slug}`);
}
assert.equal(resolvePublicCounty("cleveland"), null);
assert.equal(REGION_CITIES.includes("Cleveland"), true);

const hero = read("src/components/home/HomeSearchHero.tsx");
assert.match(hero, /storyhome-meadow-hero/);
assert.match(hero, /HomeSearchHub/);
assert.match(hero, /data-home-hero/);
assert.match(hero, /story-home-wave-a-search/);
assert.match(hero, /authorizeSearchInput/);
assert.match(hero, /submitRent/);
assert.match(hero, /data-launch-counties/);
assert.match(hero, /data-ui-4a="county-discovery"/);
assert.match(hero, /data-home-county-card/);
assert.match(hero, /data-home-story-attachment/);
assert.match(hero, /data-home-hero-join/);
assert.match(hero, /publicCountyPath/);
assert.match(hero, /countySlugFromName/);
assert.match(hero, /searchArea\(area\)/);
assert.match(hero, /REGION_CITIES\.slice\(0, 6\)/);
assert.match(hero, /See marketplace/);
assert.match(hero, /View all homes/);
assert.match(hero, /Live listings from local agents, when they exist/);
assert.match(hero, /No homes listed yet/);
assert.doesNotMatch(hero, /searchArea\(county\.hubCity\)/);
assert.doesNotMatch(hero, /\/tx\/polk/);
assert.doesNotMatch(hero, /\/tx\/[a-z-]+\/cleveland|Stories coming|story circle|Story rail/i);
assert.doesNotMatch(hero, /PublicMiss|StoryEmptyWell|data-story-public-miss/);
assert.doesNotMatch(hero, /story-cta-primary|story-cta-secondary/);
assert.doesNotMatch(hero, /cover upload|CountyIdentityShell|countyMarketplacePath/);
assert.doesNotMatch(hero, /data-ui-3a|data-ui-3b|LivingMarkPresence/);
assert.doesNotMatch(hero, /Pause examples|HomeAdvancedSearch|HomeFilterWing/);

const css = read("src/app/globals.css");
assert.match(css, /\.story-home-hero-join/);
assert.match(css, /storyhome-meadow-hero|\.story-home-hero\s*\{/);
assert.doesNotMatch(css, /story-cta-primary[^{]*\{[^}]*--accent/);

const page = read("src/app/page.tsx");
assert.match(page, /HomeSearchHero/);
assert.doesNotMatch(page, /CountyIdentityShell|\/tx\/polk/);

const county = read("src/components/county/CountyIdentityShell.tsx");
assert.doesNotMatch(county, /data-ui-4a|data-home-county-card/);
const place = read("src/components/county/LocalPlaceIdentityShell.tsx");
assert.doesNotMatch(place, /data-ui-4a/);
const market = read("src/components/MarketplaceView.tsx");
assert.doesNotMatch(market, /data-ui-4a|data-home-county-card/);
const world = read("src/components/agents/AgentWorldView.tsx");
assert.match(world, /data-ui-3a="professional-identity"/);
assert.doesNotMatch(world, /data-ui-4a/);
const brokerage = read("src/components/brokerage/BrokeragePublicView.tsx");
assert.match(brokerage, /data-ui-3b="organization-world"/);
assert.doesNotMatch(brokerage, /data-ui-4a/);

for (const rel of [
  "src/components/settings/SettingsView.tsx",
  "src/components/GlobalNav.tsx",
  "src/lib/search/interpret.ts",
]) {
  assert.doesNotMatch(read(rel), /data-ui-4a/);
}

const pkg = read("package.json");
assert.match(pkg, /test:ui-4a-county-discovery/);
assert.doesNotMatch(pkg, /@radix-ui\/react-slot|class-variance-authority/);

console.log("ui-4a-county-discovery armor: ok");
