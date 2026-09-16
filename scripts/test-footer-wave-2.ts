/**
 * Footer Wave 2 — compact row, Explore, 16px TREC in the open.
 * Isolated. No browser. No production data.
 * Run: node --experimental-strip-types scripts/test-footer-wave-2.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const footer = read("src/components/Footer.tsx");
assert.match(footer, /story-site-footer/);
assert.match(footer, /Explore Story Home/);
assert.match(footer, /NavPressButton/);
assert.match(footer, /Every home has a story/);
assert.match(footer, /TREC Information About Brokerage Services/);
assert.match(footer, /TREC Consumer Protection Notice/);
assert.match(footer, /story-footer-trec/);
assert.match(footer, /Privacy Policy/);
assert.match(footer, /Terms of Use/);
assert.match(footer, /Accessibility Statement/);
assert.match(footer, /Full housing statement/);
assert.match(footer, /href="\/fair-housing"/);
assert.match(footer, /\[Pending\]/);
assert.match(footer, /blank form — placeholder/);
assert.match(footer, /href: "\/about"/);
assert.match(footer, /href: "\/contact"/);
assert.match(footer, /href: "\/marketplace"/);
assert.match(footer, /href: "\/seller"/);
assert.match(footer, /href: "\/home"/);
assert.match(footer, /href: "\/network"/);
assert.match(footer, /href: "\/portal"/);
assert.match(footer, /href: "\/login"/);
assert.doesNotMatch(footer, /Buyers & Sellers/);
assert.doesNotMatch(footer, /For Professionals/);
assert.doesNotMatch(footer, /lg:grid-cols-4/);
assert.doesNotMatch(footer, /absolute top-full/);
assert.match(footer, /story-footer-explore/);
assert.match(footer, /Serving Polk/);

const css = read("src/app/globals.css");
assert.match(
  css,
  /\.story-footer-trec\s*\{[\s\S]*?font-size:\s*1rem/,
);
assert.match(
  css,
  /\.story-footer-trec\s*\{[\s\S]*?min-height:\s*2\.75rem/,
);
assert.match(
  css,
  /\.story-site-footer\s*\{[\s\S]*?padding-bottom:\s*calc\(3rem \+ var\(--story-bottom-clearance\)\)/,
);
assert.match(css, /never a solid black header band/);
assert.match(css, /TREC stays 16px and in the open/);

console.log("footer-wave-2: ok");
