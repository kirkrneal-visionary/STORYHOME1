/** P1C-1C Primary County Settings locks. Run: npm run test:p1c1c-primary-county-settings */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
const loc = (q: string, caps: ReturnType<typeof settingsCapabilities>) =>
  resolveSettingsLocation(parseSettingsSearch(params(q)), caps);

const consumer = settingsCapabilities({ purpose: "consumer", kind: "consumer" });
const agent = settingsCapabilities({ purpose: "individual_pro", kind: "agent" });
const managing = settingsCapabilities({
  purpose: "managing_broker",
  kind: "broker",
});
const other = settingsCapabilities({
  purpose: "other_professional",
  kind: "pro",
});

assert.equal(agent.primaryCounty, true);
assert.equal(managing.primaryCounty, true);
assert.equal(consumer.primaryCounty, false);
assert.equal(other.primaryCounty, false);
assert.equal(loc("category=professional&control=primary", agent).control, "primary");
assert.equal(loc("category=professional&control=primary", managing).control, "primary");
assert.equal(loc("category=professional&control=primary", consumer).screen, "root");
assert.equal(loc("category=professional&control=primary", other).screen, "category");
assert.equal(
  buildSettingsHref({ category: "professional", control: "primary" }),
  "/settings?category=professional&control=primary",
);

const view = read("src/components/settings/SettingsView.tsx");
const control = read("src/components/settings/PrimaryCountyControl.tsx");
const counties = read("src/components/settings/ServiceCountiesControl.tsx");
const profile = read("src/components/settings/ProfessionalProfileControl.tsx");
assert.match(view, /title="Primary County"/);
assert.match(view, /Request your primary launch county/);
assert.match(view, /caps\.primaryCounty && !consumerPreview/);
assert.match(view, /PrimaryCountyControl/);
assert.match(view, /control: "primary"/);
assert.match(view, /title="Service Counties"/);
assert.match(control, /\/api\/account\/primary-county/);
assert.match(control, /countyFips: candidate/);
assert.match(control, /Request Primary County/);
assert.match(control, /Current Primary County/);
assert.match(control, /Pending request/);
assert.match(control, /Awaiting Story Home review/);
assert.match(control, /Primary County not set/);
assert.match(control, /Previous request was not approved/);
assert.match(control, /role="radiogroup"/);
assert.match(control, /aria-checked/);
assert.match(control, /min-h-11/);
assert.doesNotMatch(control, /\bSave\b|Approve|Reject|decide_primary_county/);
assert.doesNotMatch(control, /professional_id|service_role|from\("professional_primary_counties"\)/);
assert.doesNotMatch(control, /primary_market_city|service_areas|serviceCountyFips/);
assert.doesNotMatch(counties, /primary-county|Request Primary County/);
assert.match(profile, />Service areas</);
assert.doesNotMatch(profile, /effectiveCountyFips|Primary County/);
assert.doesNotMatch(read("src/app/agents/[id]/page.tsx"), /effectiveCountyFips|pendingCountyFips/);
assert.doesNotMatch(read("package.json"), /react-select|downshift|cmdk/);

console.log("p1c1c-primary-county-settings: ok");
