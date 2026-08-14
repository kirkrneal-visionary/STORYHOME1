/**
 * Armor for STORY-SHELL-NAV — floating bottom dock all platforms (no browser).
 * Run: node scripts/test-story-shell-nav.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const css = read("src/app/globals.css");
assert.match(css, /\.story-glass-nav/);
assert.match(css, /\.story-bottom-dock/);
assert.match(css, /@media \(min-width:\s*768px\)[\s\S]*?\.story-bottom-dock[\s\S]*?translateX\(-50%\)/);

const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /data-story-bottom-dock/);
assert.match(nav, /story-bottom-dock/);
assert.match(nav, /story-glass-nav/);
/* Must not hide the dock on desktop — mobile visual brought to all platforms */
assert.doesNotMatch(nav, /story-glass-nav[^>]*md:hidden/);
assert.doesNotMatch(nav, /story-bottom-dock[^>]*md:hidden/);

const home = read("src/components/home/HomeSearchHero.tsx");
assert.match(home, /story-bottom-clearance/);
assert.doesNotMatch(home, /md:pb-0/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /STORY-SHELL-NAV/);
assert.match(waves, /ARCHIE_CURRENT_WAVE\s*=\s*"STORY-SHELL-NAV"/);

console.log("story-shell-nav armor: ok");
