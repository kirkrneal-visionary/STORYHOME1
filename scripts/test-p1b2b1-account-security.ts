/**
 * P1B-2B1 Account Security — Email + Password. No authenticator.
 * Run: node --import ./scripts/story-ts-alias.mjs --experimental-strip-types scripts/test-p1b2b1-account-security.ts
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

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const params = (q: string) => new URLSearchParams(q);
const consumer = settingsCapabilities({ purpose: "consumer", kind: "consumer" });
const realtor = settingsCapabilities({ purpose: "individual_pro", kind: "agent" });

for (const caps of [consumer, realtor]) {
  assert.equal(
    resolveSettingsLocation(parseSettingsSearch(params("setup=mfa")), caps).screen,
    "root",
  );
  assert.equal(
    resolveSettingsLocation(
      parseSettingsSearch(params("category=security&control=authenticator")),
      caps,
    ).control,
    null,
  );
}
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
assert.doesNotMatch(view, /authenticator|mfaRequired/i);
assert.match(view, /settingsConsumerPreview/);
assert.doesNotMatch(view, /Sign out everywhere|Security Notices/);

const security = read("src/components/settings/SecuritySection.tsx");
assert.match(security, /\/api\/account\/change-email/);
assert.match(security, /\/api\/account\/change-password/);
assert.doesNotMatch(security, /auth\.mfa|mfa\/unenroll|authenticator/i);
assert.match(security, /<PasswordRule/);
assert.match(security, /autoComplete="current-password"/);
assert.match(security, /autoComplete="new-password"/);
assert.match(security, /role="status"/);
assert.match(security, /NOTICES_UI = false/);
assert.match(security, /Sign out everywhere/);
assert.match(security, /Delete account/);
assert.doesNotMatch(security, /factorType: "phone"|sms/i);

const emailApi = read("src/app/api/account/change-email/route.ts");
assert.match(emailApi, /checkCurrentPassword/);
assert.doesNotMatch(emailApi, /requireStepUpIfEnrolled/);
assert.match(emailApi, /updateUser\(\{ email \}\)/);

const passwordApi = read("src/app/api/account/change-password/route.ts");
assert.match(passwordApi, /checkCurrentPassword/);
assert.doesNotMatch(passwordApi, /requireStepUpIfEnrolled/);
assert.match(passwordApi, /scope: "others"/);

console.log("p1b2b1-account-security: ok");
