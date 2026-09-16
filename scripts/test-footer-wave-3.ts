/**
 * Footer Wave 3 — Fair Housing essay lives on /fair-housing.
 * Footer keeps the Equal Housing mark. TREC stays 16px in the open.
 * Isolated. No browser. No production data.
 * Run: node --experimental-strip-types scripts/test-footer-wave-3.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const footer = read("src/components/Footer.tsx");
assert.match(footer, /story-site-footer/);
assert.match(footer, /story-footer-housing/);
assert.match(footer, /Equal Housing Opportunity/);
assert.match(footer, /href="\/fair-housing"/);
assert.match(footer, /Explore Story Home/);
assert.match(footer, /TREC Information About Brokerage Services/);
assert.match(footer, /TREC Consumer Protection Notice/);
assert.match(footer, /story-footer-trec/);
assert.match(footer, /\[Pending\]/);
assert.doesNotMatch(footer, /letter and spirit/);
assert.doesNotMatch(footer, /Full housing statement/);
assert.doesNotMatch(footer, /do not discriminate based on any protected class/);
assert.doesNotMatch(footer, /Buyers & Sellers/);
assert.doesNotMatch(footer, /lg:grid-cols-4/);

const page = read("src/app/fair-housing/page.tsx");
assert.match(page, /letter and spirit/);
assert.match(page, /do not discriminate\s+based on any protected class/);
assert.match(page, /federal Fair Housing Act/);
assert.match(page, /Texas\s+fair housing laws/);

const css = read("src/app/globals.css");
assert.match(css, /Full Fair Housing copy lives on \/fair-housing/);
assert.match(
  css,
  /\.story-footer-trec\s*\{[\s\S]*?font-size:\s*1rem/,
);
assert.match(
  css,
  /\.story-site-footer\s*\{[\s\S]*?padding-bottom:\s*calc\(3rem \+ var\(--story-bottom-clearance\)\)/,
);
assert.match(css, /never a solid black header band/);
assert.match(css, /TREC stays 16px and in the open/);

console.log("footer-wave-3: ok");
