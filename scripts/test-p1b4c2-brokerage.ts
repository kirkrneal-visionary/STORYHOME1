/**
 * P1B-4C2 Professional Brokerage focused control.
 * Presentation/navigation only. Existing invite authority.
 * Run: node --import ./scripts/story-ts-alias.mjs --experimental-strip-types scripts/test-p1b4c2-brokerage.ts
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { settingsCapabilities } from "../src/lib/account/settings-capabilities.ts";
import {
  buildSettingsHref,
  parseSettingsSearch,
  resolveSettingsLocation,
} from "../src/lib/account/settings-nav.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const params = (q: string) => new URLSearchParams(q);

const consumer = settingsCapabilities({ purpose: "consumer", kind: "consumer" });
const agent = settingsCapabilities({ purpose: "individual_pro", kind: "agent" });
const broker = settingsCapabilities({
  purpose: "individual_pro",
  kind: "broker",
});
const managing = settingsCapabilities({
  purpose: "managing_broker",
  kind: "broker",
});
const other = settingsCapabilities({
  purpose: "other_professional",
  kind: "pro",
});

assert.equal(consumer.brokerage, false);
assert.equal(agent.brokerage, true);
assert.equal(broker.brokerage, true);
assert.equal(managing.brokerage, true);
assert.equal(other.brokerage, false);
assert.equal(other.professional, true);

assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=brokerage")),
    consumer,
  ).screen,
  "root",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=brokerage")),
    other,
  ).screen,
  "category",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=brokerage")),
    agent,
  ).control,
  "brokerage",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=brokerage")),
    broker,
  ).control,
  "brokerage",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=brokerage")),
    managing,
  ).control,
  "brokerage",
);
assert.equal(
  buildSettingsHref({
    category: "professional",
    control: "brokerage",
    from: "/portal",
  }),
  "/settings?category=professional&control=brokerage&from=%2Fportal",
);

const view = read("src/components/settings/SettingsView.tsx");
assert.match(view, /title="Brokerage"/);
assert.match(view, /control: "brokerage"/);
assert.match(view, /showBrokerageRow/);
assert.match(view, /Invitation pending/);
assert.match(view, /BrokerageRelationship/);
assert.match(view, /Current brokerage/);
assert.match(view, /acceptInvite\(pending\.brokerageId\)/);
assert.match(view, /Accept invitation from/);
assert.match(view, /title="Professional Identity"/);
assert.match(view, /title="Professional Profile"/);
assert.match(view, /title="Living Mark"/);
assert.match(view, /caps\.livingMark && !consumerPreview/);
assert.doesNotMatch(view, /Decline invite|Leave brokerage|Switch brokerage|Remove myself/);
assert.doesNotMatch(view, /join by name|join by ID|brokerage search/i);
assert.doesNotMatch(view, /from\("profiles"\)\.update/);
assert.doesNotMatch(view, /brokerage\?\.id|brokerage\.id\b/);

const professionalList = view.slice(
  view.indexOf("location.category === \"professional\" ? ("),
  view.indexOf("location.category === \"office\""),
);
assert.match(professionalList, /title="Brokerage"/);
assert.doesNotMatch(professionalList, /AgentJoinBanner/);

const focused = view.slice(
  view.indexOf("function BrokerageRelationship"),
  view.indexOf("function AgentJoinBanner"),
);
assert.match(focused, /brokerageName/);
assert.match(focused, /typeLabel/);
assert.doesNotMatch(focused, /sponsorName|sponsorLicenseNumber|trecLicense/);
assert.doesNotMatch(focused, /<input|<textarea|<select/);
assert.doesNotMatch(focused, /roster|Open office|team leader/i);

const roster = read("src/lib/supabase/roster.ts");
assert.match(roster, /accept_brokerage_invite/);
assert.match(roster, /p_brokerage/);
assert.match(roster, /myPendingInvite/);

const office = read("src/components/office/OfficeHome.tsx");
assert.match(office, /getBrokerageById/);

const capsSrc = read("src/lib/account/settings-capabilities.ts");
assert.match(capsSrc, /brokerage/);
assert.doesNotMatch(capsSrc, /other_professional.*brokerage/);

const migrations = readdirSync(join(root, "supabase/migrations"));
assert.equal(migrations.filter((f) => /p1b4c2|brokerage_settings/i.test(f)).length, 0);

const pkg = read("package.json");
assert.doesNotMatch(pkg, /react-select|downshift|cmdk/);

console.log("p1b4c2-brokerage: ok");
