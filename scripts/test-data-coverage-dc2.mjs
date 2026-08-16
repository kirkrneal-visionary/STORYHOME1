/**
 * Armor for ARCHIE-DATA-COVERAGE DC-2 — PUCT utilities CCN (no browser).
 * Run: node scripts/test-data-coverage-dc2.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/ARCHIE-DATA-COVERAGE.md");
assert.match(doc, /DC-2 Utilities/);
assert.match(doc, /PUCT/);
assert.match(doc, /CCN/);

const dataPath = join(root, "data/shi/puct-ccn-launch7.json");
assert.ok(existsSync(dataPath), "missing puct-ccn-launch7.json");
const data = JSON.parse(readFileSync(dataPath, "utf8"));
assert.equal(data.version, "puct-ccn-launch7-v1");
assert.ok(Array.isArray(data.features));
assert.ok(data.features.length > 100, "clip too thin");
assert.ok(data.features.some((f) => f.properties?.kind === "water"));
assert.ok(data.features.some((f) => f.properties?.kind === "sewer"));

const lib = read("src/lib/shi/utilities-ccn.ts");
assert.match(lib, /utilities-ccn-v1/);
assert.match(lib, /fetchUtilitiesAtPoint/);
assert.match(lib, /userReveal/);
assert.match(lib, /puct-ccn-launch7/);
assert.doesNotMatch(lib, /attom|regrid|zoneomics/i);

const route = read("src/app/api/shi/utilities/route.ts");
assert.match(route, /fetchUtilitiesAtPoint/);
assert.match(route, /requireStoryPro/);

const panel = read(
  "src/components/broker/intelligence/ShiUtilitiesEvidencePanel.tsx",
);
assert.match(panel, /userReveal/);
assert.match(panel, /data-utilities-evidence/);

const research = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(research, /shiUtilitiesAtPoint/);
assert.match(research, /ShiUtilitiesEvidencePanel/);

const corridors = read(
  "src/components/broker/intelligence/ShiCorridorsView.tsx",
);
assert.match(corridors, /data-data-coverage="dc-[12345]"/);
assert.match(corridors, /shiUtilitiesAtPoint/);
assert.match(corridors, /ShiUtilitiesEvidencePanel/);

const client = read("src/lib/shi/client.ts");
assert.match(client, /shiUtilitiesAtPoint/);
assert.match(client, /\/api\/shi\/utilities/);

const sources = read("src/lib/shi/corridor-sources.ts");
assert.match(sources, /utilities_infra/);
assert.match(sources, /utilitiesAvailable/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /DC-2/);

const pkg = read("package.json");
assert.match(pkg, /test:data-coverage-dc2/);

/* Pure headline helpers mirrored */
function headlineForUtilities({ water, sewer }) {
  const w = water[0];
  const s = sewer[0];
  if (w && s) {
    const same = (w.utility || "").toUpperCase() === (s.utility || "").toUpperCase();
    if (same && w.utility) return `Water + sewer certificated · ${w.utility}`;
    return `Water · ${w.utility || w.ccnNo || "CCN"} · Sewer · ${s.utility || s.ccnNo || "CCN"}`;
  }
  if (w) return `Water certificated · ${w.utility || w.ccnNo || "CCN"}`;
  if (s) return `Sewer certificated · ${s.utility || s.ccnNo || "CCN"}`;
  return "No PUCT water/sewer CCN area at this point";
}

assert.match(
  headlineForUtilities({
    water: [{ utility: "CITY OF LUFKIN", ccnNo: "10355" }],
    sewer: [{ utility: "CITY OF LUFKIN", ccnNo: "20142" }],
  }),
  /Water \+ sewer certificated · CITY OF LUFKIN/,
);
assert.equal(
  headlineForUtilities({ water: [], sewer: [] }),
  "No PUCT water/sewer CCN area at this point",
);

console.log("data-coverage-dc2 armor: ok");
