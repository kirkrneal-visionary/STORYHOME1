/**
 * Armor for the site-wide UI typography system.
 * Run: node scripts/test-typography-system.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const css = read("src/app/globals.css");
assert.match(css, /--font-ui:\s*system-ui/);
assert.match(css, /--type-hero/);
assert.match(css, /--type-page/);
assert.match(css, /--type-caption/);
assert.match(css, /\.type-hero/);
assert.match(css, /\.story-wordmark/);
assert.match(css, /\.type-evidence/);
assert.match(css, /--page-gutter/);
assert.match(css, /--control-min/);
assert.doesNotMatch(css, /--font-poppins|--font-fraunces|--font-ibm-plex/);
assert.match(css, /maplibregl-popup-content/);

const layout = read("src/app/layout.tsx");
assert.doesNotMatch(layout, /next\/font|Fraunces|Poppins|IBM_Plex/);

const tokens = read("src/lib/typography.ts");
assert.match(tokens, /system-ui/);
assert.match(tokens, /Noto Sans/);
assert.match(tokens, /KNOWN/);

const selector = read(
  "src/components/broker/intelligence/ShiResearchModeSelector.tsx",
);
assert.match(selector, /data-research-mode-selector/);
assert.match(selector, /RESEARCH_MODE_LIST/);
assert.doesNotMatch(selector, /min-h-\[168px\]/);
for (const id of [
  "general",
  "multifamily",
  "land_development",
  "gas_station",
  "strip_center",
  "medical_office",
  "energy_rei",
]) {
  assert.match(read("src/lib/shi/research-modes.ts"), new RegExp(id));
}

const portal = read("src/components/broker/BrokerPortal.tsx");
assert.match(portal, /type-page-title/);
assert.doesNotMatch(portal, /font-serif text-3xl/);

const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /story-wordmark/);
assert.match(nav, /Every home has a story/);

const map = read("src/lib/map-style.ts");
assert.match(map, /Noto Sans Bold/);
assert.match(map, /Do not substitute CSS --font-ui/);

const chip = read("src/components/broker/intelligence/ShiEvidenceChip.tsx");
assert.match(chip, /type-evidence/);
assert.match(chip, /data-evidence-tier/);

console.log("typography-system armor: ok");
