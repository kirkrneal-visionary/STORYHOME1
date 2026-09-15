/**
 * Wave 4 — Marketplace page canvas.
 * Isolated. No browser. No production data.
 * Run: node --experimental-strip-types scripts/test-market-canvas.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const css = read("src/app/globals.css");
assert.match(css, /--market-canvas:\s*var\(--env-0\)/);
assert.match(css, /\.story-market-canvas/);
assert.match(css, /\.story-market-toolbar/);
assert.match(
  css,
  /\.story-market-toolbar\s*\{[\s\S]*?background:\s*var\(--market-canvas\)/,
);
assert.match(
  css,
  /\.story-market-toolbar\s*\{[\s\S]*?border:\s*none/,
);
assert.match(css, /never a solid black header band/);

const view = read("src/components/MarketplaceView.tsx");
assert.match(view, /story-market-canvas/);
assert.doesNotMatch(view, /SearchToolbar[\s\S]*story-glass/);

const toolbar = read("src/components/marketplace/SearchToolbar.tsx");
assert.match(toolbar, /story-market-toolbar/);
assert.doesNotMatch(toolbar, /story-glass/);
assert.match(toolbar, /field-input/);

const page = read("src/app/marketplace/page.tsx");
assert.match(page, /story-market-canvas/);

const map = read("src/components/marketplace/MarketplaceMap.tsx");
assert.doesNotMatch(map, /story-market-canvas/);
assert.doesNotMatch(map, /story-market-toolbar/);

console.log("market-canvas: ok");
