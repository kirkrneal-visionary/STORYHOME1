/**
 * Footer paint matches the page wall. Not the header. Not the dock.
 * Isolated. No browser. No production data.
 * Run: node --experimental-strip-types scripts/test-home-footer.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const footer = read("src/components/Footer.tsx");
assert.match(footer, /bg-\[var\(--background\)\]/);
assert.doesNotMatch(footer, /bg-\[var\(--nav-surface\)\]/);
assert.match(footer, /Equal Housing/);
assert.match(footer, /Information About Brokerage Services/);
assert.match(footer, /TREC Consumer Protection Notice/);

const css = read("src/app/globals.css");
assert.match(css, /--background:\s*var\(--env-0\)/);
assert.match(css, /--nav-surface:/);
assert.match(css, /never a solid black header band/);

const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /story-bottom-dock/);
assert.match(nav, /story-overlay-header/);

console.log("home-footer: ok");
