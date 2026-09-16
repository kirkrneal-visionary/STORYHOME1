/**
 * Wave 3 — smoked-glass dock bubble + official Archie mark.
 * Isolated. No browser. No production data.
 * Run: node --experimental-strip-types scripts/test-nav-bubble.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const css = read("src/app/globals.css");
assert.match(css, /--dock-glass-bg/);
assert.match(css, /--dock-radius/);
assert.match(css, /--dock-icon/);
assert.match(css, /--dock-active-fill:\s*var\(--navy\)/);
assert.match(css, /--dock-motion:\s*160ms/);
assert.match(css, /\.story-dock-active-fill/);
assert.match(css, /\.story-dock-mark/);
assert.match(
  css,
  /\.story-bottom-dock\.story-glass-nav\s*\{[\s\S]*?border:\s*none/,
);
assert.match(
  css,
  /\.story-bottom-dock\.story-glass-nav\s*\{[\s\S]*?box-shadow:\s*none/,
);
assert.doesNotMatch(css, /--dock-glass-border/);
assert.doesNotMatch(css, /@keyframes storyDockSelect/);
assert.match(css, /\.story-dock-active-fill-on/);
assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*story-dock-active-fill/);
assert.match(css, /prefers-reduced-transparency/);
assert.match(css, /@supports not \(/);
assert.match(css, /never a solid black header band/);
assert.doesNotMatch(
  css,
  /\.story-overlay-header\s*\{[\s\S]*?color-mix\(in srgb, var\(--env-0\) 82%/,
);

const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /ARCHIE_MARK_SRC/);
assert.match(nav, /story-dock-active-fill/);
assert.match(nav, /story-dock-mark/);
assert.match(nav, /items-stretch justify-items-stretch/);
assert.doesNotMatch(nav, /archie-intelligence-sm/);
assert.doesNotMatch(nav, /color-mix\(in_srgb,var\(--navy\)_55%/);

const networks = read("src/lib/navigation/networks.ts");
assert.match(networks, /archie-intelligence\.png/);

console.log("nav-bubble: ok");
