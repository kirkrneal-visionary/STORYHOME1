/**
 * Wave 3: database locks follow the account on file, not View as Consumer.
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
  }),
  false,
);

const mig = read("supabase/migrations/0053_story_pro_settings_lock.sql");
assert.match(mig, /specialties/);
assert.match(mig, /service_areas/);
assert.match(mig, /primary_market_city/);
assert.match(mig, /individual_pro/);
assert.match(mig, /managing_broker/);
assert.match(mig, /email_confirmed_at/);
assert.match(mig, /account_kind cannot be changed by the client/);
assert.match(mig, /account_purpose cannot be changed by the client/);
assert.match(mig, /is a preview only\. It is not stored and cannot change these locks/);
assert.match(mig, /Story Pro settings cannot be changed on this account/);
assert.doesNotMatch(mig, /delete from public\.(profiles|listings|county_parcels)/i);
assert.doesNotMatch(mig, /CLIENTSAGENTS/i);
assert.doesNotMatch(mig, /story-home-role/);

// 0088 is the live lock: same columns, confirmed email, no authenticator level.
const live = read("supabase/migrations/0088_password_only_sign_in.sql");
assert.match(live, /create or replace function public\.profiles_lock_privilege_columns\(\)/);
assert.match(live, /specialties/);
assert.match(live, /primary_market_city/);
assert.match(live, /email_confirmed_at/);
assert.match(live, /account_kind cannot be changed by the client/);
assert.match(live, /account_purpose cannot be changed by the client/);
assert.match(live, /Story Pro settings cannot be changed on this account/);
assert.match(live, /Confirm your email before Story Pro settings/);
assert.doesNotMatch(live, /auth\.jwt\(\) ->> 'aal'|v_aal/);
assert.doesNotMatch(live, /delete from public\.(profiles|listings|county_parcels)/i);

const route = read("src/app/api/account/story-pro-profile/route.ts");
assert.match(route, /holdsRealtorSettingsPurpose/);
assert.match(route, /STORY_PRO_SETTINGS_NOT_THIS_ACCOUNT/);
assert.match(route, /canEditStoryProSettings/);

const preview = read("src/lib/account/settings-preview.ts");
assert.match(preview, /does not change the account on file/);
assert.doesNotMatch(preview, /from\("profiles"\)/);

assert.equal(
  STORY_PRO_SETTINGS_BLOCKED,
  "Confirm your email before Story Pro settings.",
);
assert.equal(
  STORY_PRO_SETTINGS_NOT_THIS_ACCOUNT,
  "Story Pro settings cannot be changed on this account.",
);

console.log("settings-db-locks: ok");
