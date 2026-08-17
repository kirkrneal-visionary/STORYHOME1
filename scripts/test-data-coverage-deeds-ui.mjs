/**
 * Armor for DEEDS-UI — hide empty Deeds from product (no browser).
 * Run: node scripts/test-data-coverage-deeds-ui.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const ui = read("src/lib/shi/deeds-ui.ts");
assert.match(ui, /DEEDS_USER_UI_OFFERED\s*=\s*false/);
assert.match(ui, /Founder Interpreter/);

const lib = read("src/lib/shi/deeds-clerk.ts");
assert.match(lib, /deeds-clerk-v1\.3/);
assert.match(lib, /DEEDS_USER_UI_OFFERED/);
assert.match(lib, /uiOffered/);
assert.match(lib, /Founder Interpreter \(build process only/);

const ask = read("src/lib/shi/corridor-ask.ts");
assert.match(ask, /corridorAskIntentsForUser/);
assert.match(ask, /DEEDS_USER_UI_OFFERED/);
assert.match(ask, /not offered in the product yet/i);
assert.match(ask, /corridor-ask-v2\.3/);

const askPanel = read(
  "src/components/broker/intelligence/ShiCorridorsAskPanel.tsx",
);
assert.match(askPanel, /corridorAskIntentsForUser/);
assert.doesNotMatch(
  askPanel,
  /CORRIDOR_ASK_INTENTS\.map/,
);

const panel = read(
  "src/components/broker/intelligence/ShiDeedsEvidencePanel.tsx",
);
assert.match(panel, /DEEDS_USER_UI_OFFERED/);
assert.match(panel, /return null/);

const sources = read("src/lib/shi/corridor-sources.ts");
assert.match(sources, /DEEDS_USER_UI_OFFERED/);
assert.match(sources, /if \(!DEEDS_USER_UI_OFFERED\) continue/);

const research = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(research, /DEEDS_USER_UI_OFFERED/);

const corridors = read(
  "src/components/broker/intelligence/ShiCorridorsView.tsx",
);
assert.match(corridors, /DEEDS_USER_UI_OFFERED/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /DEEDS-UI/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-DEEDS"/);

const doc = read("docs/shi/ARCHIE-DATA-COVERAGE.md");
assert.match(doc, /DEEDS-UI/);
assert.match(doc, /DEEDS_USER_UI_OFFERED/);

const pkg = read("package.json");
assert.match(pkg, /test:data-coverage-deeds-ui/);

/** Pure gate (mirrors lib) — UI kill switch wins. */
function canRevealDeeds({ uiOffered, revealOpen, ready, peerGrade }) {
  return Boolean(uiOffered && revealOpen && ready && peerGrade);
}

assert.equal(
  canRevealDeeds({
    uiOffered: false,
    revealOpen: true,
    ready: true,
    peerGrade: true,
  }),
  false,
  "UI hidden → no reveal even if peer-grade",
);
assert.equal(
  canRevealDeeds({
    uiOffered: true,
    revealOpen: true,
    ready: true,
    peerGrade: true,
  }),
  true,
  "UI offered + peer-grade opens",
);

console.log("data-coverage-deeds-ui armor: ok");
