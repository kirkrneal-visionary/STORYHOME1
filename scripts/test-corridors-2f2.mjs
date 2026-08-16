/**
 * Armor for Corridors 2.0-F2 — Ask deepen (desk facts, no new GIS).
 * Run: node scripts/test-corridors-2f2.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/ARCHIE-CORRIDORS-2.md");
assert.match(doc, /C2\.0-F2/);
assert.match(doc, /Ask deepen|desk facts/i);
assert.match(doc, /distance TBD|not surveyed intersection distance/i);

const ask = read("src/lib/shi/corridor-ask.ts");
assert.match(ask, /corridor-ask-v1\.1/);
assert.match(ask, /parcel_frontage/);
assert.match(ask, /parcel_intersection/);
assert.match(ask, /parcel_confidence/);
assert.match(ask, /parcel_exposure/);
assert.match(ask, /askIntersectionLabel/);
assert.match(ask, /scoreCommercialExposure/);
assert.match(ask, /never invents/);
assert.match(ask, /distance TBD|not surveyed intersection distance/i);
assert.doesNotMatch(ask, /openai|anthropic|gpt-4/i);

const view = read("src/components/broker/intelligence/ShiCorridorsView.tsx");
assert.match(view, /data-corridors-version="c2-0-f2"/);
assert.match(view, /data-corridor-ask-chips/);
assert.match(view, /CORRIDOR_ASK_INTENTS/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /C2\.0-F2|F2/);

const pkg = read("package.json");
assert.match(pkg, /test:corridors-2f2/);

const ids = (ask.match(/id: "[a-z_]+"/g) || []).map((s) =>
  s.replace(/id: "|\"/g, ""),
);
assert.ok(ids.includes("parcel_frontage"));
assert.ok(ids.includes("parcel_intersection"));
assert.ok(ids.includes("parcel_confidence"));
assert.ok(ids.includes("parcel_exposure"));
assert.ok(ids.length >= 11, `expected ≥11 intents, got ${ids.length}`);

console.log("corridors-2f2 armor: ok");
