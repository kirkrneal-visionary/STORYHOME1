/**
 * UI-3B — public Brokerage Organization World.
 * Run: node scripts/test-ui-3b-org-world.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const view = read("src/components/brokerage/BrokeragePublicView.tsx");
assert.match(view, /data-ui-3b="organization-world"/);
assert.match(view, /data-story-brokerage-world/);
assert.match(view, /data-brokerage-cover-fallback/);
assert.match(view, /id="brokerage-world-name"/);
assert.match(view, /brokerage\.name/);
assert.match(view, /story-cta-primary/);
assert.match(view, /data-brokerage-world-cta="marketplace"/);
assert.match(view, /story-cta-secondary/);
assert.match(view, /PublicMiss/);
assert.match(view, /This page isn’t available|This page isn't available/);
assert.match(view, /StoryEmptyWell/);
assert.match(view, /data-brokerage-world-professionals-empty/);
assert.match(view, /data-brokerage-world-ending/);
assert.match(view, /href=\{\`\/agents\/\$\{agent\.id\}`\}/);
assert.match(view, /getBrokerageBySlug/);
assert.match(view, /listBrokerageAgents/);
assert.doesNotMatch(view, /LivingMarkPresence|living_mark/);
assert.doesNotMatch(view, /StoryWalkComposer|Story circles|Story rail/i);
assert.doesNotMatch(view, /cover upload|focal point|cover placeholder/i);
assert.doesNotMatch(view, /Verified Brokerage|Top Office|Local Leader|Featured Brokerage/);
assert.doesNotMatch(view, /own_brokerage_relationship_history|Brokerage history/);
assert.doesNotMatch(view, /primary_county|service_counties|effectiveCountyFips/);
assert.doesNotMatch(view, /teamLeaderAuthorized/);
assert.doesNotMatch(view, /data-ui-3a|data-county|CountyIdentity/);
assert.doesNotMatch(view, /bg-\[var\(--accent\)\]/);
assert.doesNotMatch(view, /create_managed_brokerage|accept_brokerage_invite/);

const marketplaceAt = view.indexOf('data-brokerage-world-cta="marketplace"');
assert.match(
  view.slice(Math.max(0, marketplaceAt - 180), marketplaceAt + 40),
  /story-cta-primary/,
);
const websiteBlock = view.slice(view.indexOf('data-brokerage-world-cta="website"'));
assert.doesNotMatch(websiteBlock.slice(0, 280), /story-cta-primary/);
const phoneBlock = view.slice(view.indexOf('data-brokerage-world-cta="phone"'));
assert.doesNotMatch(phoneBlock.slice(0, 220), /story-cta-primary/);

const page = read("src/app/b/[slug]/page.tsx");
assert.match(page, /BrokeragePublicView/);
assert.doesNotMatch(page, /ui-3b-review|isUi3bOwnerReviewAllowed/);
assert.doesNotMatch(page, /own_brokerage_relationship_history/);

const helper = read("src/lib/ui-3b-owner-review.ts");
assert.match(helper, /\/internal\/ui-3b-review\/org/);
assert.match(helper, /Story Home Realty/);
assert.match(helper, /Sarah Jenkins/);
assert.match(helper, /isUi3aOwnerReviewAllowed|isUi3bOwnerReviewAllowed/);
assert.doesNotMatch(helper, /from\("brokerages"\)|insert\(|upsert\(/);
assert.doesNotMatch(helper, /create_managed_brokerage/);

const reviewOrg = read("src/app/internal/ui-3b-review/org/page.tsx");
assert.match(reviewOrg, /isUi3bOwnerReviewAllowed/);
assert.match(reviewOrg, /isUi3bOwnerReviewHost/);
assert.match(reviewOrg, /BrokeragePublicView/);
assert.match(reviewOrg, /index: false/);
assert.doesNotMatch(reviewOrg, /getServerSupabase|from\("brokerages"\)/);

const world = read("src/components/agents/AgentWorldView.tsx");
assert.match(world, /data-ui-3a="professional-identity"/);
assert.doesNotMatch(world, /data-ui-3b|\/b\/|BrokeragePublicView/);

const stub = read("src/components/username/UsernamePublicStub.tsx");
assert.match(stub, /data-ui-3a="username-public"/);
assert.doesNotMatch(stub, /data-ui-3b|BrokeragePublicView|\/b\//);

const profile = read("src/app/profile/page.tsx");
assert.doesNotMatch(profile, /data-ui-3b|BrokeragePublicView/);

const office = read("src/components/office/OfficeWorkspace.tsx");
assert.doesNotMatch(office, /data-ui-3b|story-cta-primary/);

for (const rel of [
  "src/components/county/CountyIdentityShell.tsx",
  "src/components/county/LocalPlaceIdentityShell.tsx",
  "src/components/home/HomeSearchHero.tsx",
  "src/components/MarketplaceView.tsx",
  "src/components/settings/SettingsView.tsx",
  "src/components/GlobalNav.tsx",
]) {
  assert.doesNotMatch(read(rel), /data-ui-3b/);
}

const miss = read("src/components/story/PublicMiss.tsx");
assert.match(miss, /data-story-public-miss/);
assert.match(miss, /Back to Story Home/);

const pkg = read("package.json");
assert.match(pkg, /test:ui-3b-org-world/);
assert.doesNotMatch(pkg, /@radix-ui\/react-slot|class-variance-authority/);

console.log("ui-3b-org-world armor: ok");
