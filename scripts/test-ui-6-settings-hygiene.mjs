/**
 * UI-6 — Settings visual hygiene.
 * Run: node scripts/test-ui-6-settings-hygiene.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const view = read("src/components/settings/SettingsView.tsx");
assert.match(view, /data-ui-6="settings-hygiene"/);
assert.match(view, /SettingsLoadingHint/);
assert.match(view, /settingsCapabilities/);
assert.match(view, /category: "account"/);
assert.match(view, /UsernameField/);
assert.match(view, /← Back/);
assert.match(view, />\s*Done\s*</);
assert.match(view, /story-press/);
assert.match(view, /type-page-title/);
assert.doesNotMatch(view, /md:text-4xl/);
assert.doesNotMatch(view, /Loading…|Loading your settings…|Loading settings…/);
assert.doesNotMatch(view, /story-cta-primary|story-cta-secondary/);
assert.doesNotMatch(view, /PublicMiss|StoryEmptyWell/);
assert.doesNotMatch(view, /data-ui-4a|data-ui-5|data-ui-3a|data-ui-3b/);
assert.doesNotMatch(view, /Cover System|Stories coming|story circle/i);
assert.doesNotMatch(view, /HomeSearchHero|MarketplaceView|AgentWorldView|BrokeragePublicView/);

const hint = read("src/components/settings/SettingsLoadingHint.tsx");
assert.match(hint, /data-settings-loading="hint"/);
assert.match(hint, /role="status"/);
assert.match(hint, /aria-live="polite"/);
assert.match(hint, /type-meta/);
assert.doesNotMatch(hint, /skeleton|StoryEmptyWell|PublicMiss|story-market/);

const card = read("src/components/settings/SettingsCard.tsx");
assert.match(card, /type-card-title/);
assert.match(card, /type-meta/);

const row = read("src/components/settings/SettingsCategoryRow.tsx");
assert.match(row, /story-press/);
assert.match(row, /min-h-14/);
assert.match(row, /focus-visible:outline-gold/);
assert.match(row, /type-meta/);

const page = read("src/app/settings/page.tsx");
assert.match(page, /SettingsLoadingHint/);
assert.match(page, /SettingsView/);
assert.doesNotMatch(page, /Loading settings…/);

const availability = read("src/components/settings/AvailabilityControl.tsx");
assert.match(availability, /SettingsLoadingHint/);
assert.match(availability, /available/);
assert.match(availability, /temporarily_unavailable/);
assert.match(availability, /"Save"/);
assert.doesNotMatch(availability, /Loading…/);
assert.doesNotMatch(availability, /story-cta-primary|PublicMiss/);

const primary = read("src/components/settings/PrimaryCountyControl.tsx");
assert.match(primary, /Request Primary County/);
assert.match(primary, /SERVICE_COUNTIES\.map/);
assert.doesNotMatch(primary, />Save</);

const service = read("src/components/settings/ServiceCountiesControl.tsx");
assert.match(service, /SERVICE_COUNTIES\.map/);
assert.match(service, /"Save"/);
assert.doesNotMatch(service, /Request Primary County/);

const caps = read("src/lib/account/settings-capabilities.ts");
assert.match(caps, /account on file/);
assert.doesNotMatch(caps, /ui-6|owner-review/);

const nav = read("src/lib/account/settings-nav.ts");
assert.match(nav, /setup.*mfa/);
assert.doesNotMatch(nav, /ui-6|owner-review/);

assert.equal(existsSync(join(root, "src/lib/ui-6-owner-review.ts")), false);
assert.equal(existsSync(join(root, "src/app/internal/ui-6-review/settings/page.tsx")), false);
assert.equal(existsSync(join(root, "scripts/test-ui-6-owner-review-gate.ts")), false);

const tsconfig = read("tsconfig.json");
assert.doesNotMatch(tsconfig, /scripts\/test-ui-6-owner-review-gate\.ts/);

const pkg = read("package.json");
assert.match(pkg, /test:ui-6-settings-hygiene/);
assert.doesNotMatch(pkg, /@radix-ui\/react-slot|class-variance-authority/);

for (const rel of [
  "src/components/home/HomeSearchHero.tsx",
  "src/components/MarketplaceView.tsx",
  "src/components/county/CountyIdentityShell.tsx",
  "src/components/county/LocalPlaceIdentityShell.tsx",
  "src/components/agents/AgentWorldView.tsx",
  "src/components/brokerage/BrokeragePublicView.tsx",
  "src/components/story/PublicMiss.tsx",
  "src/components/GlobalNav.tsx",
]) {
  assert.doesNotMatch(read(rel), /data-ui-6/);
}

console.log("ui-6-settings-hygiene armor: ok");
