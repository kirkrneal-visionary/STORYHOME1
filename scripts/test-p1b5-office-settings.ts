/**
 * P1B-5 Brokerage / Office Settings entry + /office handoff.
 * Presentation/navigation only. Existing Open Office authority.
 * Run: node --import ./scripts/story-ts-alias.mjs --experimental-strip-types scripts/test-p1b5-office-settings.ts
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
const eligible = settingsCapabilities({
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

assert.equal(consumer.office, false);
assert.equal(consumer.openOffice, false);
assert.equal(agent.office, false);
assert.equal(agent.openOffice, false);
assert.equal(other.office, false);
assert.equal(eligible.openOffice, true);
assert.equal(eligible.officeWorkspace, false);
assert.equal(managing.officeWorkspace, true);
assert.equal(managing.openOffice, false);

function loc(q: string, caps: typeof consumer) {
  return resolveSettingsLocation(parseSettingsSearch(params(q)), caps);
}

assert.equal(loc("category=office", consumer).screen, "root");
assert.equal(loc("category=office&control=open", consumer).screen, "root");
assert.equal(loc("category=office&control=workspace", consumer).screen, "root");
assert.equal(loc("category=office", agent).screen, "root");
assert.equal(loc("category=office&control=open", agent).screen, "root");
assert.equal(loc("category=office", other).screen, "root");
assert.equal(loc("category=office&control=open", eligible).control, "open");
assert.equal(loc("category=office&control=workspace", eligible).screen, "category");
assert.equal(loc("category=office&control=workspace", managing).control, "workspace");
assert.equal(loc("category=office&control=open", managing).screen, "category");
assert.equal(
  buildSettingsHref({ category: "office", control: "open", from: "/portal" }),
  "/settings?category=office&control=open&from=%2Fportal",
);
assert.equal(
  buildSettingsHref({ category: "office", control: "workspace", from: "/office" }),
  "/settings?category=office&control=workspace&from=%2Foffice",
);

const view = read("src/components/settings/SettingsView.tsx");
assert.match(view, /title="Brokerage \/ Office"/);
assert.match(view, /title="Open Office"/);
assert.match(view, /title="Office Workspace"/);
assert.match(view, /control: "open"/);
assert.match(view, /control: "workspace"/);
assert.match(view, /OpenOfficeCard/);
assert.match(view, /OfficeWorkspaceHandoff/);
assert.match(view, /href="\/office"/);
assert.match(view, /setup: "mfa"/);
assert.match(view, /title="Brokerage"/);
assert.doesNotMatch(view, /from\("profiles"\)\.update/);
assert.doesNotMatch(view, /account_purpose|open_office_account/);

const officeList = view.slice(
  view.indexOf('id="settings-row-open-office"'),
  view.indexOf('id="settings-row-profile"'),
);
assert.match(officeList, /title="Open Office"/);
assert.match(officeList, /title="Office Workspace"/);
assert.doesNotMatch(officeList, /OpenOfficeCard/);
assert.doesNotMatch(officeList, /team leader|agent removal|cancelInvite/i);

const handoff = view.slice(
  view.indexOf("function OfficeWorkspaceHandoff"),
  view.indexOf("function LicenseSection"),
);
assert.match(handoff, /href="\/office"/);
assert.doesNotMatch(handoff, /<input|<textarea|<select/);
assert.doesNotMatch(handoff, /fetch\("\/api\/account\/open-office"/);

const open = read("src/components/settings/OpenOfficeCard.tsx");
assert.match(open, /\/api\/account\/open-office/);
assert.match(open, /needs_mfa/);
assert.match(open, /Set up authenticator/);
assert.match(open, /You keep Story Pro on the same account/);
assert.doesNotMatch(open, /not a bigger Story Pro/);

const api = read("src/app/api/account/open-office/route.ts");
assert.match(api, /open_office_account/);
assert.match(api, /canOpenOfficeAccount/);

const officeHome = read("src/components/office/OfficeHome.tsx");
assert.match(officeHome, /getBrokerageById/);

const capsSrc = read("src/lib/account/settings-capabilities.ts");
assert.doesNotMatch(capsSrc, /story-home-role|window\.localStorage/);

const migrations = readdirSync(join(root, "supabase/migrations"));
assert.equal(migrations.filter((f) => /p1b5|office_settings/i.test(f)).length, 0);

console.log("p1b5-office-settings: ok");
