/**
 * Armor for STORY-WALK SW-2 — Living Mark media library (no browser).
 * Run: node scripts/test-story-walk-sw2.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const lib = read("src/lib/living-mark/library.ts");
assert.match(lib, /uploadLivingMarkFromLibrary/);
assert.match(lib, /living-marks/);
assert.match(lib, /writeDemoLivingMark/);

const card = read("src/components/settings/LivingMarkLibraryCard.tsx");
assert.match(card, /data-living-mark-library/);
assert.match(card, /accept="image\/\*,video\/\*"/);
assert.match(card, /Choose from library/);
assert.doesNotMatch(card, /controls/);

const settings = read("src/components/settings/SettingsView.tsx");
assert.match(settings, /LivingMarkLibraryCard/);
assert.doesNotMatch(settings, /label="Photo URL"/);

const migration = read("supabase/migrations/0032_living_marks.sql");
assert.match(migration, /living_mark_video_url/);
assert.match(migration, /living-marks/);

const profile = read("src/lib/supabase/profile.ts");
assert.match(profile, /livingMarkVideoUrl/);
assert.match(profile, /living_mark_video_url/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /SW-2/);

console.log("story-walk-sw2 armor: ok");
