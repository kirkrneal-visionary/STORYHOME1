/**
 * P1B-4A Professional shell + verified identity + license.
 * Presentation/navigation only. No authority, SQL, or P1B-4B/4C.
 * Run: node --import ./scripts/story-ts-alias.mjs --experimental-strip-types scripts/test-p1b4a-professional-identity.ts
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { professionalTypeLabel } from "../src/lib/account/purpose.ts";
import { settingsCapabilities } from "../src/lib/account/settings-capabilities.ts";
import {
  buildSettingsHref,
  parseSettingsSearch,
  resolveSettingsLocation,
} from "../src/lib/account/settings-nav.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const params = (q: string) => new URLSearchParams(q);

assert.equal(
  professionalTypeLabel({ purpose: "individual_pro", kind: "agent" }),
  "Sales Agent",
);
assert.equal(
  professionalTypeLabel({ purpose: "individual_pro", kind: "broker" }),
  "Broker",
);
assert.equal(
  professionalTypeLabel({ purpose: "managing_broker", kind: "broker" }),
  "Managing Broker",
);
assert.equal(
  professionalTypeLabel({ purpose: "individual_pro", kind: "pro" }),
  "Story Pro",
);
assert.equal(
  professionalTypeLabel({
    purpose: "other_professional",
    kind: "pro",
    professionalRole: "inspector",
  }),
  "Inspector",
);
assert.equal(
  professionalTypeLabel({ purpose: "consumer", kind: "consumer" }),
  "Consumer",
);
assert.doesNotMatch(
  professionalTypeLabel({ purpose: "individual_pro", kind: "agent" }),
  /individual_pro|realtor_broker/,
);

const consumer = settingsCapabilities({ purpose: "consumer", kind: "consumer" });
const agent = settingsCapabilities({ purpose: "individual_pro", kind: "agent" });
const broker = settingsCapabilities({ purpose: "individual_pro", kind: "broker" });
const managing = settingsCapabilities({
  purpose: "managing_broker",
  kind: "broker",
});
const other = settingsCapabilities({
  purpose: "other_professional",
  kind: "pro",
});

assert.equal(consumer.professional, false);
assert.equal(consumer.trecLicense, false);
assert.equal(agent.professional, true);
assert.equal(agent.trecLicense, true);
assert.equal(broker.trecLicense, true);
assert.equal(managing.trecLicense, true);
assert.equal(other.professional, true);
assert.equal(other.trecLicense, false);
assert.equal(other.livingMark, false);

assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=identity")),
    consumer,
  ).screen,
  "root",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=license")),
    consumer,
  ).screen,
  "root",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=identity")),
    agent,
  ).control,
  "identity",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=license")),
    agent,
  ).control,
  "license",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=license")),
    other,
  ).screen,
  "category",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=stories")),
    agent,
  ).screen,
  "category",
);
assert.equal(
  buildSettingsHref({
    category: "professional",
    control: "identity",
    from: "/portal",
  }),
  "/settings?category=professional&control=identity&from=%2Fportal",
);

const view = read("src/components/settings/SettingsView.tsx");
assert.match(view, /title="Professional Identity"/);
assert.match(view, /title="License"/);
assert.match(view, /caps\.trecLicense/);
assert.match(view, /IdentityFacts/);
assert.match(view, /LicenseSection/);
assert.match(view, /PurposeCard/);
assert.match(view, /caps\.livingMark && !consumerPreview/);
assert.match(view, /Legal name/);
assert.doesNotMatch(view, /title="Opportunity Availability"/);
assert.doesNotMatch(view, /title="Professional Notifications"/);
assert.doesNotMatch(view, /title="individual_pro"|title="managing_broker"|title="other_professional"/);
assert.doesNotMatch(view, /from\("profiles"\)\.update/);
assert.doesNotMatch(view, /account_purpose|verified_legal_name|trec_verified_at/);

const identity = view.slice(
  view.indexOf("function IdentityFacts"),
  view.indexOf("function LicenseSection"),
);
assert.match(identity, /Professional type/);
assert.match(identity, /Legal name/);
assert.doesNotMatch(identity, /<input|<textarea|<select/);

const license = view.slice(view.indexOf("function LicenseSection"));
assert.match(license, /License number|License #/);
assert.match(license, /Sponsoring broker/);
assert.doesNotMatch(license, /<input|<textarea/);

assert.match(view, /<dt className/);

const profile = read("src/components/settings/ProfileControl.tsx");
assert.doesNotMatch(profile, /Legal name on file/);

const purpose = read("src/lib/account/purpose.ts");
assert.match(purpose, /professionalTypeLabel/);
assert.doesNotMatch(purpose, /account_purpose\s*=/);

const capsSrc = read("src/lib/account/settings-capabilities.ts");
assert.match(capsSrc, /trecLicense/);
assert.doesNotMatch(capsSrc, /from "@\//);

const preview = read("src/lib/account/settings-preview.ts");
assert.match(preview, /does not change the account on file/);

const migrations = readdirSync(join(root, "supabase/migrations"));
assert.equal(migrations.filter((f) => /p1b4|p1b_4/i.test(f)).length, 0);

const pkg = read("package.json");
assert.doesNotMatch(pkg, /trec-lookup|license-editor/);

console.log("p1b4a-professional-identity: ok");
