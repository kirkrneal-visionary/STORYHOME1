/**
 * P1B-6B Settings cleanup locks.
 * Run: node --import ./scripts/story-ts-alias.mjs --experimental-strip-types scripts/test-p1b6b-settings-cleanup.ts
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { settingsCapabilities } from "../src/lib/account/settings-capabilities.ts";
import {
  parseSettingsSearch,
  resolveSettingsLocation,
} from "../src/lib/account/settings-nav.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const params = (q: string) => new URLSearchParams(q);
const consumer = settingsCapabilities({ purpose: "consumer", kind: "consumer" });
const loc = (q: string) =>
  resolveSettingsLocation(parseSettingsSearch(params(q)), consumer);

assert.equal(parseSettingsSearch(params("tab=security")).category, null);
assert.equal(loc("tab=security").screen, "root");
assert.equal(loc("setup=mfa").control, "authenticator");
assert.equal(loc("setup=mfa").setupMfa, true);
assert.equal(loc("category=security&control=email").control, "email");
assert.equal(loc("category=professional&control=living").screen, "root");

const nav = read("src/lib/account/settings-nav.ts");
assert.doesNotMatch(nav, /tab === "security"/);
assert.match(nav, /setup === "mfa"/);
assert.match(nav, /"living"/);
assert.doesNotMatch(nav, /living-mark/);

const purpose = read("src/components/settings/PurposeCard.tsx");
assert.match(purpose, /This login runs the office/);
assert.match(purpose, /Open them from Brokerage \/ Office/);
assert.doesNotMatch(purpose, /href="\/office"/);
assert.doesNotMatch(purpose, />Open office</);

const view = read("src/components/settings/SettingsView.tsx");
assert.doesNotMatch(view, /function AccountSection/);
assert.match(view, /<ProfileControl/);
assert.match(view, /UsernameSummary/);
assert.match(view, /loadCurrent\(\)/);
assert.match(view, /next\/dynamic/);
assert.match(view, /LivingMarkLibraryCard/);
assert.match(view, /OpenOfficeCard/);
assert.match(view, /ProfessionalProfileControl/);
assert.match(view, /SecuritySection/);
assert.doesNotMatch(view, /title="Story Home"|title="Communication"|title="Privacy"/);
assert.doesNotMatch(view, /NOTICES_UI|Security Notices/);

const security = read("src/components/settings/SecuritySection.tsx");
assert.match(security, /NOTICES_UI = false/);

const pkg = read("package.json");
assert.doesNotMatch(pkg, /react-dropzone|uppy|filepond|cmdk|@loadable/);

const migrations = readdirSync(join(root, "supabase/migrations"));
assert.equal(migrations.filter((f) => /p1b6b|settings_cleanup/i.test(f)).length, 0);

console.log("p1b6b-settings-cleanup: ok");
