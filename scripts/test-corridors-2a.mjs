/**
 * Armor for Corridors 2.0-A — language + hierarchy (no browser).
 * Run: node scripts/test-corridors-2a.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/ARCHIE-CORRIDORS-2.md");
assert.match(doc, /C2\.0-A/);
assert.match(doc, /traffic-intensity-v1/);
assert.match(doc, /corridor-status-v1/);
assert.match(doc, /Do not rebuild/);
assert.match(doc, /vehicles \/ day/i);
assert.match(doc, /Find Strongest Sites/);

const lang = read("src/lib/shi/corridor-language.ts");
assert.match(lang, /CORRIDORS_2_PURPOSE/);
assert.match(lang, /AADT_EXPLAINER_V1/);
assert.match(lang, /trafficIntensityClass/);
assert.match(lang, /corridorStatusFromHistory/);
assert.match(lang, /traffic-intensity-v1/);
assert.match(lang, /corridor-status-v1/);
assert.match(lang, /rapidly_growing/);
assert.match(lang, /TRAFFIC_INTENSITY_COLOR/);

/* Pure rule units (mirror of corridor-language.ts) */
function trafficIntensityClass(n) {
  if (!Number.isFinite(n) || n < 5000) return "lower";
  if (n < 15000) return "moderate";
  if (n < 30000) return "high";
  return "very_high";
}
function corridorStatusFromHistory(history) {
  const vals = history
    .filter((h) => h.aadt != null && Number.isFinite(h.aadt))
    .map((h) => h.aadt);
  if (vals.length < 2) return "limited_history";
  const newest = vals[0];
  const oldest = vals[vals.length - 1];
  if (oldest <= 0) return "limited_history";
  const pct = ((newest - oldest) / oldest) * 100;
  if (pct >= 20) return "rapidly_growing";
  if (pct >= 8) return "growing";
  if (pct <= -8) return "declining";
  return "stable";
}

assert.equal(trafficIntensityClass(1200), "lower");
assert.equal(trafficIntensityClass(8000), "moderate");
assert.equal(trafficIntensityClass(20000), "high");
assert.equal(trafficIntensityClass(35000), "very_high");
assert.equal(
  corridorStatusFromHistory([
    { year: 2025, aadt: 30000 },
    { year: 2021, aadt: 20000 },
  ]),
  "rapidly_growing",
);
assert.equal(
  corridorStatusFromHistory([
    { year: 2025, aadt: 11000 },
    { year: 2021, aadt: 10000 },
  ]),
  "growing",
);
assert.equal(
  corridorStatusFromHistory([
    { year: 2025, aadt: 10000 },
    { year: 2021, aadt: 10100 },
  ]),
  "stable",
);
assert.equal(
  corridorStatusFromHistory([
    { year: 2025, aadt: 8000 },
    { year: 2021, aadt: 10000 },
  ]),
  "declining",
);
assert.equal(corridorStatusFromHistory([{ year: 2025, aadt: 10000 }]), "limited_history");

const view = read("src/components/broker/intelligence/ShiCorridorsView.tsx");
assert.match(view, /CORRIDORS_2_PURPOSE/);
assert.match(view, /Vehicles \/ day/);
assert.match(view, /What does this mean/);
assert.match(view, /AADT_EXPLAINER_V1/);
assert.match(view, /corridorStatusFromHistory/);
assert.match(view, /data-corridors-version="c2-0-[abcd]"/);

const map = read("src/components/broker/intelligence/ShiCorridorsMap.tsx");
assert.match(map, /traffic-intensity-v1/);
assert.match(map, /"step"/);
assert.match(map, /30000/);
assert.match(map, /function aadtColorExpr[\s\S]*?"step"/);

const scenario = read(
  "src/components/broker/intelligence/ShiCorridorsScenarioBoard.tsx",
);
assert.match(scenario, /vehicles \/ day/);
assert.match(scenario, /scenarios, not forecasts/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /ARCHIE-CORRIDORS-2/);
assert.match(waves, /C2\.0-A/);

console.log("corridors-2a armor: ok");
