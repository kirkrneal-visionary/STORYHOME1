/**
 * Armor for ARCHIE-DEEDS-2 — peer-grade reveal gate (no browser).
 * Run: node scripts/test-data-coverage-deeds2.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/ARCHIE-DATA-COVERAGE.md");
assert.match(doc, /DEEDS-2/);
assert.match(doc, /peerGrade|peer-grade/i);
assert.match(doc, /Founder Interpreter \(process\)/);

const lib = read("src/lib/shi/deeds-clerk.ts");
assert.match(lib, /deeds-clerk-v1\.2/);
assert.match(lib, /DEEDS_USER_REVEAL_OPEN\s*=\s*true/);
assert.match(lib, /isClerkPeerGrade/);
assert.match(lib, /clerkPeerGradeFipsFromRegistry/);
assert.match(lib, /canRevealDeeds/);
assert.match(lib, /Founder Interpreter \(build process only/);
assert.doesNotMatch(lib, /attom|datatree|corelogic|regrid|zoneomics/i);
assert.doesNotMatch(lib, /you should (buy|sell)/i);

const cov = JSON.parse(read("data/shi/clerk-coverage-launch7.json"));
assert.equal(cov.version, "deeds-2");
assert.deepEqual(cov.readyFips, []);
assert.deepEqual(cov.peerGradeFips, []);
for (const fips of Object.keys(cov.counties)) {
  assert.equal(cov.counties[fips].peerGrade, false);
}

const ingest = read("scripts/ingest-clerk-deeds.mjs");
assert.match(ingest, /mark-peer-grade/);
assert.match(ingest, /Refuse peer-grade without ready/);

const ask = read("src/lib/shi/corridor-ask.ts");
assert.match(ask, /deed_history/);
assert.match(ask, /peer-grade/i);
assert.match(ask, /Not deed history/);
assert.doesNotMatch(ask, /from \"@\/lib\/shi\/deeds-clerk\"/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /DEEDS-2/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-DEEDS"/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /DEEDS-2 shipping/);

const pkg = read("package.json");
assert.match(pkg, /test:data-coverage-deeds2/);

/** Pure gate (mirrors lib). */
function canRevealDeeds({ revealOpen, ready, peerGrade }) {
  return Boolean(revealOpen && ready && peerGrade);
}

assert.equal(
  canRevealDeeds({ revealOpen: true, ready: false, peerGrade: false }),
  false,
  "empty prod stays dark",
);
assert.equal(
  canRevealDeeds({ revealOpen: true, ready: true, peerGrade: false }),
  false,
  "ready alone is not enough",
);
assert.equal(
  canRevealDeeds({ revealOpen: false, ready: true, peerGrade: true }),
  false,
  "software kill switch",
);
assert.equal(
  canRevealDeeds({ revealOpen: true, ready: true, peerGrade: true }),
  true,
  "peer-grade path opens",
);

console.log("data-coverage-deeds2 armor: ok");
