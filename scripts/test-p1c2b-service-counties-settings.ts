/** P1C-2B Service Counties Settings locks. Run: npm run test:p1c2b-service-counties-settings */
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

assert.equal(agent.serviceCounties, true);
assert.equal(managing.serviceCounties, true);
assert.equal(consumer.serviceCounties, false);
assert.equal(other.serviceCounties, false);
assert.equal(loc("category=professional&control=counties", agent).control, "counties");
assert.equal(loc("category=professional&control=counties", managing).control, "counties");
assert.equal(loc("category=professional&control=counties", consumer).screen, "root");
assert.equal(loc("category=professional&control=counties", other).screen, "category");
assert.equal(
  buildSettingsHref({ category: "professional", control: "counties" }),
  "/settings?category=professional&control=counties",
);

const view = read("src/components/settings/SettingsView.tsx");
const control = read("src/components/settings/ServiceCountiesControl.tsx");
const profile = read("src/components/settings/ProfessionalProfileControl.tsx");
assert.match(view, /title="Service Counties"/);
assert.match(view, /caps\.serviceCounties && !consumerPreview/);
assert.match(view, /ServiceCountiesControl/);
assert.match(view, /control: "counties"/);
assert.match(control, /\/api\/account\/service-counties/);
assert.match(control, /serviceCountyFips: selected/);
assert.match(control, /aria-pressed/);
assert.match(control, /min-h-11/);
assert.match(control, /SERVICE_COUNTIES/);
assert.doesNotMatch(control, /professional_id|service_role|from\("professional_service_counties"\)/);
assert.match(profile, />Service areas</);
assert.doesNotMatch(profile, /serviceCountyFips|Service Counties/);
assert.doesNotMatch(read("src/app/agents/[id]/page.tsx"), /serviceCountyFips/);
assert.equal(
  readdirSync(join(root, "supabase/migrations")).filter((f) => f.startsWith("0066")).length,
  0,
);
const pkg = read("package.json");
assert.doesNotMatch(pkg, /react-select|downshift|cmdk/);

console.log("p1c2b-service-counties-settings: ok");
