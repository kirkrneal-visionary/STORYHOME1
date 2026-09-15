/**
 * Wave 2: Settings changes clothes with View as buyer.
 * Run: node --experimental-strip-types scripts/test-settings-buyer-preview.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  settingsBuyerPreview,
  settingsBuyerPreviewCopy,
} from "../src/lib/account/settings-preview.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(
  settingsBuyerPreview({ role: "consumer", mayUseStoryPro: true }),
  true,
);
assert.equal(
  settingsBuyerPreview({ role: "professional", mayUseStoryPro: true }),
  false,
);
assert.equal(
  settingsBuyerPreview({ role: "consumer", mayUseStoryPro: false }),
  false,
);

assert.match(
  settingsBuyerPreviewCopy("Amy Crow", true),
  /Amy Crow's office login, previewing as a buyer/,
);
assert.match(
  settingsBuyerPreviewCopy("Amy Crow", false),
  /Amy Crow's Story Pro login, previewing as a buyer/,
);

const view = read("src/components/settings/SettingsView.tsx");
assert.match(view, /useApp/);
assert.match(view, /settingsBuyerPreview/);
assert.match(view, /settingsBuyerPreviewCopy/);
assert.match(view, /Buyer \/ Consumer/);
assert.match(view, /!buyerPreview && securityReady/);
assert.match(view, /AccountSection/);
assert.match(view, /SecuritySection/);
assert.doesNotMatch(view, /from\("profiles"\)\.update/);
assert.doesNotMatch(view, /account_purpose/);

const helper = read("src/lib/account/settings-preview.ts");
assert.match(helper, /does not change the account on file/);
assert.doesNotMatch(helper, /from "@\//);

console.log("settings-buyer-preview: ok");
