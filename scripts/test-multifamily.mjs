/**
 * Multifamily armor — copy, flags, audit, seven-county harness.
 * Run: node scripts/test-multifamily.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

{
  const r = spawnSync(
    "npx",
    ["--yes", "tsx", "--tsconfig", "tsconfig.json", "scripts/run-multifamily-truth.ts"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(r.status, 0, `truth failed\n${r.stdout}\n${r.stderr}`);
}

const audit = read("docs/shi/MULTIFAMILY_DATA_AUDIT.md");
assert.match(audit, /MULTIFAMILY DATA AUDIT/);
assert.match(audit, /PASS \/ FAIL/);
assert.match(audit, /USGS 3DEP/);
assert.match(audit, /\*\*FAIL\*\*.*Nearby Apartments|FAIL.*apartment/i);
assert.match(audit, /48373/);
assert.match(audit, /48005/);
assert.match(audit, /48455/);
assert.match(audit, /48457/);
assert.match(audit, /48407/);
assert.match(audit, /48291/);
assert.match(audit, /48471/);
assert.match(audit, /tractCount|Tracts/);
assert.doesNotMatch(audit, /buy ATTOM|scrape apartments/i);

const flags = read("src/lib/shi/multifamily.ts");
assert.match(flags, /multifamily-v1/);
assert.match(flags, /topography: false/);
assert.match(flags, /unitStudy: false/);
assert.match(flags, /apartmentInventory: false/);
assert.match(flags, /usableLand: false/);
assert.match(flags, /FIND THE GROUND BEHIND THE DOORS/);
assert.match(flags, /Find land worth a closer look for apartments and build-to-rent/);
assert.doesNotMatch(flags, /terrain, flood exposure, utilities, roads and local housing/);

const usable = read("src/lib/shi/multifamily-usable-land.ts");
assert.match(usable, /MULTIFAMILY_COPY.usableLandUnknown/);
assert.doesNotMatch(usable, /buildable acres/i);
assert.match(flags, /Not enough verified data to estimate preliminary usable land/);

const scenarios = read("src/lib/shi/multifamily-scenarios.ts");
assert.match(scenarios, /worth_studying/);
assert.match(scenarios, /insufficient_evidence/);
assert.doesNotMatch(scenarios, /units per acre \* gross/);

const review = read("src/lib/shi/multifamily-review.ts");
assert.match(review, /strong_land_fit/);
assert.match(review, /utility_position/);
assert.match(review, /needs_closer_look/);
assert.doesNotMatch(review, /0–100|0-100 score|best apartment/);

const modes = read("src/lib/shi/research-modes.ts");
assert.match(modes, /Find land worth a closer look for apartments and build-to-rent/);
assert.match(modes, /does not estimate units from acreage/);

const banner = read(
  "src/components/broker/intelligence/ShiResearchModeBanner.tsx",
);
assert.match(banner, /MULTIFAMILY_COPY/);
assert.match(banner, /data-multifamily-landing/);

const readUi = read(
  "src/components/broker/intelligence/ShiMultifamilyRead.tsx",
);
assert.match(readUi, /data-multifamily-read/);
assert.match(readUi, /data-mf-usable-land/);
assert.match(readUi, /Water service area/);
assert.match(readUi, /Capacity/);
assert.match(readUi, /Not verified/);
assert.doesNotMatch(readUi, /Water available|Sewer available|Nearby Apartments/);

const desk = read(
  "src/components/broker/intelligence/ShiResearchAccessDesk.tsx",
);
assert.match(desk, /data-mf-site-review/);
assert.match(desk, /Find Strongest Sites/);

const view = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(view, /ShiMultifamilyRead/);
assert.match(view, /shiMultifamilyReview/);
assert.match(view, /shiMultifamilyParcel/);

const parcelApi = read("src/app/api/shi/multifamily/parcel/route.ts");
assert.match(parcelApi, /requireStoryPro/);
assert.match(parcelApi, /buildMultifamilyRead/);

const reviewApi = read("src/app/api/shi/multifamily/review/route.ts");
assert.match(reviewApi, /requireStoryPro/);
assert.match(reviewApi, /reviewMultifamilyFrame/);
assert.match(reviewApi, /analyzeArea/);

const housing = read("src/lib/shi/housing-acs.ts");
assert.match(housing, /acs5-housing-launch7-v1/);
assert.match(housing, /not apartment demand/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /ARCHIE-MULTIFAMILY/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-NEIGHBORS"/);

const pkg = read("package.json");
assert.match(pkg, /test:multifamily/);
assert.match(pkg, /ingest:acs-housing/);

/* Existing Research modes must still pass. */
{
  const r = spawnSync(process.execPath, ["scripts/test-research-modes.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, `research-modes regression\n${r.stdout}\n${r.stderr}`);
}

console.log("multifamily armor: ok");
