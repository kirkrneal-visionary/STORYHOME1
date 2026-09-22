/**
 * UI-3A — public Professional identity + Agent World visual foundation.
 * Run: node scripts/test-ui-3a-pro-identity.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const view = read("src/components/agents/AgentWorldView.tsx");
assert.match(view, /data-ui-3a="professional-identity"/);
assert.match(view, /data-story-agent-world/);
assert.match(view, /data-agent-world-polish="aw-1"/);
assert.match(view, /LivingMarkPresence/);
assert.match(view, /id="agent-world-name"/);
assert.match(view, /agent\.fullName/);
assert.match(view, /story-cta-primary/);
assert.match(view, /data-agent-world-cta="listings"/);
assert.match(view, /story-cta-secondary/);
assert.match(view, /data-agent-world-cta="inventory"/);
assert.match(view, /AgentWorldShareButton/);
assert.match(view, /data-agent-world-cta="find_agents"/);
assert.match(view, /StoryEmptyWell/);
assert.match(view, /data-agent-world-listings-empty/);
assert.match(view, /data-agent-world-ending/);
assert.match(view, /StoryWalkComposer/);
assert.match(view, /primaryMarketCity/);
assert.match(view, /<main/);
assert.doesNotMatch(view, /data-county|CountyIdentity|Places in/);
assert.doesNotMatch(view, /cover upload|focal point|cover placeholder/i);
assert.doesNotMatch(view, /Story circles|Story rail|Open House Stories/i);
assert.doesNotMatch(view, /primary_county|service_counties|effectiveCountyFips/);
assert.doesNotMatch(view, /temporarily_unavailable|operational_state/);
assert.doesNotMatch(view, /Top Agent|Verified Expert|Local Specialist/);
assert.doesNotMatch(view, /bg-\[var\(--accent\)\]/);
assert.doesNotMatch(view, /rounded-full bg-gold/);

const listingsAt = view.indexOf('data-agent-world-cta="listings"');
assert.match(view.slice(Math.max(0, listingsAt - 180), listingsAt + 40), /story-cta-primary/);

const findBlock = view.slice(view.indexOf("find_agents"));
assert.doesNotMatch(findBlock.slice(0, 280), /story-cta-primary/);

const presence = read("src/components/agents/LivingMarkPresence.tsx");
assert.match(presence, /data-living-mark-mode/);
assert.match(presence, /still|playing|frozen/);
assert.doesNotMatch(presence, /\bcontrols[={\s]/);

const page = read("src/app/agents/[id]/page.tsx");
assert.match(page, /AgentWorldView/);
assert.match(page, /photo_url, living_mark_video_url/);
assert.match(page, /if \(!supabase\)/);
assert.match(page, /demoAgentForId/);
assert.doesNotMatch(page, /ui-3a-review|isUi3aOwnerReviewAllowed/);
assert.doesNotMatch(page, /primary_county|service_counties|availability/);
assert.doesNotMatch(page, /cover_|story_circles/);

const usernamePage = read("src/app/u/[username]/page.tsx");
assert.match(usernamePage, /resolvePublicUsername/);
assert.doesNotMatch(usernamePage, /ui-3a-review|isUi3aOwnerReviewAllowed/);

const helper = read("src/lib/ui-3a-owner-review.ts");
assert.match(helper, /vercelEnv !== "production"/);
assert.match(helper, /\/internal\/ui-3a-review\/world/);
assert.match(helper, /Sarah Jenkins/);
assert.match(helper, /sarahpro/);
assert.doesNotMatch(helper, /from\("profiles"\)|insert\(|upsert\(/);

const reviewWorld = read("src/app/internal/ui-3a-review/world/page.tsx");
assert.match(reviewWorld, /isUi3aOwnerReviewAllowed/);
assert.match(reviewWorld, /AgentWorldView/);
assert.match(reviewWorld, /listings=\{\[\]\}/);
assert.match(reviewWorld, /index: false/);
assert.doesNotMatch(reviewWorld, /getServerSupabase|from\("profiles"\)/);

const reviewEntry = read("src/app/internal/ui-3a-review/entry/page.tsx");
assert.match(reviewEntry, /isUi3aOwnerReviewAllowed/);
assert.match(reviewEntry, /UsernamePublicStub/);
assert.match(reviewEntry, /index: false/);
assert.doesNotMatch(reviewEntry, /getServerSupabase|resolvePublicUsername/);

const stub = read("src/components/username/UsernamePublicStub.tsx");
assert.match(stub, /data-ui-3a="username-public"/);
assert.match(stub, /stub\.displayName/);
assert.match(stub, /@\{stub\.username\}/);
assert.match(stub, /View professional profile/);
assert.match(stub, /story-cta-primary/);
assert.match(stub, /agentWorldHref/);
assert.doesNotMatch(stub, /LivingMarkPresence|StoryWalkComposer|listings/);
assert.doesNotMatch(stub, /email|phone|Stories|followers/);
assert.doesNotMatch(stub, /Primary County|Service Counties/);

const profile = read("src/app/profile/page.tsx");
assert.doesNotMatch(profile, /data-ui-3a|story-cta-primary|LivingMarkPresence/);

const brokerage = read("src/components/brokerage/BrokeragePublicView.tsx");
assert.doesNotMatch(brokerage, /data-ui-3a|story-cta-primary/);

for (const rel of [
  "src/components/county/CountyIdentityShell.tsx",
  "src/components/county/LocalPlaceIdentityShell.tsx",
  "src/components/home/HomeSearchHero.tsx",
  "src/components/MarketplaceView.tsx",
  "src/components/settings/SettingsView.tsx",
  "src/components/GlobalNav.tsx",
]) {
  assert.doesNotMatch(read(rel), /data-ui-3a/);
}

const miss = read("src/components/story/PublicMiss.tsx");
assert.match(miss, /story-cta-primary/);
assert.match(miss, /Back to Story Home/);
const usernameMiss = read("src/app/u/[username]/not-found.tsx");
assert.match(usernameMiss, /PublicMiss/);
assert.match(usernameMiss, /This page isn’t available|This page isn't available/);

const pkg = read("package.json");
assert.match(pkg, /test:ui-3a-pro-identity/);
assert.doesNotMatch(pkg, /@radix-ui\/react-slot|class-variance-authority/);

console.log("ui-3a-pro-identity armor: ok");
