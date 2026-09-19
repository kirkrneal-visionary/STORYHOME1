/**
 * P1B-4B Professional public profile fields.
 * Presentation/navigation only. Existing /api/account/story-pro-profile.
 * Run: node --import ./scripts/story-ts-alias.mjs --experimental-strip-types scripts/test-p1b4b-professional-profile.ts
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { holdsRealtorSettingsPurpose } from "../src/lib/account/assurance.ts";
import { settingsCapabilities } from "../src/lib/account/settings-capabilities.ts";
import {
  buildSettingsHref,
  parseSettingsSearch,
  resolveSettingsLocation,
} from "../src/lib/account/settings-nav.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const params = (q: string) => new URLSearchParams(q);

assert.equal(holdsRealtorSettingsPurpose("individual_pro"), true);
assert.equal(holdsRealtorSettingsPurpose("managing_broker"), true);
assert.equal(holdsRealtorSettingsPurpose("other_professional"), true);
assert.equal(holdsRealtorSettingsPurpose("consumer"), false);

const consumer = settingsCapabilities({ purpose: "consumer", kind: "consumer" });
const agent = settingsCapabilities({ purpose: "individual_pro", kind: "agent" });
const other = settingsCapabilities({
  purpose: "other_professional",
  kind: "pro",
});

assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=profile")),
    consumer,
  ).screen,
  "root",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=profile")),
    agent,
  ).control,
  "profile",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=profile")),
    other,
  ).control,
  "profile",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=account&control=profile")),
    consumer,
  ).category,
  "account",
);
assert.equal(
  buildSettingsHref({
    category: "professional",
    control: "profile",
    from: "/portal",
  }),
  "/settings?category=professional&control=profile&from=%2Fportal",
);

const view = read("src/components/settings/SettingsView.tsx");
assert.match(view, /title="Professional Profile"/);
assert.match(view, /title="Professional Identity"/);
assert.match(view, /title="License"/);
assert.match(view, /ProfessionalProfileControl/);
assert.match(view, /canEdit=\{securityReady\}/);
assert.match(view, /caps\.livingMark && !consumerPreview/);
assert.doesNotMatch(view, /title="Primary County"/);
assert.doesNotMatch(view, /title="Opportunity Availability"/);
assert.doesNotMatch(view, /function ProSection/);
assert.doesNotMatch(view, /from\("profiles"\)\.update/);

const editor = read("src/components/settings/ProfessionalProfileControl.tsx");
assert.match(editor, /\/api\/account\/story-pro-profile/);
assert.match(editor, /Primary market city/);
assert.match(editor, /Specialties/);
assert.match(editor, /Service areas/);
assert.match(editor, /Languages/);
assert.match(editor, /Designations/);
assert.match(editor, /toList|split\(","\)/);
assert.match(editor, /role="status"/);
assert.match(editor, /aria-live="polite"/);
assert.match(editor, /Couldn't save your professional profile/);
assert.match(editor, /STORY_PRO_SETTINGS_BLOCKED/);
assert.doesNotMatch(editor, /Primary County|Opportunity|Story County/);
assert.doesNotMatch(editor, /Realtor|TREC|Living Mark/);
assert.doesNotMatch(editor, /from\("profiles"\)\.update/);
assert.doesNotMatch(editor, /chip|taxonomy|fluency/);

const route = read("src/app/api/account/story-pro-profile/route.ts");
assert.match(route, /holdsRealtorSettingsPurpose/);
assert.match(route, /canEditStoryProSettings/);
assert.match(route, /specialties/);
assert.match(route, /service_areas/);
assert.match(route, /primary_market_city/);
assert.doesNotMatch(route, /CLIENTSAGENTS/i);

const identity = read("src/components/settings/PurposeCard.tsx");
assert.match(identity, /What this login is for/);
assert.doesNotMatch(read("src/app/profile/page.tsx"), /ProfessionalProfileControl/);

const migrations = readdirSync(join(root, "supabase/migrations"));
assert.equal(migrations.filter((f) => /p1b4b|p1b_4b/i.test(f)).length, 0);

console.log("p1b4b-professional-profile: ok");
