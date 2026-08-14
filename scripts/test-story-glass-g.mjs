/**
 * Armor for STORY-GLASS Phase G (Feedback · sound) — no browser audio.
 * Run: node scripts/test-story-glass-g.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const cues = read("src/lib/sound/cues.ts");
assert.match(cues, /StorySoundCue/);
assert.match(cues, /"enter"/);
assert.match(cues, /"study"/);
assert.match(cues, /"success"/);
assert.match(cues, /SOUND_MASTER_GAIN/);
assert.match(cues, /SOUND_STORAGE_KEY/);

const engine = read("src/lib/sound/engine.ts");
assert.match(engine, /AudioContext/);
assert.match(engine, /playStorySound/);
assert.match(engine, /unlockStorySound/);
assert.match(engine, /previewStorySoundSuite/);
assert.doesNotMatch(engine, /\.mp3|\.wav|\.ogg/);

const provider = read("src/components/sound/SoundProvider.tsx");
assert.match(provider, /SoundProvider/);
assert.match(provider, /prefers-reduced-motion/);
assert.match(provider, /localStorage/);
assert.match(provider, /data-story-sound/);
assert.match(provider, /play\("study"/);

const providers = read("src/components/Providers.tsx");
assert.match(providers, /SoundProvider/);
assert.match(providers, /MotionProvider/);

const settings = read("src/components/settings/SettingsView.tsx");
assert.match(settings, /Story Glass sound/);
assert.match(settings, /useStorySoundOptional|sound\.preview/);
assert.match(settings, /data-story-sound-settings|Experience/);

const inquire = read("src/components/marketplace/InquireButton.tsx");
assert.match(inquire, /play\("success"/);

const home = read("src/components/home/HomeSearchHero.tsx");
assert.match(home, /data-story-sound="tap"/);

const plan = read("docs/shi/STORY-GLASS.md");
assert.match(plan, /Phase G/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /STORY-GLASS-G/);
assert.match(waves, /ARCHIE_CURRENT_WAVE\s*=\s*"STORY-GLASS-G"/);

console.log("story-glass-g armor: ok");
