/**
 * UI-2 — shared CTA / action-focus locks.
 * Run: node scripts/test-ui-2-cta-focus.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const css = read("src/app/globals.css");
assert.match(css, /\.story-cta-primary/);
assert.match(css, /\.story-cta-secondary/);
assert.match(css, /\.story-cta-primary:focus-visible/);
assert.match(css, /min-height:\s*var\(--control-min\)/);
assert.match(css, /outline:\s*2px solid var\(--gold\)/);
assert.match(css, /outline-offset:\s*2px/);
assert.match(css, /\.story-press/);
assert.match(css, /\.field-input:focus/);
assert.match(css, /box-shadow:\s*var\(--elev-deboss\),\s*var\(--ring-focus\)/);
assert.doesNotMatch(css, /\.story-cta-primary[^{]*\{[^}]*--accent/);
assert.doesNotMatch(css, /\.story-cta-primary[^{]{0,80}background:\s*var\(--accent\)/);

const miss = read("src/components/story/PublicMiss.tsx");
assert.match(miss, /story-cta-primary/);
assert.match(miss, /story-press/);
assert.match(miss, /Back to Story Home/);
assert.match(miss, /href="\/"/);
assert.doesNotMatch(miss, /Coming Soon|story-cta-secondary|--accent/i);

const rent = read("src/app/rent/page.tsx");
assert.match(rent, /story-cta-primary/);
assert.match(rent, /story-press/);
assert.match(rent, /Search homes for sale/);
assert.match(rent, /\/marketplace\?q=Lufkin%2C%20TX&intent=sale/);
assert.doesNotMatch(rent, /intent=rent/);

for (const rel of [
  "src/components/county/CountyIdentityShell.tsx",
  "src/components/county/LocalPlaceIdentityShell.tsx",
  "src/components/home/HomeSearchHero.tsx",
  "src/components/MarketplaceView.tsx",
  "src/components/settings/SettingsView.tsx",
  "src/components/GlobalNav.tsx",
]) {
  assert.doesNotMatch(read(rel), /story-cta-primary|story-cta-secondary/);
}

const pkg = read("package.json");
assert.match(pkg, /test:ui-2-cta-focus/);
assert.doesNotMatch(pkg, /@radix-ui\/react-slot|class-variance-authority/);

console.log("ui-2-cta-focus armor: ok");
