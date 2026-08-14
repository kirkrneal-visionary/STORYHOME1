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

const engine = read("src/lib/sound/engine.ts");
assert.match(engine, /AudioContext/);
assert.match(engine, /playStorySound/);
assert.match(engine, /unlockStorySound/);
assert.doesNotMatch(engine, /\.mp3|\.wav|\.ogg/);

const provider = read("src/components/sound/SoundProvider.tsx");
assert.match(provider, /SoundProvider/);
assert.match(provider, /prefers-reduced-motion/);
assert.match(provider, /enabled = !reducedMotion/);
assert.match(provider, /data-story-sound/);
assert.match(provider, /play\("study"/);
assert.doesNotMatch(provider, /setEnabled/);
assert.match(provider, /removeItem\(SOUND_STORAGE_KEY\)/);

const providers = read("src/components/Providers.tsx");
assert.match(providers, /SoundProvider/);
assert.match(providers, /MotionProvider/);

const settings = read("src/components/settings/SettingsView.tsx");
assert.doesNotMatch(settings, /Story Glass sound/);
assert.doesNotMatch(settings, /setEnabled|sound\.preview/);
assert.doesNotMatch(settings, /Turn Story Glass sound off/);

const inquire = read("src/components/marketplace/InquireButton.tsx");
assert.match(inquire, /play\("success"/);

const home = read("src/components/home/HomeSearchHero.tsx");
assert.match(home, /data-story-sound="tap"/);

const plan = read("docs/shi/STORY-GLASS.md");
assert.match(plan, /Phase G/);
assert.match(plan, /always on|permanent|no mute/i);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /STORY-GLASS-G/);

console.log("story-glass-g armor: ok");
