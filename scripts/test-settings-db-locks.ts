/**
 * Wave 3: database locks follow the account on file, not View as buyer.
 * Run: node --experimental-strip-types scripts/test-settings-db-locks.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  STORY_PRO_SETTINGS_BLOCKED,
  STORY_PRO_SETTINGS_NOT_THIS_ACCOUNT,
  canEditStoryProSettings,
  holdsRealtorSettingsPurpose,
} from "../src/lib/account/assurance.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(holdsRealtorSettingsPurpose("consumer"), false);
assert.equal(holdsRealtorSettingsPurpose("managing_broker"), true);
assert.equal(holdsRealtorSettingsPurpose("individual_pro"), true);
assert.equal(holdsRealtorSettingsPurpose("other_professional"), true);
assert.equal(
  canEditStoryProSettings({
    emailConfirmed: true,
    purpose: "consumer",
    kind: "consumer",
    enrolled: true,
    currentAal: "aal2",
  }),
  false,
);

const mig = read("supabase/migrations/0053_story_pro_settings_lock.sql");
assert.match(mig, /specialties/);
assert.match(mig, /service_areas/);
assert.match(mig, /primary_market_city/);
assert.match(mig, /individual_pro/);
assert.match(mig, /managing_broker/);
assert.match(mig, /auth\.jwt\(\) ->> 'aal'/);
assert.match(mig, /email_confirmed_at/);
assert.match(mig, /View as buyer/);
assert.match(mig, /Story Pro settings cannot be changed on this account/);
assert.match(mig, /Confirm your email and authenticator before Story Pro settings/);
assert.doesNotMatch(mig, /delete from public\.(profiles|listings|county_parcels)/i);
assert.doesNotMatch(mig, /CLIENTSAGENTS/i);
assert.doesNotMatch(mig, /story-home-role/);

const route = read("src/app/api/account/story-pro-profile/route.ts");
assert.match(route, /holdsRealtorSettingsPurpose/);
assert.match(route, /STORY_PRO_SETTINGS_NOT_THIS_ACCOUNT/);
assert.match(route, /canEditStoryProSettings/);

const preview = read("src/lib/account/settings-preview.ts");
assert.match(preview, /does not change the account on file/);
assert.doesNotMatch(preview, /from\("profiles"\)/);

assert.equal(
  STORY_PRO_SETTINGS_BLOCKED,
  "Confirm your email and authenticator before Story Pro settings.",
);
assert.equal(
  STORY_PRO_SETTINGS_NOT_THIS_ACCOUNT,
  "Story Pro settings cannot be changed on this account.",
);

console.log("settings-db-locks: ok");
