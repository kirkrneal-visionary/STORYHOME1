/**
 * Wave 1 — remove fake “Scan MLS for sold”.
 * Manual listing status stays. Isolated. No production writes.
 * Run: node --experimental-strip-types scripts/test-wave-1-mls.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const view = read("src/components/broker/MyListingsView.tsx");
assert.doesNotMatch(view, /scanMls/);
assert.doesNotMatch(view, /Scan MLS for sold/);
assert.doesNotMatch(view, /MLS scan complete/);
assert.doesNotMatch(view, /auto-de-listed/);
assert.doesNotMatch(view, /scanNote/);
assert.match(view, /onStatus=\{async \(s\) => \{/);
assert.match(view, /await updateListingStatus\(listing\.id, s\)/);
assert.match(view, /New listing/);

const listings = read("src/lib/supabase/listings.ts");
assert.match(listings, /export async function updateListingStatus/);
assert.match(listings, /\.from\("listings"\)/);
assert.match(listings, /\.update\(\{ status, updated_at:/);

console.log("wave-1-mls: ok");
