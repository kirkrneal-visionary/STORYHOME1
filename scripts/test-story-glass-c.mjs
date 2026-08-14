/**
 * Armor for STORY-GLASS Phase C (browse) — no browser.
 * Run: node scripts/test-story-glass-c.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const map = read("src/components/marketplace/MarketplaceMap.tsx");
assert.match(map, /story-glass/);
assert.doesNotMatch(map, /bg-navy\/90/);

const toolbar = read("src/components/marketplace/SearchToolbar.tsx");
assert.match(toolbar, /story-glass/);
assert.match(toolbar, /field-input/);

const market = read("src/components/MarketplaceView.tsx");
assert.match(market, /--story-header-h/);
assert.match(market, /--story-bottom-clearance/);
assert.match(market, /readMarketplaceCache|saveMarketplaceCache/);
assert.doesNotMatch(market, /bg-navy-deep/);
assert.match(market, /bg-\[var\(--env-0\)\]/);

const card = read("src/components/ListingCard.tsx");
assert.match(card, /story-surface|story-card/);
assert.match(card, /story-glass/);

const listing = read("src/app/marketplace/[id]/page.tsx");
assert.match(listing, /--story-header-h/);
assert.match(listing, /--story-bottom-clearance/);
assert.match(listing, /story-well/);
assert.match(listing, /story-surface/);
assert.doesNotMatch(listing, /pt-\[72px\]/);

const back = read("src/components/marketplace/BackToMarketplace.tsx");
assert.match(back, /story-glass/);

const plan = read("docs/shi/STORY-GLASS.md");
assert.match(plan, /Phase C/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /STORY-GLASS-C/);
assert.match(waves, /id:\s*"STORY-GLASS-C"/);

console.log("story-glass-c armor: ok");
