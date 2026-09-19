/**
 * P1B-2B1 Account Security — Email + Password + Authenticator.
 * Run: node --import ./scripts/story-ts-alias.mjs --experimental-strip-types scripts/test-p1b2b1-account-security.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mfaRequired } from "../src/lib/account/assurance.ts";
import {
  buildSettingsHref,
  parseSettingsSearch,
  resolveSettingsLocation,
} from "../src/lib/account/settings-nav.ts";
import { settingsCapabilities } from "../src/lib/account/settings-capabilities.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const params = (q: string) => new URLSearchParams(q);
const consumer = settingsCapabilities({ purpose: "consumer", kind: "consumer" });

assert.equal(mfaRequired("consumer", "consumer"), false);
assert.equal(mfaRequired("individual_pro", "agent"), true);
assert.equal(mfaRequired("managing_broker", "broker"), true);

const mfa = parseSettingsSearch(params("setup=mfa"));
assert.deepEqual(resolveSettingsLocation(mfa, consumer), {
  screen: "control",
  category: "security",
  control: "authenticator",
  setupMfa: true,
});
assert.equal(buildSettingsHref({ setup: "mfa" }), "/settings?setup=mfa");
assert.equal(
  buildSettingsHref({ category: "security", control: "email", from: "/home" }),
  "/settings?category=security&control=email&from=%2Fhome",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=security&control=password")),
    consumer,
  ).control,
  "password",
);

const view = read("src/components/settings/SettingsView.tsx");
assert.match(view, /SecuritySection/);
assert.match(view, /control: "email"/);
assert.match(view, /control: "password"/);
assert.match(view, /control: "authenticator"/);
assert.match(view, /title="Authenticator"/);
assert.match(view, /mfaRequired\(purpose, kind\)/);
assert.match(view, /settingsConsumerPreview/);
assert.doesNotMatch(view, /This Device|Sign out everywhere|Delete account/);

const security = read("src/components/settings/SecuritySection.tsx");
assert.match(security, /\/api\/account\/change-email/);
assert.match(security, /\/api\/account\/change-password/);
assert.match(security, /supabase\.auth\.mfa\.enroll/);
assert.match(security, /\/api\/account\/mfa\/unenroll/);
assert.match(security, /PasswordStrengthMeter/);
assert.match(security, /autoComplete="current-password"/);
assert.match(security, /autoComplete="new-password"/);
assert.match(security, /role="status"/);
assert.match(security, /SESSION_ACTIONS = false/);
assert.match(security, /Sign out everywhere/);
assert.match(security, /Delete account/);
assert.doesNotMatch(security, /factorType: "phone"|sms/i);

const emailApi = read("src/app/api/account/change-email/route.ts");
assert.match(emailApi, /requireStepUpIfEnrolled/);
assert.match(emailApi, /updateUser\(\{ email \}\)/);

const passwordApi = read("src/app/api/account/change-password/route.ts");
assert.match(passwordApi, /requireStepUpIfEnrolled/);
assert.match(passwordApi, /scope: "others"/);

console.log("p1b2b1-account-security: ok");
