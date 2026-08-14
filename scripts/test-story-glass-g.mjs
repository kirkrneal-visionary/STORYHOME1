/**
 * Armor for STORY-GLASS Phase G (Feedback · sound) — no browser audio.
 * Protects always-on original synthesis IP.
 * Run: node scripts/test-story-glass-g.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const cues = read("src/lib/sound/cues.ts");
assert.match(cues, /StorySoundCue/);
assert.match(cues, /"enter"/);
assert.match(cues, /"study"/);
assert.match(cues, /"success"/);
assert.match(cues, /SOUND_MASTER_GAIN/);
assert.match(cues, /STORY_GLASS_SOUND_IP/);
assert.match(cues, /ORIGINAL STORY HOME SYNTHESIS|proprietary presentation IP/);
assert.doesNotMatch(cues, /from ["'].*\.(mp3|wav|ogg)|src=["'].*\.(mp3|wav|ogg)|new Audio\(/i);

const engine = read("src/lib/sound/engine.ts");
assert.match(engine, /AudioContext/);
assert.match(engine, /playStorySound/);
assert.match(engine, /unlockStorySound/);
assert.match(engine, /ORIGINAL STORY HOME SYNTHESIS|proprietary presentation IP/);
assert.doesNotMatch(engine, /from ["'].*\.(mp3|wav|ogg)|src=["'].*\.(mp3|wav|ogg)|new Audio\(/i);
assert.doesNotMatch(engine, /howler|use-sound|soundjs/i);

const provider = read("src/components/sound/SoundProvider.tsx");
assert.match(provider, /SoundProvider/);
assert.match(provider, /prefers-reduced-motion/);
assert.match(provider, /enabled = !reducedMotion/);
assert.match(provider, /data-story-sound/);
assert.match(provider, /play\("study"/);
assert.match(provider, /STORY-GLASS-SOUND\.md/);
assert.doesNotMatch(provider, /setEnabled/);
assert.match(provider, /removeItem\(SOUND_STORAGE_KEY\)/);

const providers = read("src/components/Providers.tsx");
assert.match(providers, /SoundProvider/);
assert.match(providers, /MotionProvider/);

const settings = read("src/components/settings/SettingsView.tsx");
assert.doesNotMatch(settings, /Story Glass sound/);
assert.doesNotMatch(settings, /setEnabled|sound\.preview/);
assert.doesNotMatch(settings, /Turn Story Glass sound off/);
assert.doesNotMatch(settings, /data-story-sound-settings/);

const inquire = read("src/components/marketplace/InquireButton.tsx");
assert.match(inquire, /play\("success"/);

const home = read("src/components/home/HomeSearchHero.tsx");
assert.match(home, /data-story-sound="tap"/);

const plan = read("docs/shi/STORY-GLASS.md");
assert.match(plan, /Phase G/);
assert.match(plan, /always on|permanent|no mute/i);
assert.match(plan, /STORY-GLASS-SOUND/);
assert.match(plan, /Do not.*strip Story Glass sound|stock SFX/i);

const protect = read("docs/shi/STORY-GLASS-SOUND.md");
assert.match(protect, /proprietary|original/i);
assert.match(protect, /Always on/);
assert.match(protect, /Do not/);
assert.match(protect, /stock|third-party/i);

const constitution = read("docs/STORY-OS-CONSTITUTION.md");
assert.match(constitution, /Story Glass sound|STORY-GLASS-SOUND/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /STORY-GLASS-G/);

// No audio asset files sneaked into public/ or src/
function walkNoAudio(dir, depth = 0) {
  if (depth > 6) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".git" || e.name === ".next") {
      continue;
    }
    const p = join(dir, e.name);
    if (e.isDirectory()) walkNoAudio(p, depth + 1);
    else assert.doesNotMatch(e.name, /\.(mp3|wav|ogg|m4a|flac)$/i);
  }
}
walkNoAudio(join(root, "src"));
walkNoAudio(join(root, "public"));

console.log("story-glass-g armor: ok (sound IP protected)");
