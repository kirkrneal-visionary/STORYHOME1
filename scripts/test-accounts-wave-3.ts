/**
 * Wave 3 account screens and office UX.
 * Run: node --experimental-strip-types scripts/test-accounts-wave-3.ts
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
  purposeLabel,
} from "../src/lib/account/purpose.ts";
import { officePageAccess, officeRefuseCopy } from "../src/lib/account/office-gate.ts";
import { classifyApiPath } from "../src/lib/security/rate-limit.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(mayUseStoryPro("managing_broker", "broker"), true);
assert.equal(mayManageBrokerage("managing_broker"), true);
assert.equal(canOpenOfficeAccount("individual_pro", "broker"), true);
assert.equal(canOpenOfficeAccount("individual_pro", "agent"), false);
assert.equal(canOpenOfficeAccount("managing_broker", "broker"), false);
assert.equal(canOpenOfficeAccount("consumer", "broker"), false);
assert.equal(navRoleForAccount("managing_broker", "broker"), "professional");
assert.equal(navRoleForAccount("individual_pro", "agent"), "professional");
assert.equal(navRoleForAccount("other_professional", "pro"), "consumer");
assert.equal(purposeLabel("managing_broker"), "Office account");
assert.equal(purposeLabel("consumer"), "Consumer");
assert.equal(purposeLabel(undefined), "Consumer");
assert.equal(destForUser({ kind: "broker", purpose: "managing_broker" }), "/office");

assert.equal(
  officePageAccess({ signedIn: false, purpose: "managing_broker" }),
  "login",
);
assert.equal(
  officePageAccess({ signedIn: true, purpose: "individual_pro" }),
  "refuse",
);
assert.equal(
  officePageAccess({ signedIn: true, purpose: "managing_broker" }),
  "allow",
);
assert.equal(officeRefuseCopy("individual_pro").href, "/settings");
assert.match(officeRefuseCopy("individual_pro").body, /Office tools live on a separate/);

assert.equal(classifyApiPath("/api/account/open-office"), "medium");

const mig = read("supabase/migrations/0049_open_office_account.sql");
assert.match(mig, /open_office_account/);
assert.match(mig, /account_purpose = 'managing_broker'/);
assert.match(mig, /verified_purpose = 'managing_broker'/);
assert.match(mig, /Only a Story Pro broker login/);
assert.doesNotMatch(mig, /delete from public\.(profiles|listings|county_parcels)/i);
assert.doesNotMatch(mig, /CLIENTSAGENTS/i);

const promote = read("src/lib/account/promote-pro.ts");
assert.doesNotMatch(promote, /account_purpose: \"managing_broker\"/);

const settings = read("src/components/settings/SettingsView.tsx");
assert.match(settings, /PurposeCard/);
assert.match(settings, /OpenOfficeCard/);
assert.match(settings, /LivingMarkLibraryCard/);
assert.match(settings, /Display name/);
const profileControl = read("src/components/settings/ProfileControl.tsx");
assert.match(profileControl, /Display name/);
assert.match(profileControl, /Legal name on file/);
assert.doesNotMatch(settings, /label="Photo URL"/);
assert.doesNotMatch(settings, /Story Glass sound/);

const office = read("src/components/office/OfficeHome.tsx");
assert.match(office, /mayManageBrokerage/);
assert.match(office, /Story Pro, Archie, and Consumer/);
assert.doesNotMatch(office, /CLIENTSAGENTS/i);

const roster = read("src/components/office/RosterManager.tsx");
assert.match(roster, /does not copy people/);
assert.match(roster, /setTeamLeaderAuthorized/);

const login = read("src/components/LoginClient.tsx");
assert.match(login, /demoSession/);
assert.match(login, /!demoSession &&/);

const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /href: \"\/office\"/);
assert.match(nav, /isOfficeAccount/);

const profile = read("src/app/profile/page.tsx");
assert.match(profile, /office account/);
assert.match(profile, /href=\"\/office\"/);

const auth = read("src/components/AuthContext.tsx");
assert.match(auth, /navRoleForAccount/);

const demo = read("src/lib/auth.ts");
assert.match(demo, /purpose: \"managing_broker\"/);
assert.match(demo, /purpose: \"other_professional\"/);

const layout = read("src/app/office/layout.tsx");
assert.match(layout, /officePageAccess/);
assert.match(layout, /getAccountReadiness/);
assert.doesNotMatch(layout, /from \"@\/components\/broker\/BrokerPortal\"/);

const mw = read("src/middleware.ts");
assert.match(mw, /pathname.startsWith\(\"\/office\"\)/);

assert.doesNotMatch(read("src/app/api/account/open-office/route.ts"), /CLIENTSAGENTS/i);

console.log("accounts-wave-3: ok");
