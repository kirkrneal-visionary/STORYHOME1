/**
 * Wave 1: authenticator before Story Pro settings cards.
 * Settings and Sign out stay open. Run:
 * node --experimental-strip-types scripts/test-settings-pro-auth.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  STORY_PRO_SETTINGS_BLOCKED,
  canEditStoryProSettings,
} from "../src/lib/account/assurance.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(
  canEditStoryProSettings({
    emailConfirmed: true,
    purpose: "managing_broker",
    kind: "broker",
    enrolled: false,
    currentAal: "aal1",
  }),
  false,
);
assert.equal(
  canEditStoryProSettings({
    emailConfirmed: true,
    purpose: "individual_pro",
    kind: "agent",
    enrolled: true,
    currentAal: "aal1",
  }),
  false,
);
assert.equal(
  canEditStoryProSettings({
    emailConfirmed: true,
    purpose: "managing_broker",
    kind: "broker",
    enrolled: true,
    currentAal: "aal2",
  }),
  true,
);
assert.equal(
  canEditStoryProSettings({
    emailConfirmed: false,
    purpose: "managing_broker",
    kind: "broker",
    enrolled: true,
    currentAal: "aal2",
  }),
  false,
);

const view = read("src/components/settings/SettingsView.tsx");
assert.match(view, /STORY_PRO_SETTINGS_BLOCKED/);
assert.match(view, /showRealtorCards/);
assert.match(view, /securityReady/);
assert.match(view, /\/api\/account\/story-pro-profile/);
assert.match(view, /AccountSection/);
assert.match(view, /SecuritySection/);

const route = read("src/app/api/account/story-pro-profile/route.ts");
assert.match(route, /canEditStoryProSettings/);
assert.match(route, /STORY_PRO_SETTINGS_BLOCKED/);
assert.match(route, /status: 403/);
assert.doesNotMatch(route, /CLIENTSAGENTS/i);

const security = read("src/components/settings/SecuritySection.tsx");
assert.match(security, /onClick=\{logout\}/);

assert.match(STORY_PRO_SETTINGS_BLOCKED, /authenticator/);
assert.match(STORY_PRO_SETTINGS_BLOCKED, /Story Pro settings/);

console.log("settings-pro-auth: ok");
