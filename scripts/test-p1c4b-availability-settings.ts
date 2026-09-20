/** P1C-4B Availability Settings locks. Run: npm run test:p1c4b-availability-settings */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { settingsCapabilities } from "../src/lib/account/settings-capabilities.ts";
import {
  buildSettingsHref,
  parseSettingsSearch,
  resolveSettingsLocation,
} from "../src/lib/account/settings-nav.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const loc = (q: string, caps: ReturnType<typeof settingsCapabilities>) =>
  resolveSettingsLocation(parseSettingsSearch(new URLSearchParams(q)), caps);

const consumer = settingsCapabilities({ purpose: "consumer", kind: "consumer" });
const agent = settingsCapabilities({ purpose: "individual_pro", kind: "agent" });
const managing = settingsCapabilities({ purpose: "managing_broker", kind: "broker" });
const other = settingsCapabilities({ purpose: "other_professional", kind: "pro" });

assert.equal(agent.availability, true);
assert.equal(managing.availability, true);
assert.equal(consumer.availability, false);
assert.equal(other.availability, false);
assert.equal(loc("category=professional&control=availability", agent).control, "availability");
assert.equal(loc("category=professional&control=availability", managing).control, "availability");
assert.equal(loc("category=professional&control=availability", consumer).screen, "root");
assert.equal(loc("category=professional&control=availability", other).screen, "category");
assert.equal(
  buildSettingsHref({ category: "professional", control: "availability" }),
  "/settings?category=professional&control=availability",
);

const view = read("src/components/settings/SettingsView.tsx");
const control = read("src/components/settings/AvailabilityControl.tsx");
assert.match(view, /title="Availability"/);
assert.match(view, /Manage your work availability/);
assert.match(view, /caps\.availability && !consumerPreview/);
assert.match(view, /AvailabilityControl/);
assert.doesNotMatch(view, /\/api\/account\/availability|You will receive leads|inactivity_paused/);
assert.match(control, /\/api\/account\/availability/);
assert.match(control, /JSON\.stringify\(\{ availability: pick \}\)/);
for (const token of [
  "Not configured",
  "Temporarily Unavailable",
  'role="radiogroup"',
  "aria-checked",
  "min-h-11",
  "needs_mfa",
  "pick !== saved",
]) {
  assert.match(control, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.doesNotMatch(control, /professional_id|service_role|from\("professional_operational_state"\)/);
assert.doesNotMatch(control, /lead count|income target|30-day|living_mark/);
assert.doesNotMatch(read("src/app/agents/[id]/page.tsx"), /temporarily_unavailable|operational_state/);
assert.doesNotMatch(read("src/app/api/account/availability/route.ts"), /SettingsView|AvailabilityControl/);
assert.equal(readdirSync(join(root, "supabase/migrations")).filter((file) => file.startsWith("0070")).length, 0);

let last = -1;
for (const title of [
  'title="Professional Identity"',
  'title="Professional Profile"',
  'title="Primary County"',
  'title="Service Counties"',
  'title="Availability"',
  'title="License"',
  'title="Living Mark"',
  'title="Brokerage"',
]) {
  const at = view.indexOf(title);
  assert.ok(at > last, title);
  last = at;
}

console.log("p1c4b-availability-settings: ok");
