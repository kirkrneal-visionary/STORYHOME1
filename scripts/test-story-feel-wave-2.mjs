/**
 * Armor for STORY-FEEL-WAVE-2 (no browser).
 * Run: node scripts/test-story-feel-wave-2.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const hero = read("src/components/home/HomeSearchHero.tsx");
assert.match(hero, /brand-word/);
assert.match(hero, />STORY</);
assert.match(hero, />HOME</);
assert.match(hero, /story-surface|story-glass/);
assert.match(hero, /story-well/);
assert.doesNotMatch(hero, /Home Values →/);
assert.doesNotMatch(hero, /border-white\/15 bg-white\/5/);

const toolbar = read("src/components/marketplace/SearchToolbar.tsx");
assert.match(toolbar, /story-glass|story-chrome/);
assert.match(toolbar, /field-input/);

const market = read("src/components/MarketplaceView.tsx");
assert.match(market, /story-scrim/);
assert.match(market, /story-sheet/);
assert.match(market, /story-well/);

const listing = read("src/app/marketplace/[id]/page.tsx");
assert.match(listing, /overlay/);
assert.match(listing, /story-well/);
assert.match(listing, /story-surface/);
assert.doesNotMatch(
  listing,
  /function Spec[\s\S]*rounded-lg border border-hairline bg-\[var\(--surface\)\]/,
);

const inquire = read("src/components/marketplace/InquireButton.tsx");
assert.match(inquire, /story-well/);
assert.match(inquire, /field-input/);

console.log("story-feel-wave-2 armor: ok");
