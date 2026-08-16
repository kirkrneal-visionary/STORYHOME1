/**
 * Armor for ARCHIE-DATA-COVERAGE DC-1 — FEMA flood (no browser).
 * Run: node scripts/test-data-coverage-dc1.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");
const require = createRequire(import.meta.url);

/* Prefer compiled-free TS via dynamic import of source through tsx if available;
   otherwise assert from source text + pure helpers duplicated for armor. */

const doc = read("docs/shi/ARCHIE-DATA-COVERAGE.md");
assert.match(doc, /DC-1 Flood/);
assert.match(doc, /userReveal/);
assert.match(doc, /FEMA NFHL/);
assert.match(doc, /5/);
assert.match(doc, /DC-5/);
assert.match(doc, /retract/i);
assert.match(doc, /ATTOM/);
assert.match(doc, /Do not buy|do not buy|Paid stop/i);

const floodSrc = read("src/lib/shi/flood-fema.ts");
assert.match(floodSrc, /flood-fema-v1/);
assert.match(floodSrc, /fetchFloodAtPoint/);
assert.match(floodSrc, /userReveal/);
assert.match(floodSrc, /isFloodCoverageReady/);
assert.match(floodSrc, /hazards\.fema\.gov/);
assert.match(floodSrc, /NFHL/);
assert.doesNotMatch(floodSrc, /attom|regrid|zoneomics/i);

const tierSrc = read("src/lib/shi/evidence-tier.ts");
assert.match(tierSrc, /KNOWN/);
assert.match(tierSrc, /VERIFY/);
assert.match(tierSrc, /UNKNOWN/);
assert.match(tierSrc, /CALCULATED/);

const route = read("src/app/api/shi/flood/route.ts");
assert.match(route, /fetchFloodAtPoint/);
assert.match(route, /requireStoryPro/);
assert.match(route, /isLaunchCorridorFips/);

const panel = read(
  "src/components/broker/intelligence/ShiFloodEvidencePanel.tsx",
);
assert.match(panel, /userReveal/);
assert.match(panel, /data-flood-evidence/);
assert.match(panel, /ShiEvidenceHeader/);
assert.match(panel, /ShiEvidenceSource/);

const chip = read(
  "src/components/broker/intelligence/ShiEvidenceChip.tsx",
);
assert.match(chip, /data-evidence-tier/);
assert.match(chip, /data-evidence-asof/);
assert.match(chip, /data-evidence-source/);

const research = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(research, /shiFloodAtPoint/);
assert.match(research, /ShiFloodEvidencePanel/);

const corridors = read(
  "src/components/broker/intelligence/ShiCorridorsView.tsx",
);
assert.match(corridors, /data-data-coverage="dc-[1234]"/);
assert.match(corridors, /shiFloodAtPoint/);
assert.match(corridors, /ShiFloodEvidencePanel/);

const client = read("src/lib/shi/client.ts");
assert.match(client, /shiFloodAtPoint/);
assert.match(client, /\/api\/shi\/flood/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /ARCHIE-DATA-COVERAGE/);
assert.match(waves, /DC-1/);

const pkg = read("package.json");
assert.match(pkg, /test:data-coverage-dc1/);

/* Pure helper checks — mirror normalize / sfha / headline logic from source */
function sfhaFromFlag(raw) {
  if (!raw) return "unknown";
  const u = String(raw).trim().toUpperCase();
  if (u === "T" || u === "TRUE" || u === "Y" || u === "YES") return "yes";
  if (u === "F" || u === "FALSE" || u === "N" || u === "NO") return "no";
  return "unknown";
}

function normalizeFloodAttributes(attrs) {
  if (!attrs) {
    return { zone: null, zoneSubtype: null, sfha: "unknown", dfirmId: null };
  }
  const zone =
    typeof attrs.FLD_ZONE === "string" && attrs.FLD_ZONE.trim()
      ? attrs.FLD_ZONE.trim()
      : null;
  const zoneSubtype =
    typeof attrs.ZONE_SUBTY === "string" && attrs.ZONE_SUBTY.trim()
      ? attrs.ZONE_SUBTY.trim()
      : null;
  const sfha = sfhaFromFlag(
    typeof attrs.SFHA_TF === "string" ? attrs.SFHA_TF : null,
  );
  const dfirmId =
    typeof attrs.DFIRM_ID === "string" && attrs.DFIRM_ID.trim()
      ? attrs.DFIRM_ID.trim()
      : null;
  return { zone, zoneSubtype, sfha, dfirmId };
}

const x = normalizeFloodAttributes({
  FLD_ZONE: "X",
  SFHA_TF: "F",
  ZONE_SUBTY: "AREA OF MINIMAL FLOOD HAZARD",
  DFIRM_ID: "48373C",
});
assert.equal(x.zone, "X");
assert.equal(x.sfha, "no");
assert.equal(x.dfirmId, "48373C");

const ae = normalizeFloodAttributes({
  FLD_ZONE: "AE",
  SFHA_TF: "T",
  ZONE_SUBTY: null,
});
assert.equal(ae.sfha, "yes");
assert.equal(ae.zone, "AE");

assert.equal(sfhaFromFlag("T"), "yes");
assert.equal(sfhaFromFlag("F"), "no");

/* Live FEMA smoke (optional network) — fail soft if offline */
const LIVE = process.env.DC1_LIVE_FEMA === "1";
if (LIVE) {
  const url =
    "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?geometry=-94.78%2C30.71&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE%2CSFHA_TF&returnGeometry=false&f=json";
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  assert.equal(res.ok, true);
  const body = await res.json();
  assert.ok(Array.isArray(body.features));
  assert.ok(body.features.length >= 1);
  console.log("dc1 live FEMA smoke: ok", body.features[0]?.attributes);
}

console.log("data-coverage-dc1 armor: ok");
