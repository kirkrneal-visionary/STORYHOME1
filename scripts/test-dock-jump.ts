/**
 * Dock tap: one oval fades. Icon does not jump.
 * Isolated. No browser. No production data.
 * Run: node --experimental-strip-types scripts/test-dock-jump.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /pendingCue=\{false\}/);
assert.match(nav, /story-dock-active-fill-on/);
assert.doesNotMatch(nav, /active \?\s*\(/);
assert.doesNotMatch(nav, /story-dock-active-fill" \/>\s*\) : null/);

const link = read("src/components/nav/PrimaryNavLink.tsx");
assert.match(link, /pendingCue/);
assert.match(link, /pendingCue \? <NavPendingCue/);

const css = read("src/app/globals.css");
assert.match(css, /\.story-dock-active-fill-on/);
assert.doesNotMatch(css, /@keyframes storyDockSelect/);
assert.match(
  css,
  /\.story-bottom-dock \.story-press:active\s*\{[\s\S]*?transform:\s*none/,
);
assert.match(
  css,
  /\.story-bottom-dock \[data-nav-pending-cue\]\s*\{[\s\S]*?display:\s*none/,
);
assert.match(css, /never shrink the tab/);
assert.match(css, /never a solid black header band/);

console.log("dock-jump: ok");
