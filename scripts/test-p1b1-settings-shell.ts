/**
 * P1B-1 Settings shell / navigation. No authority, SQL, or P1A rewrites.
 * Run: node --experimental-strip-types scripts/test-p1b1-settings-shell.ts
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { settingsCapabilities } from "../src/lib/account/settings-capabilities.ts";
import {
  buildSettingsHref,
  fallbackSettingsOrigin,
  parseSettingsSearch,
  resolveSettingsLocation,
  sanitizeSettingsOrigin,
  settingsEntryHref,
} from "../src/lib/account/settings-nav.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const params = (q: string) => new URLSearchParams(q);

const consumer = settingsCapabilities({
  purpose: "consumer",
  kind: "consumer",
});
assert.equal(consumer.account, true);
assert.equal(consumer.professional, false);
assert.equal(consumer.livingMark, false);
assert.equal(consumer.office, false);
assert.equal(consumer.openOffice, false);

const realtor = settingsCapabilities({
  purpose: "individual_pro",
  kind: "agent",
});
assert.equal(realtor.professional, true);
assert.equal(realtor.livingMark, true);
assert.equal(realtor.office, false);

const officeEligible = settingsCapabilities({
  purpose: "individual_pro",
  kind: "broker",
});
assert.equal(officeEligible.professional, true);
assert.equal(officeEligible.livingMark, true);
assert.equal(officeEligible.openOffice, true);
assert.equal(officeEligible.officeWorkspace, false);
assert.equal(officeEligible.office, true);

const broker = settingsCapabilities({
  purpose: "managing_broker",
  kind: "broker",
});
assert.equal(broker.professional, true);
assert.equal(broker.officeWorkspace, true);
assert.equal(broker.openOffice, false);

const other = settingsCapabilities({
  purpose: "other_professional",
  kind: "pro",
});
assert.equal(other.professional, true);
assert.equal(other.livingMark, false);
assert.equal(other.office, false);
assert.equal(other.openOffice, false);

const qs = parseSettingsSearch(params("category=account&control=username&from=/home"));
assert.equal(qs.category, "account");
assert.equal(qs.control, "username");
assert.equal(qs.from, "/home");

const legacy = parseSettingsSearch(params("control=username"));
assert.deepEqual(resolveSettingsLocation(legacy, consumer), {
  screen: "control",
  category: "account",
  control: "username",
  setupMfa: false,
});

const mfa = parseSettingsSearch(params("setup=mfa"));
assert.deepEqual(resolveSettingsLocation(mfa, consumer), {
  screen: "control",
  category: "security",
  control: "authenticator",
  setupMfa: true,
});

const tab = parseSettingsSearch(params("tab=security"));
assert.equal(tab.category, null);
assert.equal(resolveSettingsLocation(tab, consumer).screen, "root");

assert.equal(
  resolveSettingsLocation(parseSettingsSearch(params("category=professional")), consumer)
    .screen,
  "root",
);
assert.equal(
  resolveSettingsLocation(parseSettingsSearch(params("category=office")), consumer)
    .screen,
  "root",
);
assert.equal(
  resolveSettingsLocation(parseSettingsSearch(params("category=nope")), realtor)
    .screen,
  "root",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional")),
    realtor,
  ).category,
  "professional",
);

assert.equal(
  buildSettingsHref({ category: "account", control: "username", from: "/home" }),
  "/settings?category=account&control=username&from=%2Fhome",
);
assert.equal(buildSettingsHref({ setup: "mfa" }), "/settings?setup=mfa");
assert.equal(settingsEntryHref("/home"), "/settings?from=%2Fhome");
assert.equal(settingsEntryHref("/settings"), "/settings");
assert.equal(settingsEntryHref("/login"), "/settings");

assert.equal(sanitizeSettingsOrigin("/home"), "/home");
assert.equal(
  sanitizeSettingsOrigin("/marketplace?q=Lufkin%2C%20TX&intent=sale"),
  "/marketplace?q=Lufkin%2C%20TX&intent=sale",
);
assert.equal(sanitizeSettingsOrigin("https://evil.test/home"), null);
assert.equal(sanitizeSettingsOrigin("//evil.test"), null);
assert.equal(sanitizeSettingsOrigin("/login?next=/portal"), null);
assert.equal(sanitizeSettingsOrigin("/settings?category=account"), null);
assert.equal(sanitizeSettingsOrigin("/settings"), null);
assert.equal(sanitizeSettingsOrigin("javascript:alert(1)"), null);
assert.equal(sanitizeSettingsOrigin("/not-a-story-home-page"), null);
assert.equal(fallbackSettingsOrigin({ kind: "consumer", purpose: "consumer" }), "/home");
assert.equal(
  fallbackSettingsOrigin({ kind: "broker", purpose: "managing_broker" }),
  "/office",
);
assert.equal(
  fallbackSettingsOrigin({ kind: "pro", purpose: "individual_pro" }),
  "/portal",
);

const view = read("src/components/settings/SettingsView.tsx");
assert.match(view, /settingsCapabilities/);
assert.match(view, /category=account|category: "account"/);
assert.match(view, /control=username/);
assert.match(view, /UsernameField/);
assert.match(view, /UsernameSummary/);
assert.match(view, /← Back/);
assert.match(view, />\s*Done\s*</);
assert.match(view, /settingsConsumerPreview/);
assert.match(view, /caps\.livingMark && !consumerPreview/);
assert.match(view, /title="Account"/);
assert.match(view, /title="Professional"/);
assert.match(view, /title="Brokerage \/ Office"/);
assert.doesNotMatch(view, /title="Story Home"/);
assert.doesNotMatch(view, /Search & Property/);
assert.doesNotMatch(view, /title="Communication"/);
assert.doesNotMatch(view, /title="Privacy"/);
assert.doesNotMatch(view, /Coming Soon/);
assert.doesNotMatch(view, /href=.*\/u\//);
assert.doesNotMatch(view, /You\/Security tabs|setTab/);
assert.doesNotMatch(view, /localStorage/);
assert.doesNotMatch(view, /from\("profiles"\)\.update/);

const capsSrc = read("src/lib/account/settings-capabilities.ts");
assert.match(capsSrc, /account on file/);
assert.doesNotMatch(capsSrc, /story-home-role|window\.localStorage|searchParams/);
assert.doesNotMatch(capsSrc, /from "@\//);

const navSrc = read("src/lib/account/settings-nav.ts");
assert.match(navSrc, /setup.*mfa/);
assert.match(navSrc, /sanitizeSettingsOrigin/);
assert.doesNotMatch(navSrc, /from "@\//);
assert.equal(
  readdirSync(join(root, "src/app/settings")).includes("account"),
  false,
);

const usernameField = read("src/components/settings/UsernameField.tsx");
assert.match(usernameField, /liveUsernameClient/);
assert.match(usernameField, /Save username/);
assert.doesNotMatch(usernameField, /claim_username|service_role|username_registry/);

const claim = read("src/app/api/account/username/claim/route.ts");
assert.match(claim, /requireStepUpIfEnrolled/);
assert.match(claim, /p_uid: auth\.user\.id/);

const migrations = readdirSync(join(root, "supabase/migrations"));
assert.equal(migrations.filter((f) => /p1b|settings_pref/i.test(f)).length, 0);

const pkg = read("package.json");
assert.doesNotMatch(pkg, /react-router|next-transition|framer-settings/);

console.log("p1b1-settings-shell: ok");
