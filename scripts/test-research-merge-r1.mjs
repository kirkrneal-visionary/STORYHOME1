/**
 * Armor for ARCHIE-RESEARCH-MERGE R1 — Access in Research + readable map tools.
 * Run: node scripts/test-research-merge-r1.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const css = read("src/app/globals.css");
assert.match(css, /\.story-map-tool\b/);
assert.match(css, /\.story-map-tool-active\b/);
assert.match(css, /--navy/);
assert.match(css, /--gold/);
assert.match(css, /never navy-on-black|paper/);

const researchMap = read(
  "src/components/broker/intelligence/ShiResearchMap.tsx",
);
assert.match(researchMap, /story-map-tool/);
assert.match(researchMap, /data-research-access-traffic-tool/);
assert.match(researchMap, /research-access-segments/);
assert.match(researchMap, /onAccessTrafficToggle/);
assert.match(researchMap, /data-research-map-fallback|setMapFailed/);
assert.doesNotMatch(
  researchMap.split("story-map-tool")[0] + "MARKER",
  /bottom-12 left-3[\s\S]*text-navy hover:bg-navy/,
);

const corridorsMap = read(
  "src/components/broker/intelligence/ShiCorridorsMap.tsx",
);
assert.match(corridorsMap, /story-map-tool/);
assert.match(corridorsMap, /story-map-tool-active/);

const panel = read(
  "src/components/broker/intelligence/ShiResearchAccessPanel.tsx",
);
assert.match(panel, /data-research-access="r1"/);
assert.match(panel, /formatApproxFrontageFt/);
assert.match(panel, /formatApproxIntersectionM/);
assert.match(panel, /Not a survey/);

const view = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(view, /ShiResearchAccessPanel/);
assert.match(view, /shiCorridorsParcelLocation/);
assert.match(view, /shiCorridorsTraffic/);
assert.match(view, /accessTrafficOn/);
assert.match(view, /isLaunchCorridorFips/);

const nav = read("src/lib/navigation/networks.ts");
assert.match(nav, /label: "Research"/);
assert.match(nav, /Access desk is inside Research|soft-hidden/i);

const workspace = read(
  "src/components/broker/intelligence/ShiWorkspace.tsx",
);
assert.match(workspace, /mode.*access|mode=access/);
assert.match(workspace, /PropertyIntelligenceView/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /ARCHIE-RESEARCH-MERGE|R1/);

const pkg = read("package.json");
assert.match(pkg, /test:research-merge-r1/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /RESEARCH-MERGE|R1/);

console.log("research-merge-r1 armor: ok");
