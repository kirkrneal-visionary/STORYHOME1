/**
 * Wave 6 — see-through dock frost + top rim only.
 * Isolated. No browser. No production data.
 * Run: node --experimental-strip-types scripts/test-nav-frost.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const css = read("src/app/globals.css");
assert.match(css, /--dock-glass-bg:/);
assert.match(css, /--dock-glass-blur:\s*32px/);
assert.match(css, /--dock-glass-saturate:/);
assert.match(css, /--dock-rim:/);
assert.match(
  css,
  /\.story-bottom-dock\.story-glass-nav\s*\{[\s\S]*?border:\s*none/,
);
assert.match(
  css,
  /\.story-bottom-dock\.story-glass-nav\s*\{[\s\S]*?box-shadow:\s*none/,
);
assert.match(
  css,
  /\.story-bottom-dock\.story-glass-nav::before\s*\{[\s\S]*?inset 0 1px 0 var\(--dock-rim\)/,
);
assert.match(
  css,
  /backdrop-filter:\s*blur\(var\(--dock-glass-blur\)\)[\s\S]*?saturate\(var\(--dock-glass-saturate\)\)/,
);
assert.match(css, /prefers-reduced-transparency[\s\S]*story-bottom-dock\.story-glass-nav::before[\s\S]*content:\s*none/);
assert.match(css, /never a solid black header band/);
assert.match(css, /Not the header/);
assert.doesNotMatch(css, /--dock-glass-border/);

const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /story-bottom-dock/);
assert.match(nav, /story-glass-nav/);

const map = read("src/components/marketplace/MarketplaceMap.tsx");
assert.doesNotMatch(map, /--dock-rim/);
assert.doesNotMatch(map, /--dock-glass-saturate/);

console.log("nav-frost: ok");
