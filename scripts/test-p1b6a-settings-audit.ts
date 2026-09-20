/**
 * P1B-6A Settings integration audit.
 * Matrix, origin safety, no new categories, existing authority.
 * Run: node --import ./scripts/story-ts-alias.mjs --experimental-strip-types scripts/test-p1b6a-settings-audit.ts
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  canOpenOfficeAccount,
  mayManageBrokerage,
} from "../src/lib/account/purpose.ts";
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
const loc = (q: string, caps: ReturnType<typeof settingsCapabilities>) =>
  resolveSettingsLocation(parseSettingsSearch(params(q)), caps);

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

assert.deepEqual(
  { professional: consumer.professional, office: consumer.office },
  { professional: false, office: false },
);
assert.equal(loc("category=professional", consumer).screen, "root");
assert.equal(loc("category=office&control=open", consumer).screen, "root");
assert.equal(loc("category=professional&control=living", consumer).screen, "root");

assert.equal(agent.professional, true);
assert.equal(agent.office, false);
assert.equal(agent.livingMark, true);
assert.equal(loc("category=office", agent).screen, "root");
assert.equal(loc("category=office&control=open", agent).screen, "root");
assert.equal(loc("category=professional&control=identity", agent).control, "identity");

assert.equal(eligible.openOffice, true);
assert.equal(eligible.officeWorkspace, false);
assert.equal(loc("category=office&control=open", eligible).control, "open");
assert.equal(loc("category=office&control=workspace", eligible).screen, "category");

assert.equal(managing.officeWorkspace, true);
assert.equal(managing.openOffice, false);
assert.equal(loc("category=office&control=workspace", managing).control, "workspace");
assert.equal(loc("category=office&control=open", managing).screen, "category");

assert.equal(other.professional, true);
assert.equal(other.trecLicense, false);
assert.equal(other.livingMark, false);
assert.equal(other.brokerage, false);
assert.equal(other.office, false);
assert.equal(loc("category=professional&control=license", other).screen, "category");
assert.equal(loc("category=professional&control=living", other).screen, "category");
assert.equal(loc("category=office", other).screen, "root");

assert.equal(canOpenOfficeAccount("individual_pro", "broker"), true);
assert.equal(canOpenOfficeAccount("individual_pro", "agent"), false);
assert.equal(canOpenOfficeAccount("other_professional", "pro"), false);
assert.equal(canOpenOfficeAccount("consumer", "consumer"), false);
assert.equal(mayManageBrokerage("managing_broker"), true);
assert.equal(mayManageBrokerage("individual_pro"), false);

assert.equal(loc("category=nope", agent).screen, "root");
assert.equal(loc("category=professional&control=stories", agent).screen, "category");
assert.equal(loc("category=account&control=email", consumer).screen, "category");
assert.equal(loc("category=security&control=email", consumer).control, "email");
assert.equal(loc("category=security&control=delete", consumer).control, "delete");

assert.equal(sanitizeSettingsOrigin("https://evil.test/home"), null);
assert.equal(sanitizeSettingsOrigin("http://evil.test"), null);
assert.equal(sanitizeSettingsOrigin("//evil.test"), null);
assert.equal(sanitizeSettingsOrigin("/login"), null);
assert.equal(sanitizeSettingsOrigin("/settings"), null);
assert.equal(sanitizeSettingsOrigin("/settings?category=account"), null);
assert.equal(sanitizeSettingsOrigin("javascript:alert(1)"), null);
assert.equal(sanitizeSettingsOrigin("/home"), "/home");
assert.equal(sanitizeSettingsOrigin("/portal"), "/portal");
assert.equal(sanitizeSettingsOrigin("/office"), "/office");
assert.equal(settingsEntryHref("/settings"), "/settings");
assert.equal(fallbackSettingsOrigin({ kind: "consumer", purpose: "consumer" }), "/home");
assert.equal(
  fallbackSettingsOrigin({ kind: "broker", purpose: "managing_broker" }),
  "/office",
);
assert.equal(
  buildSettingsHref({ category: "office", control: "open", from: "https://evil.test" }),
  "/settings?category=office&control=open",
);

const view = read("src/components/settings/SettingsView.tsx");
assert.match(view, /title="Account"/);
assert.match(view, /title="Professional"/);
assert.match(view, /title="Brokerage \/ Office"/);
assert.match(view, /title="Open Office"/);
assert.match(view, /title="Office Workspace"/);
assert.match(view, /title="Living Mark"/);
assert.match(view, /title="Brokerage"/);
assert.match(view, /showBrokerageRow/);
assert.match(view, /location.category !== "professional"/);
assert.doesNotMatch(view, /title="Story Home"/);
assert.doesNotMatch(view, /Search & Property|title="Communication"|title="Privacy"/);
assert.doesNotMatch(view, /Coming Soon|You\/Security tabs|setTab/);
assert.doesNotMatch(view, /from\("profiles"\)\.update/);

const purpose = read("src/components/settings/PurposeCard.tsx");
assert.match(purpose, /Open them from Brokerage \/ Office/);
assert.doesNotMatch(purpose, /office account\s+below/);

const open = read("src/components/settings/OpenOfficeCard.tsx");
assert.match(open, /\/api\/account\/open-office/);
assert.match(open, /needs_mfa/);

const api = read("src/app/api/account/open-office/route.ts");
assert.match(api, /open_office_account/);
assert.match(api, /canOpenOfficeAccount/);

const officeLayout = read("src/app/office/layout.tsx");
assert.match(officeLayout, /Demo mode \(no Supabase\) renders the page/);
assert.match(officeLayout, /getServerSupabase/);

const officeHome = read("src/components/office/OfficeHome.tsx");
assert.match(officeHome, /isSupabaseConfigured/);
assert.match(officeHome, /setLoading\(false\)/);

const claim = read("src/app/api/account/username/claim/route.ts");
assert.match(claim, /rate|limit|step/i);
assert.doesNotMatch(claim, /settingsCapabilities/);

const username = read("src/components/settings/UsernameField.tsx");
assert.match(username, /min-h-11/);

const deleteSrc = read("src/components/settings/SecuritySection.tsx");
assert.match(deleteSrc, /sec-delete-confirm|DELETE_CONFIRM/);
assert.match(deleteSrc, /tone="danger"|text-red-300/);

const migrations = readdirSync(join(root, "supabase/migrations"));
assert.equal(migrations.filter((f) => /p1b6a|settings_audit/i.test(f)).length, 0);

const pkg = read("package.json");
assert.doesNotMatch(pkg, /react-dropzone|uppy|filepond|cmdk/);

console.log("p1b6a-settings-audit: ok");
