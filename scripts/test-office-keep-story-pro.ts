/**
 * Office login keeps Story Pro, Archie, and buyer view.
 * Run: node --experimental-strip-types scripts/test-office-keep-story-pro.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canOpenOfficeAccount,
  destForUser,
  mayManageBrokerage,
  mayUseStoryPro,
  navRoleForAccount,
  purposeAfterTrecPromote,
} from "../src/lib/account/purpose.ts";
import { portalPageAccess } from "../src/lib/account/portal-gate.ts";
import { officePageAccess } from "../src/lib/account/office-gate.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(mayUseStoryPro("managing_broker", "broker"), true);
assert.equal(mayUseStoryPro("individual_pro", "agent"), true);
assert.equal(mayUseStoryPro("other_professional", "pro"), false);
assert.equal(mayUseStoryPro("consumer", "consumer"), false);
assert.equal(mayManageBrokerage("managing_broker"), true);
assert.equal(mayManageBrokerage("individual_pro"), false);
assert.equal(canOpenOfficeAccount("managing_broker", "broker"), false);
assert.equal(purposeAfterTrecPromote("managing_broker"), null);
assert.equal(navRoleForAccount("managing_broker", "broker"), "professional");
assert.equal(destForUser({ kind: "broker", purpose: "managing_broker" }), "/office");

assert.equal(
  portalPageAccess({
    ok: true,
    accountKind: "broker",
    accountPurpose: "managing_broker",
    promoted: false,
    demoted: false,
  }),
  "allow",
);
assert.equal(
  officePageAccess({ signedIn: true, purpose: "managing_broker" }),
  "allow",
);
assert.equal(
  officePageAccess({ signedIn: true, purpose: "individual_pro" }),
  "refuse",
);

const mig = read("supabase/migrations/0051_office_keeps_story_pro.sql");
assert.match(mig, /account_purpose in \('individual_pro', 'managing_broker'\)/);
assert.match(mig, /is_individual_pro/);
assert.match(mig, /Story Pro and Archie stay on this same login/);
assert.doesNotMatch(mig, /delete from public\.(profiles|listings|county_parcels)/i);
assert.doesNotMatch(mig, /CLIENTSAGENTS/i);

const portalLayout = read("src/app/portal/layout.tsx");
assert.match(portalLayout, /getServerSupabase/);
assert.match(portalLayout, /Office login keeps Story Pro/);

const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /href: "\/office"/);
assert.match(nav, /href: "\/portal"/);
assert.match(nav, /View as buyer/);
assert.doesNotMatch(nav, /else if \(isPro && isLoggedIn\)/);

const profile = read("src/app/profile/page.tsx");
assert.match(profile, /Story Pro, Archie, and buyer view stay on this same login/);
assert.match(profile, /href="\/office"/);
assert.match(profile, /href="\/portal"/);

const purpose = read("src/lib/account/purpose.ts");
assert.match(purpose, /purpose === "managing_broker"/);
assert.match(purpose, /mayUseStoryPro/);

const card = read("src/components/settings/PurposeCard.tsx");
assert.match(card, /Story Pro, Archie, and buyer view stay here too/);
assert.doesNotMatch(card, /Story Pro will move off this login/);

const open = read("src/components/settings/OpenOfficeCard.tsx");
assert.match(open, /You keep Story Pro on the same account/);
assert.doesNotMatch(open, /not a bigger Story Pro/);

console.log("office-keep-story-pro: ok");
