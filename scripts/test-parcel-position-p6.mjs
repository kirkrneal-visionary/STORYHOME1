/**
 * Parcel position Phase 6 — phone card + reserved copy.
 * Run: node scripts/test-parcel-position-p6.mjs
 *
 * Open property shows why it stands out, access not verified,
 * and See the evidence. Never a site grade. Never adds two roads.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const copyHost = read("src/lib/shi/parcel-position.ts");
assert.match(copyHost, /PARCEL_POSITION_COPY/);
assert.match(copyHost, /whyStandsOut: "Why this property stands out"/);
assert.match(copyHost, /seeEvidence: "See the evidence"/);
assert.match(copyHost, /accessNotVerified: "Not verified"/);
assert.match(copyHost, /frontageApprox/);
assert.match(copyHost, /Phase 6 phone card renders this copy/);
assert.doesNotMatch(copyHost, /Do not render from this module yet/);

const card = read(
  "src/components/broker/intelligence/ShiParcelPositionCard.tsx",
);
assert.match(card, /data-parcel-position-card="p6"/);
assert.match(card, /PARCEL_POSITION_COPY.whyStandsOut/);
assert.match(card, /PARCEL_POSITION_COPY.seeEvidence/);
assert.match(card, /PARCEL_POSITION_COPY.accessNotVerified/);
assert.match(card, /PARCEL_POSITION_COPY.frontageApprox/);
assert.match(card, /PARCEL_POSITION_COPY.disclaimer/);
assert.match(card, /not added together/);
assert.match(card, /profile.propId !== propId/);
assert.doesNotMatch(card, /72\/100|97\/100|commercial score/i);
assert.doesNotMatch(card, /attom|regrid|datatree|openai|anthropic/i);

const view = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(view, /ShiParcelPositionCard/);
assert.match(view, /setPositionProfile/);
assert.match(view, /body.profile/);
assert.match(view, /ShiResearchAccessPanel/);
assert.match(view, /shiCorridorsStrongestSites/);

const frames = read(
  "src/components/broker/intelligence/ShiMarketFramesPanel.tsx",
);
assert.match(frames, /min-h-11/);
assert.match(frames, /data-worth-a-look="p4"/);
assert.match(frames, /data-look-objective="p5"/);

const desk = read(
  "src/components/broker/intelligence/ShiResearchAccessDesk.tsx",
);
assert.match(desk, /Find Strongest Sites/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /P6 phone card/);
assert.match(waves, /Phase 1–4 worth a look/);
assert.match(waves, /P5 objective/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-NEIGHBORS"/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /P6 phone card/);
assert.match(wavesDoc, /P5 objective look/);
assert.match(wavesDoc, /P4 worth a look/);
assert.match(wavesDoc, /P2 engine/);
assert.match(wavesDoc, /P3 profile/);
assert.match(wavesDoc, /P4 live/);

const pkg = read("package.json");
assert.match(pkg, /test:parcel-position-p6/);

const p5 = read("scripts/test-parcel-position-p5.mjs");
assert.match(p5, /parcel-position-p5/);

console.log("parcel-position-p6 armor: ok");
