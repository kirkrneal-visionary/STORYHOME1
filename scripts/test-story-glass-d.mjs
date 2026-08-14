/**
 * Armor for STORY-GLASS Phase D (Home / social) — no browser.
 * Run: node scripts/test-story-glass-d.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const home = read("src/components/home/HomeSearchHero.tsx");
assert.match(home, /brand-word/);
assert.match(home, />STORY</);
assert.match(home, />HOME</);
assert.match(home, /story-glass/);
assert.match(home, /--story-header-h|--story-bottom-clearance/);
assert.doesNotMatch(home, /navy\)_78%/);

const saved = read("src/app/saved/page.tsx");
assert.match(saved, /--story-header-h|--story-safe-top/);
assert.doesNotMatch(saved, /pt-\[72px\]/);

const suite = read("src/app/saved/[suiteId]/page.tsx");
assert.match(suite, /--story-header-h|--story-safe-top/);
assert.doesNotMatch(suite, /pt-\[72px\]/);

const player = read("src/components/suites/SuitePlayer.tsx");
assert.match(player, /story-surface|story-well/);
assert.match(player, /--story-bottom-clearance/);
assert.doesNotMatch(player, /rounded-2xl border border-hairline bg-\[var\(--surface\)\]/);

const following = read("src/app/following/page.tsx");
assert.match(following, /--story-header-h|--story-safe-top/);
assert.match(following, /--story-bottom-clearance/);
assert.match(following, /story-well|story-surface/);
assert.doesNotMatch(following, /pt-\[96px\]/);

const network = read("src/components/NetworkView.tsx");
assert.match(network, /--story-header-h|--story-safe-top/);
assert.match(network, /--story-bottom-clearance/);
assert.match(network, /story-glass|story-surface|story-well/);
assert.doesNotMatch(network, /pt-\[96px\]/);

const agents = read("src/app/agents/[id]/page.tsx");
assert.match(agents, /--story-header-h|--story-safe-top/);
assert.match(agents, /env-1|story-well/);
assert.doesNotMatch(agents, /bg-navy md:h-52|pt-\[72px\]/);

const profile = read("src/app/profile/page.tsx");
assert.match(profile, /--story-header-h|--story-safe-top/);
assert.doesNotMatch(profile, /pt-\[96px\]/);

const plan = read("docs/shi/STORY-GLASS.md");
assert.match(plan, /Phase D/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /STORY-GLASS-D/);
assert.match(waves, /id:\s*"STORY-GLASS-D"/);

console.log("story-glass-d armor: ok");
