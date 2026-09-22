/**
 * UI-1 — public miss / empty presentation locks.
 * Run: node scripts/test-ui-1-public-miss.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const miss = read("src/components/story/PublicMiss.tsx");
assert.match(miss, /data-story-public-miss/);
assert.match(miss, /type-page-title/);
assert.match(miss, /Back to Story Home/);
assert.match(miss, /href="\/"/);
assert.match(miss, /story-cta-primary/);
assert.match(miss, /story-press/);
assert.doesNotMatch(miss, /Coming Soon|inactive|activation|FIPS|UUID|404 error/i);
assert.doesNotMatch(miss, /CountyIdentityShell|data-county|framer-motion|next\/image/);

const empty = read("src/components/story/StoryEmptyWell.tsx");
assert.match(empty, /data-story-empty/);
assert.match(empty, /Not a 404/);
assert.doesNotMatch(empty, /Coming Soon|not found/i);

for (const rel of [
  "src/app/not-found.tsx",
  "src/app/tx/[county]/not-found.tsx",
  "src/app/u/[username]/not-found.tsx",
]) {
  assert.equal(existsSync(join(root, rel)), true, rel);
  const src = read(rel);
  assert.match(src, /PublicMiss/);
  assert.match(src, /This page isn’t available|This page isn't available/);
  assert.doesNotMatch(src, /coming soon|inactive|montgomery|activation/i);
}

const market = read("src/components/MarketplaceView.tsx");
assert.match(market, /StoryEmptyWell/);
assert.match(market, /No listings yet/);
assert.match(market, /No homes in this map area/);
assert.doesNotMatch(market, /Coming Soon/i);

const hero = read("src/components/home/HomeSearchHero.tsx");
assert.doesNotMatch(hero, /PublicMiss|StoryEmptyWell|data-story-public-miss/);

const county = read("src/components/county/CountyIdentityShell.tsx");
assert.doesNotMatch(county, /PublicMiss|StoryEmptyWell/);
const place = read("src/components/county/LocalPlaceIdentityShell.tsx");
assert.doesNotMatch(place, /PublicMiss|StoryEmptyWell/);

const settings = read("src/components/settings/SettingsView.tsx");
assert.doesNotMatch(settings, /PublicMiss|StoryEmptyWell/);

const aw = read("src/components/agents/AgentWorldView.tsx");
assert.doesNotMatch(aw, /PublicMiss|StoryEmptyWell/);
assert.match(aw, /data-agent-world-listings-empty/);

const mw = read("src/middleware.ts");
assert.match(mw, /publicMissResponse/);
assert.match(mw, /status: 404/);
assert.match(mw, /internal\/story-public-miss/);
assert.doesNotMatch(mw, /Coming Soon|inactive county/i);

const trigger = read("src/app/internal/story-public-miss/page.tsx");
assert.match(trigger, /PublicMiss/);
assert.match(trigger, /This page isn’t available|This page isn't available/);
assert.doesNotMatch(trigger, /Coming Soon|inactive|activation/i);

const pkg = read("package.json");
assert.match(pkg, /test:ui-1-public-miss/);

console.log("ui-1-public-miss armor: ok");
