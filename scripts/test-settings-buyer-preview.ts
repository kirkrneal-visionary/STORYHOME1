/**
 * Wave 2: Settings changes clothes with View as Consumer.
 * Run: node --experimental-strip-types scripts/test-settings-buyer-preview.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  settingsConsumerPreview,
  settingsConsumerPreviewCopy,
} from "../src/lib/account/settings-preview.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(
  settingsConsumerPreview({ role: "consumer", mayUseStoryPro: true }),
  true,
);
assert.equal(
  settingsConsumerPreview({ role: "professional", mayUseStoryPro: true }),
  false,
);
assert.equal(
  settingsConsumerPreview({ role: "consumer", mayUseStoryPro: false }),
  false,
);

assert.match(
  settingsConsumerPreviewCopy("Amy Crow", true),
  /Amy Crow's office login, previewing as a consumer/,
);
assert.match(
  settingsConsumerPreviewCopy("Amy Crow", false),
  /Amy Crow's Story Pro login, previewing as a consumer/,
);

const view = read("src/components/settings/SettingsView.tsx");
assert.match(view, /useApp/);
assert.match(view, /settingsConsumerPreview/);
assert.match(view, /settingsConsumerPreviewCopy/);
assert.match(view, /consumerPreview \? "Consumer"/);
assert.match(view, /!consumerPreview && securityReady/);
assert.match(view, /AccountSection/);
assert.match(view, /SecuritySection/);
assert.doesNotMatch(view, /from\("profiles"\)\.update/);
assert.doesNotMatch(view, /account_purpose/);
assert.doesNotMatch(view, /settingsBuyerPreview/);

const helper = read("src/lib/account/settings-preview.ts");
assert.match(helper, /does not change the account on file/);
assert.doesNotMatch(helper, /from "@\//);

console.log("settings-buyer-preview: ok");
