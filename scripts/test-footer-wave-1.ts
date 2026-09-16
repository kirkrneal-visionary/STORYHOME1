/**
 * Footer Wave 1 — room above the dock + fade. Clearance and fade stay.
 * Isolated. No browser. No production data.
 * Run: node --experimental-strip-types scripts/test-footer-wave-1.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const footer = read("src/components/Footer.tsx");
assert.match(footer, /story-site-footer/);
assert.match(footer, /bg-\[var\(--background\)\]/);
assert.doesNotMatch(footer, /story-site-footer[^>]*border-t/);
assert.doesNotMatch(footer, /bg-\[var\(--nav-surface\)\]/);
assert.match(footer, /\[Pending\]/);
assert.match(footer, /blank form — placeholder/);
assert.match(footer, /Equal Housing/);
assert.match(footer, /TREC Information About Brokerage Services|Information About Brokerage Services/);
assert.match(footer, /TREC Consumer Protection Notice/);

const css = read("src/app/globals.css");
assert.match(
  css,
  /\.story-site-footer\s*\{[\s\S]*?padding-bottom:\s*calc\(3rem \+ var\(--story-bottom-clearance\)\)/,
);
assert.match(
  css,
  /\.story-site-footer::before\s*\{[\s\S]*?pointer-events:\s*none/,
);
assert.match(
  css,
  /\.story-site-footer::before\s*\{[\s\S]*?linear-gradient\(\s*180deg/,
);
assert.match(css, /\.story-site-footer\s*\{[\s\S]*?border-top:\s*none/);
assert.match(css, /never a solid black header band/);
assert.match(css, /Not the header\. Not the dock/);

console.log("footer-wave-1: ok");
