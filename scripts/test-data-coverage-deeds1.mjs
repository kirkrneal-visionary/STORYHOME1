/**
 * Armor for ARCHIE-DEEDS-1 — owned clerk index scaffold (no browser).
 * Run: node scripts/test-data-coverage-deeds1.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");
const require = createRequire(import.meta.url);

const doc = read("docs/shi/ARCHIE-DATA-COVERAGE.md");
assert.match(doc, /DEEDS-1/);
assert.match(doc, /clerk/i);
assert.match(doc, /userReveal|reveal/i);
assert.match(doc, /0036|clerk_deed_transfers/);
assert.doesNotMatch(doc.toLowerCase().split("## Paid stop")[0] || doc, /buy datatree/i);

const mig = read("supabase/migrations/0036_clerk_deeds_index.sql");
assert.match(mig, /clerk_deed_transfers/);
assert.match(mig, /clerk_county_coverage/);
assert.match(mig, /DEEDS-1|peer-grade|dark/i);
assert.match(mig, /service_role/);

const lib = read("src/lib/shi/deeds-clerk.ts");
assert.match(lib, /deeds-clerk-v1\.1/);
assert.match(lib, /DEEDS_USER_REVEAL_OPEN\s*=\s*false/);
assert.match(lib, /clerk-coverage-launch7\.json/);
assert.match(lib, /clerk_deed_transfers/);
assert.match(lib, /fetchDeedsForParcel/);
assert.match(lib, /canRevealDeeds/);
assert.doesNotMatch(lib, /attom|datatree|corelogic|regrid|zoneomics/i);

const cov = JSON.parse(read("data/shi/clerk-coverage-launch7.json"));
assert.equal(cov.version, "deeds-1");
assert.ok(Array.isArray(cov.readyFips));
assert.equal(cov.readyFips.length, 0, "prod registry starts with zero ready FIPS");

const sample = JSON.parse(read("data/shi/clerk-deeds-launch7.sample.json"));
assert.ok(Array.isArray(sample.transfers));
assert.ok(sample.transfers[0]?.countyFips);

const ingest = read("scripts/ingest-clerk-deeds.mjs");
assert.match(ingest, /mark-ready/);
assert.match(ingest, /dry-run/);
assert.match(ingest, /DEEDS-1|userReveal remains closed/);

const pkg = read("package.json");
assert.match(pkg, /ingest:clerk-deeds/);
assert.match(pkg, /test:data-coverage-deeds1/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /ARCHIE-DEEDS|DEEDS-1/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /DEEDS-1/);

/* Runtime: reveal stays closed; empty ready set */
assert.ok(existsSync(join(root, "src/lib/shi/deeds-clerk.ts")));

console.log("data-coverage-deeds1 armor: ok");
void require;
