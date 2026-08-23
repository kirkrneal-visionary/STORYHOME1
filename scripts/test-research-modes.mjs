/**
 * Research Modes armor + truth tests A–G.
 * Run: node scripts/test-research-modes.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

function run(script, args = []) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, `${script} failed\n${r.stdout}\n${r.stderr}`);
}

run("scripts/test-research-merge-r2.mjs");
run("scripts/test-corridors-2e.mjs");
run("scripts/test-parcel-position-p8.mjs");

{
  const r = spawnSync(
    "npx",
    ["--yes", "tsx", "--tsconfig", "tsconfig.json", "scripts/run-research-mode-truth.ts"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(r.status, 0, `truth tests failed\n${r.stdout}\n${r.stderr}`);
}

const modes = read("src/lib/shi/research-modes.ts");
assert.match(modes, /research-modes-v1/);
assert.match(modes, /gas_station/);
assert.match(modes, /land_development/);
assert.match(modes, /energy_rei/);
assert.match(modes, /enabled: false/);
assert.match(modes, /Coming Soon/);
assert.doesNotMatch(modes, /best property|universal score/);

const reason = read("src/lib/shi/research-mode-reason.ts");
assert.match(reason, /isRankEligible/);
assert.match(reason, /Unknown is never zero/);
assert.match(reason, /not added together/);
assert.doesNotMatch(reason, /97\/100|best investment/);

const selector = read(
  "src/components/broker/intelligence/ShiResearchModeSelector.tsx",
);
assert.match(selector, /RESEARCH_MODE_LANDING/);
assert.match(modes, /What are you researching/);
assert.match(selector, /data-research-mode-selector/);
assert.match(selector, /RESEARCH_MODE_LIST/);
assert.match(modes, /energy_rei/);

const workspace = read(
  "src/components/broker/intelligence/ShiWorkspace.tsx",
);
assert.match(workspace, /ShiResearchModeSelector/);
assert.match(workspace, /researchMode/);

const view = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(view, /data-multifamily-landing/);
assert.match(view, /modeReviewFromRankedFacts/);
assert.match(view, /lens: "mode"/);

const desk = read(
  "src/components/broker/intelligence/ShiResearchAccessDesk.tsx",
);
assert.match(desk, /Find Strongest Sites/);
assert.match(desk, /modeReview/);

const studies = read("src/lib/shi/studies.ts");
assert.match(studies, /researchMode/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /ARCHIE-RESEARCH-MODES/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-NEIGHBORS"/);

const pkg = read("package.json");
assert.match(pkg, /test:research-modes/);

console.log("research-modes armor: ok");
