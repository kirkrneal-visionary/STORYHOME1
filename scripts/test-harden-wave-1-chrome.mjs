/**
 * Harden Wave 1 — chrome integrity.
 * UX only. Not a security control.
 * Isolated. No production writes.
 * Run: node scripts/test-harden-wave-1-chrome.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");
const css = read("src/app/globals.css");

assert.match(css, /Chrome integrity — UX only\. Not a security control/);
assert.match(css, /\.story-overlay-header \*/);
assert.match(css, /\.story-bottom-dock \*/);
assert.match(css, /\.story-wordmark/);
assert.match(css, /\.type-hero/);
assert.match(css, /\.story-market-toolbar[\s\S]*?user-select:\s*none/);
assert.match(css, /\.story-map-tool[\s\S]*?user-select:\s*none/);
assert.match(css, /\.maplibregl-ctrl[\s\S]*?user-select:\s*none/);
assert.match(css, /\.story-copy[\s\S]*?user-select:\s*text/);
assert.match(css, /\.story-market-toolbar input[\s\S]*?user-select:\s*text/);
assert.doesNotMatch(css, /right-click|contextmenu|devtools|oncontextmenu/i);
assert.doesNotMatch(css, /user-select:\s*none[\s\S]*html\s*,/);

const card = read("src/components/ListingCard.tsx");
assert.match(card, /story-copy/);
assert.match(card, /addressSerif/);

const detail = read("src/app/marketplace/[id]/page.tsx");
assert.match(detail, /story-copy/);
assert.match(detail, /listing\.description/);

const footer = read("src/components/Footer.tsx");
assert.match(footer, /story-copy/);
assert.match(footer, /TREC License/);

const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /story-overlay-header/);
assert.match(nav, /story-bottom-dock/);
assert.doesNotMatch(nav, /onContextMenu/);

console.log("harden-wave-1-chrome: ok");
