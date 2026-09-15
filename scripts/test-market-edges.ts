/**
 * Wave 5 — Marketplace card and control edges.
 * Isolated. No browser. No production data.
 * Run: node --experimental-strip-types scripts/test-market-edges.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const css = read("src/app/globals.css");
assert.match(css, /--market-canvas:\s*var\(--env-0\)/);
assert.match(css, /--market-edge:/);
assert.match(css, /--market-edge-selected:/);
assert.match(css, /--market-control-bg:/);
assert.match(css, /\.story-market-card\s*\{/);
assert.match(css, /\.story-market-card-selected\s*\{/);
assert.match(
  css,
  /\.story-market-card\s*\{[\s\S]*?box-shadow:\s*none/,
);
assert.match(
  css,
  /\.story-market-toolbar \.field-input\s*\{[\s\S]*?box-shadow:\s*none/,
);
assert.match(css, /never a solid black header band/);
assert.match(css, /Not the map/);

const card = read("src/components/ListingCard.tsx");
assert.match(card, /story-surface/);
assert.match(card, /story-glass/);
assert.match(card, /story-market-card/);
assert.match(card, /story-market-card-selected/);
assert.match(card, /dense \? "story-market-card/);

const toolbar = read("src/components/marketplace/SearchToolbar.tsx");
assert.match(toolbar, /story-market-toolbar/);
assert.match(toolbar, /--market-control-bg/);
assert.doesNotMatch(toolbar, /story-glass/);
assert.doesNotMatch(toolbar, /--glass-bg/);

const view = read("src/components/MarketplaceView.tsx");
assert.match(view, /story-market-canvas/);
assert.match(view, /\bdense\b/);

const map = read("src/components/marketplace/MarketplaceMap.tsx");
assert.doesNotMatch(map, /story-market-card/);
assert.doesNotMatch(map, /--market-edge/);
assert.match(map, /story-glass/);

const hero = read("src/components/home/HomeSearchHero.tsx");
assert.doesNotMatch(hero, /story-market-card/);

console.log("market-edges: ok");
