/**
 * Armor for STORY-GLASS Phase A/B (no browser).
 * Run: node scripts/test-story-glass-ab.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const css = read("src/app/globals.css");
assert.match(css, /--env-0/);
assert.match(css, /--env-1/);
assert.match(css, /--env-2/);
assert.match(css, /--glass-bg/);
assert.match(css, /--glass-blur/);
assert.match(css, /--type-brand/);
assert.match(css, /--story-header-h/);
assert.match(css, /--story-bottom-clearance/);
assert.match(css, /\.story-glass\b/);
assert.match(css, /\.story-glass-nav\b/);
assert.match(css, /prefers-reduced-transparency/);
assert.doesNotMatch(css, /#7c3aed|#a855f7/i);

// Navy remains brand; background is env-based (not painted navy wall)
assert.match(css, /--background:\s*var\(--env-0\)/);
assert.match(css, /--navy:\s*#17335e/);
assert.match(css, /--gold:\s*#f5b71e/);

const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /useLivingHeader/);
assert.match(nav, /story-glass-nav/);
assert.match(nav, /story-living-tagline/);
assert.match(nav, /story-living-mark/);
assert.match(nav, /--story-header-h/);
assert.match(nav, /--story-bottom-nav-h/);

const hook = read("src/hooks/useLivingHeader.ts");
assert.match(hook, /hysteresis|LivingHeaderState/);
assert.match(hook, /capture:\s*true/);

const market = read("src/components/MarketplaceView.tsx");
assert.match(market, /--story-header-h/);
assert.match(market, /--story-bottom-clearance/);

const plan = read("docs/shi/STORY-GLASS.md");
assert.match(plan, /Phase A/);
assert.match(plan, /Phase B/);
assert.match(plan, /Story Glass/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /STORY-GLASS-AB/);
assert.match(waves, /id:\s*"STORY-GLASS-AB"/);

console.log("story-glass-ab armor: ok");
