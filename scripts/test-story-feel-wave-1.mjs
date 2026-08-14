/**
 * Armor for STORY-FEEL-WAVE-1 (no browser).
 * Run: node scripts/test-story-feel-wave-1.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const css = read("src/app/globals.css");
assert.match(css, /--elev-deboss/);
assert.match(css, /--elev-raise/);
assert.match(css, /--atmosphere/);
assert.match(css, /\.story-well/);
assert.match(css, /\.story-sheet/);
assert.match(css, /\.story-chrome/);
assert.match(css, /\.story-app-shell::before/);
assert.match(css, /--radius-sheet/);
assert.doesNotMatch(css, /#7c3aed|#a855f7/i); // no purple trap

const layout = read("src/app/layout.tsx");
assert.match(layout, /Fraunces/);
assert.match(layout, /--font-fraunces/);

const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /story-chrome|story-overlay-header/);
assert.match(nav, /font-serif/);

const modal = read("src/components/suites/SaveToSuiteModal.tsx");
assert.match(modal, /story-sheet/);
assert.match(modal, /story-scrim/);
assert.match(modal, /story-well/);

const card = read("src/components/ListingCard.tsx");
assert.match(card, /story-card|story-surface/);

const plan = read("docs/shi/STORY-FEEL-WAVES.md");
assert.match(plan, /STORY-FEEL-WAVE-1/);
assert.match(plan, /STORY-FEEL-WAVE-4/);
assert.match(plan, /No brand color rewrite/);

console.log("story-feel-wave-1 armor: ok");
