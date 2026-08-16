/**
 * Armor for STORY-WALK SW-1 — Agent World shell (no browser).
 * Run: node scripts/test-story-walk-sw1.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/STORY-WALK.md");
assert.match(doc, /Story Walk/);
assert.match(doc, /Living Mark/);
assert.match(doc, /SW-1/);

const view = read("src/components/agents/AgentWorldView.tsx");
assert.match(view, /data-story-agent-world/);
assert.match(view, /LivingMarkPresence|data-living-mark/);
assert.match(view, /story-bottom-clearance/);
assert.match(view, /story-safe-top/);
/* No visitor media-player chrome on the mark (presence component owns video) */
const presence = read("src/components/agents/LivingMarkPresence.tsx");
assert.match(presence, /data-living-mark/);
assert.doesNotMatch(presence, /\bcontrols[={\s]/);
assert.doesNotMatch(presence, /PlayCircle|PauseCircle/);

const page = read("src/app/agents/[id]/page.tsx");
assert.match(page, /AgentWorldView/);
assert.match(page, /photo_url/);
assert.match(page, /demoAgentForId|DEMO_AGENT/);

const map = read("src/lib/listings-map.ts");
assert.match(map, /photo_url/);
assert.match(map, /photoUrl/);

const demo = read("src/lib/demo-data.ts");
assert.match(demo, /photoUrl/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /STORY-WALK-SW-1|STORY-WALK/);
assert.match(waves, /ARCHIE_CURRENT_WAVE/);

console.log("story-walk-sw1 armor: ok");
