/**
 * P1B-2B2 Account Security — This Device + Delete Account.
 * Security Notices stay deferred (process-local stub).
 * Run: node --import ./scripts/story-ts-alias.mjs --experimental-strip-types scripts/test-p1b2b2-session-delete.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildSettingsHref,
  parseSettingsSearch,
  resolveSettingsLocation,
} from "../src/lib/account/settings-nav.ts";
import { settingsCapabilities } from "../src/lib/account/settings-capabilities.ts";
import { deleteWarning } from "../src/lib/account/delete-account.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const params = (q: string) => new URLSearchParams(q);
const consumer = settingsCapabilities({ purpose: "consumer", kind: "consumer" });

assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=security&control=device")),
    consumer,
  ).control,
  "device",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=security&control=delete")),
    consumer,
  ).control,
  "delete",
);
assert.equal(
  buildSettingsHref({ category: "security", control: "device", from: "/home" }),
  "/settings?category=security&control=device&from=%2Fhome",
);

assert.match(deleteWarning("consumer"), /County records stay/);
assert.match(deleteWarning("managing_broker"), /office login/);
assert.doesNotMatch(deleteWarning("individual_pro"), /office login/);

const view = read("src/components/settings/SettingsView.tsx");
assert.match(view, /title="This Device"/);
assert.match(view, /title="Delete Account"/);
assert.match(view, /tone="danger"/);
assert.doesNotMatch(view, /title="Security Notices"/);
assert.doesNotMatch(view, /Windows PC|iPhone|Chrome|Dallas/);

const row = read("src/components/settings/SettingsCategoryRow.tsx");
assert.match(row, /tone === "danger"/);

const security = read("src/components/settings/SecuritySection.tsx");
assert.match(security, /Sign out this device/);
assert.match(security, /Sign out everywhere/);
assert.match(security, /location.assign\("\/login"\)/);
assert.match(security, /confirmEverywhere/);
assert.match(security, /\/api\/account\/delete-account/);
assert.match(security, /tombstone_account_usernames|Type DELETE/);
assert.match(security, /NOTICES_UI = false/);
assert.doesNotMatch(security, /trusted devices|fingerprint|device list/i);

const del = read("src/app/api/account/delete-account/route.ts");
assert.match(del, /tombstone_account_usernames/);
assert.match(del, /requireStepUpIfEnrolled/);
assert.match(del, /signInWithPassword/);

const signOut = read("src/app/api/account/sign-out-all/route.ts");
assert.match(signOut, /stamp_forced_logout/);
assert.match(signOut, /scope: "global"/);

const notices = read("src/lib/account/notify-security.ts");
assert.match(notices, /process-local/);
assert.match(notices, /Live mail is not sent/);

console.log("p1b2b2-session-delete: ok");
