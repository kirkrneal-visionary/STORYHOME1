/**
 * Armor for STORY-WALK SW-7 — Story Walk compositor (no browser MediaRecorder).
 * Run: node scripts/test-story-walk-sw7.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const types = read("src/lib/story-walk/types.ts");
assert.match(types, /STORY_WALK_WIDTH\s*=\s*1920/);
assert.match(types, /STORY_WALK_HEIGHT\s*=\s*1080/);
assert.match(types, /STORY_WALK_DEFAULT_LISTING_COUNT\s*=\s*3/);
assert.match(types, /STORY_WALK_IMAGES_PER_LISTING\s*=\s*5/);
assert.match(types, /StoryWalkComposeInput/);
assert.match(types, /StoryWalkListingPick/);

const render = read("src/lib/story-walk/render.ts");
assert.match(render, /renderStoryWalkFilm/);
assert.match(render, /downloadBlob/);
assert.match(render, /MediaRecorder/);
assert.match(render, /captureStream/);
assert.match(render, /Living Mark/);
assert.match(render, /drawTitleCard|Opening title/);
assert.match(render, /not OS screen-grab|renderer/);
assert.doesNotMatch(render, /getDisplayMedia|desktopCapture/);

const demo = read("src/lib/story-walk/demo-assets.ts");
assert.match(demo, /demoStillDataUrl|createDemoListingStill/);

const composer = read("src/components/agents/StoryWalkComposer.tsx");
assert.match(composer, /data-story-walk-composer/);
assert.match(composer, /data-story-walk-export/);
assert.match(composer, /renderStoryWalkFilm/);
assert.match(composer, /loadLivingMark/);
assert.match(composer, /story_walk_exported/);
assert.match(composer, /STORY_WALK_MAX_LISTING_COUNT/);

const world = read("src/components/agents/AgentWorldView.tsx");
assert.match(world, /StoryWalkComposer/);
assert.match(world, /isOwn/);

const catalog = read("src/lib/analytics/events.ts");
assert.match(catalog, /story_walk_exported/);
assert.match(catalog, /listing_count/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /SW-7/);

const walkDoc = read("docs/shi/STORY-WALK.md");
assert.match(walkDoc, /SW-7/);

console.log("story-walk-sw7 armor: ok");
