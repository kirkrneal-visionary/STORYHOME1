/**
 * Armor for Corridors 2.0-F — Ask Archie canned intents (no browser / no LLM).
 * Run: node scripts/test-corridors-2f.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/ARCHIE-CORRIDORS-2.md");
assert.match(doc, /C2\.0-F/);
assert.match(doc, /Ask Archie/);
assert.match(doc, /\[x\].*LLM never invents/);
assert.match(doc, /\[x\].*At least 5 canned intents/);

const ask = read("src/lib/shi/corridor-ask.ts");
assert.match(ask, /corridor-ask-v1/);
assert.match(ask, /CORRIDOR_ASK_INTENTS/);
assert.match(ask, /answerCorridorAsk/);
assert.match(ask, /matchCorridorAskIntent/);
assert.match(ask, /never invents/);
assert.match(ask, /strongest_sites/);
assert.match(ask, /parcel_traffic/);
assert.match(ask, /corridor_growth/);
assert.match(ask, /high_traffic_roads/);
assert.match(ask, /growth_patterns/);
assert.match(ask, /explain_exposure/);
assert.match(ask, /compare_hint/);
assert.ok(
  (ask.match(/id: "/g) || []).length >= 5,
  "need at least 5 intent ids",
);

const view = read("src/components/broker/intelligence/ShiCorridorsView.tsx");
assert.match(view, /data-corridors-version="c2-0-f"/);
assert.match(view, /data-corridor-ask-panel/);
assert.match(view, /data-corridor-ask-chips/);
assert.match(view, /data-corridor-ask-answer/);
assert.match(view, /data-corridor-ask-missing/);
assert.match(view, /answerCorridorAsk/);
assert.match(view, /AskArchiePanel/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /C2\.0-F/);

const pkg = read("package.json");
assert.match(pkg, /test:corridors-2f/);

/* Intent count from source */
const intentCount = (ask.match(/id: "[a-z_]+"/g) || []).filter((s) =>
  /strongest|parcel|corridor_growth|high_traffic|growth_patterns|explain|compare/.test(
    s,
  ),
).length;
assert.ok(intentCount >= 5, `expected ≥5 intents, got ${intentCount}`);

console.log("corridors-2f armor: ok");
