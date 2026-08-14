/**
 * Armor for STORY-FEEL-WAVE-3 (no browser).
 * Run: node scripts/test-story-feel-wave-3.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const portal = read("src/components/broker/BrokerPortal.tsx");
assert.match(portal, /story-chrome/);
assert.match(portal, /story-press/);

const ui = read("src/components/broker/ui.tsx");
assert.match(ui, /field-input/);
assert.match(ui, /story-well/);

const listings = read("src/components/broker/MyListingsView.tsx");
assert.match(listings, /story-card/);
assert.match(listings, /story-well/);

const buyers = read("src/components/broker/MyBuyersView.tsx");
assert.match(buyers, /story-surface|story-card/);

const form = read("src/components/broker/ListingForm.tsx");
assert.match(form, /story-surface/);
assert.match(form, /field-input/);

const tools = read("src/components/broker/CapRateCalculator.tsx");
assert.match(tools, /story-surface/);
assert.match(tools, /story-well/);

const settings = read("src/components/settings/SettingsView.tsx");
assert.match(settings, /story-surface/);

console.log("story-feel-wave-3 armor: ok");
