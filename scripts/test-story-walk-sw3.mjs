/**
 * Armor for STORY-WALK SW-3 — Living Mark presence (no browser).
 * Run: node scripts/test-story-walk-sw3.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const presence = read("src/components/agents/LivingMarkPresence.tsx");
assert.match(presence, /data-living-mark/);
assert.match(presence, /data-living-mark-video/);
assert.match(presence, /data-living-mark-nudge/);
assert.match(presence, /onEnded/);
assert.match(presence, /playsInline/);
assert.match(presence, /muted/);
assert.doesNotMatch(presence, /\bcontrols[={\s]/);
assert.doesNotMatch(presence, /PlayCircle|PauseCircle|scrubber/);

const world = read("src/components/agents/AgentWorldView.tsx");
assert.match(world, /LivingMarkPresence/);
assert.doesNotMatch(world, /LivingMarkStill/);

const nudge = read("src/lib/living-mark/nudge.ts");
assert.match(nudge, /shouldShowLivingMarkNudge/);
assert.match(nudge, /dismissLivingMarkNudge/);
assert.match(nudge, /WEEK_MS|7 \* 24/);

const page = read("src/app/agents/[id]/page.tsx");
assert.match(page, /living_mark_video_url/);

const map = read("src/lib/listings-map.ts");
assert.match(map, /livingMarkVideoUrl/);
assert.match(map, /living_mark_video_url/);

const demo = read("src/lib/demo-data.ts");
assert.match(demo, /livingMarkVideoUrl/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /SW-3/);

console.log("story-walk-sw3 armor: ok");
