/**
 * UI-5 — Marketplace visual integration.
 * Run: node scripts/test-ui-5-marketplace-visual.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const view = read("src/components/MarketplaceView.tsx");
assert.match(view, /data-ui-5="marketplace-visual"/);
assert.match(view, /story-market-canvas/);
assert.match(view, /StoryEmptyWell/);
assert.match(view, /No listings yet/);
assert.match(view, /No homes in this map area/);
assert.match(view, /fetchMarketplaceListings/);
assert.match(view, /filtersFromSearchParams/);
assert.match(view, /hasMarketplaceHandoffParams/);
assert.match(view, /authorizeSearchInput|planToMarketplaceParams|filtersFromSearchParams/);
assert.doesNotMatch(view, /story-cta-primary|story-cta-secondary/);
assert.doesNotMatch(view, /Stories coming|story circle|Cover System|data-ui-4a/i);
assert.doesNotMatch(view, /CountyIdentityShell|LocalPlaceIdentityShell|HomeSearchHero/);
assert.doesNotMatch(view, /ui5OwnerReviewListings|DEMO_LISTINGS/);
assert.doesNotMatch(view, /local_place_id|parcel backfill|checkpoint c/i);

const toolbar = read("src/components/marketplace/SearchToolbar.tsx");
assert.match(toolbar, /story-market-toolbar/);
assert.match(toolbar, /data-market-query/);
assert.match(toolbar, /filters\.query\.trim\(\)/);
assert.match(toolbar, /East Texas map search/);
assert.match(toolbar, /min-h-11/);
assert.match(toolbar, /bg-\[var\(--paper\)\] text-navy/);
assert.doesNotMatch(toolbar, /story-glass|story-cta-primary/);
assert.doesNotMatch(toolbar, /intent|SearchState|authorizeSearchInput/);

const card = read("src/components/ListingCard.tsx");
assert.match(card, /story-market-card/);
assert.match(card, /story-market-card-selected/);
assert.match(card, /story-surface/);
assert.match(card, /story-glass/);
assert.match(card, /\/marketplace\/\$\{listing\.id\}/);
assert.doesNotMatch(card, /data-ui-5|Cover System|Stories coming/i);

const css = read("src/app/globals.css");
assert.match(css, /--market-canvas:\s*var\(--env-0\)/);
assert.match(css, /\.story-market-canvas/);
assert.match(css, /\.story-market-query/);
assert.match(css, /data-ui-5="marketplace-visual"/);
assert.match(css, /never a solid black header band/);

const page = read("src/app/marketplace/page.tsx");
assert.match(page, /MarketplaceView/);
assert.doesNotMatch(page, /data-ui-5|ui5OwnerReview/);

const hero = read("src/components/home/HomeSearchHero.tsx");
assert.match(hero, /data-ui-4a="county-discovery"/);
assert.doesNotMatch(hero, /data-ui-5/);

for (const rel of [
  "src/components/county/CountyIdentityShell.tsx",
  "src/components/county/LocalPlaceIdentityShell.tsx",
  "src/components/agents/AgentWorldView.tsx",
  "src/components/brokerage/BrokeragePublicView.tsx",
  "src/components/settings/SettingsView.tsx",
  "src/components/GlobalNav.tsx",
  "src/lib/search/interpret.ts",
  "src/lib/search/url.ts",
]) {
  assert.doesNotMatch(read(rel), /data-ui-5/);
}

const county = read("src/components/county/CountyIdentityShell.tsx");
assert.match(county, /Explore Properties/);
assert.match(county, /countyMarketplacePath/);
const place = read("src/components/county/LocalPlaceIdentityShell.tsx");
assert.match(place, /Explore Properties/);

const demo = read("src/lib/demo-data.ts");
assert.match(demo, /DEMO_LISTINGS:\s*DemoListing\[\]\s*=\s*\[\]/);

const review = read("src/lib/ui-5-owner-review.ts");
assert.match(review, /UI5_OWNER_REVIEW_CARDS_PATH/);
assert.match(review, /isUi5OwnerReviewHost/);
assert.match(review, /ui5OwnerReviewListings/);
assert.doesNotMatch(review, /fetchMarketplaceListings/);

const reviewPage = read("src/app/internal/ui-5-review/cards/page.tsx");
assert.match(reviewPage, /isUi5OwnerReviewAllowed/);
assert.match(reviewPage, /isUi5OwnerReviewHost/);
assert.match(reviewPage, /data-ui-5-owner-review="cards"/);
assert.match(reviewPage, /ListingCard/);
assert.match(reviewPage, /dense/);
assert.doesNotMatch(reviewPage, /fetchMarketplaceListings/);

const tsconfig = read("tsconfig.json");
assert.match(tsconfig, /scripts\/test-ui-5-owner-review-gate\.ts/);

const pkg = read("package.json");
assert.match(pkg, /test:ui-5-marketplace-visual/);
assert.doesNotMatch(pkg, /@radix-ui\/react-slot|class-variance-authority/);

console.log("ui-5-marketplace-visual armor: ok");
