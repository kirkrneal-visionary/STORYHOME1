/**
 * Phase 1 coherence armor — unfinished nav hidden, honesty, sound isolation.
 * Run: node scripts/test-phase-1-coherence.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const nav = read("src/components/GlobalNav.tsx");
assert.doesNotMatch(nav, /href=["']\/messages["']/);
assert.doesNotMatch(nav, /href=["']\/referrals["']/);
assert.doesNotMatch(nav, /href=["']\/following["']/);
assert.doesNotMatch(nav, />Following</);

const primaryNav = read("src/lib/navigation.ts");
assert.doesNotMatch(primaryNav, /\/messages|\/referrals|\/following/);

const listingCard = read("src/components/ListingCard.tsx");
assert.doesNotMatch(listingCard, /setFollowing/);
assert.doesNotMatch(listingCard, /Following|Follow/);

const following = read("src/app/following/page.tsx");
assert.match(following, /Not shipping yet|not available yet/i);
assert.doesNotMatch(following, /You&rsquo;re not following anyone yet/);

const profile = read("src/app/profile/page.tsx");
assert.doesNotMatch(profile, /messages|referrals/i);

const login = read("src/components/LoginClient.tsx");
assert.doesNotMatch(login, /Messages unlock/i);

const insights = read("src/lib/living-mark/insights.ts");
assert.doesNotMatch(insights, /in Messages/);

const seller = read("src/components/seller/SellerPortalView.tsx");
assert.match(seller, /not live marketplace traffic/i);
assert.doesNotMatch(seller, /Live Story Home activity for buyers/);

const prospects = read("src/components/broker/intelligence/ShiProspectsView.tsx");
assert.match(prospects, /loadFailed/);
assert.match(prospects, /Prospects could not load/);
assert.doesNotMatch(prospects, /migration 0025/);

const farms = read("src/components/broker/intelligence/ShiFarmsView.tsx");
assert.match(farms, /Farms could not load/);
assert.doesNotMatch(farms, /migration 0026/);

const vaultErrors = read("src/lib/shi/vault-errors.ts");
assert.doesNotMatch(vaultErrors, /0023_shi_market_frames|\.sql/);
assert.match(vaultErrors, /Study Vault is not set up/);

const nearby = read(
  "src/components/broker/intelligence/ShiArchieIntelligencePanel.tsx",
);
assert.doesNotMatch(nearby, /RPC soft-fail/);

const selector = read(
  "src/components/broker/intelligence/ShiResearchModeSelector.tsx",
);
assert.match(selector, /data-story-sound/);
assert.match(selector, /story-press/);

const map = read("src/components/broker/intelligence/ShiResearchMap.tsx");
assert.match(map, /data-map-mode="2d"/);
assert.match(map, /data-map-mode="3d"/);
assert.match(map, /data-story-sound="select"/);

const frames = read(
  "src/components/broker/intelligence/ShiMarketFramesPanel.tsx",
);
assert.match(frames, /play\("success"/);
assert.match(frames, /useStorySoundOptional/);

const research = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(research, /play\("success"/);

const inquire = read("src/components/marketplace/InquireButton.tsx");
assert.match(inquire, /play\("success"/);
assert.doesNotMatch(inquire, /data-story-sound="tap"/);

const provider = read("src/components/sound/SoundProvider.tsx");
assert.match(provider, /useStorySoundOptional/);
assert.match(provider, /enabled = !reducedMotion/);
assert.doesNotMatch(provider, /setEnabled/);
assert.match(provider, /playStorySound/);

const engine = read("src/lib/sound/engine.ts");
assert.match(engine, /try \{/);
assert.match(engine, /catch/);
assert.match(engine, /unlockStorySound/);

const workspace = read("src/components/broker/intelligence/ShiWorkspace.tsx");
assert.match(workspace, /researchVisited/);
assert.match(workspace, /Keep Research \(and its MapLibre map\) mounted/);

console.log("phase-1-coherence armor: ok");
