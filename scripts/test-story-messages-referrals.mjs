/**
 * Armor: Messages/Referrals hide theater — no fake unread defaults.
 * Run: node scripts/test-story-messages-referrals.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const appContext = read("src/components/AppContext.tsx");
assert.doesNotMatch(appContext, /unreadMessages/);
assert.doesNotMatch(appContext, /openReferralCount/);
assert.doesNotMatch(appContext, /useState\(true\)/);

const nav = read("src/components/GlobalNav.tsx");
assert.doesNotMatch(nav, /href=\"\/messages\"/);
assert.doesNotMatch(nav, /href=\"\/referrals\"/);
assert.doesNotMatch(nav, /unreadMessages|openReferralCount/);

const messages = read("src/components/MessagesView.tsx");
assert.match(messages, /Not shipping yet|not show a live/i);
assert.doesNotMatch(messages, /Select a conversation/);

const referrals = read("src/components/ProfessionalView.tsx");
assert.match(referrals, /Not shipping yet|not live yet/i);
assert.doesNotMatch(referrals, /Post a referral/);
assert.doesNotMatch(referrals, /Open Network Leads|BoardColumn|FILTERS/);

const primaryNav = read("src/lib/navigation.ts");
assert.doesNotMatch(primaryNav, /\/messages|\/referrals/);

console.log("story-messages-referrals armor: ok");
