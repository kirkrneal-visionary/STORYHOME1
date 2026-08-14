/**
 * Armor for STORY-SHELL-HEADER — overlay living header (no browser).
 * Run: node scripts/test-story-shell-header.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const css = read("src/app/globals.css");
assert.match(css, /--story-safe-top/);
assert.match(css, /\.story-overlay-header/);
assert.match(css, /\.story-room-pad/);
assert.match(css, /story-app-shell::before[\s\S]*content:\s*none/);
/* No reserved black rule under overlay header (all platforms) */
assert.match(css, /\.story-overlay-header\s*\{[\s\S]*?border-bottom:\s*none/);
assert.doesNotMatch(
  css,
  /\.story-overlay-header[\s\S]{0,400}border-bottom:\s*1px/,
);
assert.doesNotMatch(
  css,
  /data-header-state="compact"[\s\S]{0,280}border-bottom-color/,
);

const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /story-overlay-header/);
assert.match(nav, /data-story-overlay-header/);
assert.match(nav, /--story-safe-top/);
assert.match(nav, /env\(safe-area-inset-top/);
assert.match(nav, /absolute left-1\/2/); // centered brand on phone
assert.doesNotMatch(nav, /story-chrome fixed top-0.*border-b/);

const layout = read("src/app/layout.tsx");
assert.match(layout, /viewportFit:\s*"cover"/);

const listing = read("src/app/marketplace/[id]/page.tsx");
assert.match(listing, /--story-safe-top/);
assert.doesNotMatch(
  listing,
  /aspect-\[4\/3\].*pt-\[var\(--story-header-h\)\]/,
);

const ribbon = read("src/components/nav/NetworkContextRibbon.tsx");
assert.match(ribbon, /top-\[var\(--story-safe-top\)\]/);

const market = read("src/components/MarketplaceView.tsx");
assert.match(market, /--story-safe-top/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /STORY-SHELL-HEADER/);
assert.match(waves, /id:\s*"STORY-SHELL-HEADER"/);

console.log("story-shell-header armor: ok");
