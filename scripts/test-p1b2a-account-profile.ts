/**
 * P1B-2A Account Profile + Username placement.
 * Run: node --import ./scripts/story-ts-alias.mjs --experimental-strip-types scripts/test-p1b2a-account-profile.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const profile = read("src/components/settings/ProfileControl.tsx");
assert.match(profile, /updateMyProfile/);
assert.match(profile, /Display name/);
assert.doesNotMatch(profile, /Legal name on file/);
assert.match(profile, /type="tel"/);
assert.match(profile, /inputMode="url"/);
assert.match(profile, /Couldn't save your profile/);
assert.match(profile, /role="status"/);
assert.match(profile, /aria-live="polite"/);
assert.doesNotMatch(profile, /socials/);
assert.doesNotMatch(profile, /LivingMark|living_mark|photoUrl/);
assert.doesNotMatch(profile, /\/api\/account\//);
assert.doesNotMatch(profile, /legal_full_name/);

const view = read("src/components/settings/SettingsView.tsx");
assert.match(view, /AccountSection/);
assert.match(view, /ProfileControl/);
assert.match(view, /UsernameSummary/);
assert.match(view, /control=username/);
assert.match(view, /control: "profile"/);
assert.match(view, /UsernameField/);
assert.match(view, /← Back/);
assert.match(view, /Sign-in and account protection/);
assert.match(view, /caps\.livingMark && !consumerPreview/);
assert.match(view, /SettingsCard/);
assert.doesNotMatch(view, /from\("profiles"\)\.update/);
assert.doesNotMatch(view, /label="Photo URL"/);

const field = read("src/components/settings/UsernameField.tsx");
assert.match(field, /liveUsernameClient/);
assert.match(field, /Save username/);
assert.doesNotMatch(field, /claim_username|service_role|username_registry/);

console.log("p1b2a-account-profile: ok");
