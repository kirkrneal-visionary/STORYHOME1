/**
 * Armor for STORY-GLASS Phase E (Story Pro work) — no browser.
 * Run: node scripts/test-story-glass-e.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const portal = read("src/components/broker/BrokerPortal.tsx");
assert.match(portal, /story-chrome/);
assert.match(portal, /--story-header-h/);
assert.match(portal, /--story-bottom-clearance/);
assert.doesNotMatch(portal, /: "pt-\[96px\]"/);
assert.match(portal, /pt-\[128px\]/); // Archie ribbon — Phase F

const settings = read("src/components/settings/SettingsView.tsx");
assert.match(settings, /--story-header-h/);
assert.match(settings, /--story-bottom-clearance/);
assert.doesNotMatch(settings, /pt-\[96px\]|pt-\[120px\]|pb-24/);

const paused = read("src/components/ShellPausedView.tsx");
assert.match(paused, /--story-header-h/);
assert.doesNotMatch(paused, /pt-\[88px\]/);

const buyers = read("src/components/broker/MyBuyersView.tsx");
assert.match(buyers, /story-well/);
assert.doesNotMatch(
  buyers,
  /rounded-xl border border-dashed border-hairline bg-\[var\(--surface\)\]/,
);

const sellers = read("src/components/broker/MySellersView.tsx");
assert.doesNotMatch(
  sellers,
  /rounded-xl border border-dashed border-hairline bg-\[var\(--surface\)\]/,
);

const shared = read("src/components/broker/SharedHomesView.tsx");
assert.doesNotMatch(
  shared,
  /rounded-xl border border-dashed border-hairline bg-\[var\(--surface\)\]/,
);

const community = read("src/components/broker/CommunityView.tsx");
assert.match(community, /story-well/);

const cadMap = read("src/components/broker/ListingCadMap.tsx");
assert.match(cadMap, /story-glass/);
assert.doesNotMatch(cadMap, /MAP_PAPER/);

const plan = read("docs/shi/STORY-GLASS.md");
assert.match(plan, /Phase E/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /STORY-GLASS-E/);
assert.match(waves, /ARCHIE_CURRENT_WAVE\s*=\s*"STORY-GLASS-E"/);

console.log("story-glass-e armor: ok");
