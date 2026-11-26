/**
 * Armor for Capacitor / iPhone native-app zoom lock.
 * Run: node scripts/test-iphone-no-zoom.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const layout = read("src/app/layout.tsx");
assert.match(layout, /maximumScale:\s*1/);
assert.match(layout, /userScalable:\s*false/);
assert.match(layout, /viewportFit:\s*"cover"/);

const css = read("src/app/globals.css");
assert.match(css, /touch-action:\s*manipulation/);
assert.match(css, /font-size:\s*max\(16px,\s*1em\)\s*!important/);
assert.match(css, /-webkit-text-size-adjust:\s*100%/);

console.log("iphone-no-zoom armor: ok");
