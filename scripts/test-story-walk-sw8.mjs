/**
 * Armor for STORY-WALK SW-8 — share Story Walk film + encode harden (no browser).
 * Run: node scripts/test-story-walk-sw8.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const share = read("src/lib/story-walk/share.ts");
assert.match(share, /shareStoryWalkFilm/);
assert.match(share, /canShareStoryWalkFile/);
assert.match(share, /native-file/);
assert.match(share, /navigator\.share/);
assert.match(share, /files:\s*\[file\]/);
assert.match(share, /clipboard/);

const render = read("src/lib/story-walk/render.ts");
assert.match(render, /storyWalkRecordSupport/);
assert.match(render, /requestData/);
assert.match(render, /empty file|blob\.size/);
assert.match(render, /codecs=vp8/);
assert.doesNotMatch(render, /getDisplayMedia|desktopCapture/);

const composer = read("src/components/agents/StoryWalkComposer.tsx");
assert.match(composer, /data-story-walk-share/);
assert.match(composer, /shareStoryWalkFilm/);
assert.match(composer, /story_walk_shared/);
assert.match(composer, /storyWalkRecordSupport/);
assert.match(composer, /Share film/);

const catalog = read("src/lib/analytics/events.ts");
assert.match(catalog, /story_walk_shared/);
assert.match(catalog, /native-file/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /SW-8/);

const walkDoc = read("docs/shi/STORY-WALK.md");
assert.match(walkDoc, /SW-8/);

console.log("story-walk-sw8 armor: ok");
