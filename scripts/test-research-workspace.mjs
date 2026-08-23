/**
 * Research Workspace armor — map-first room, same data wiring.
 * Run: node scripts/test-research-workspace.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const ws = read("src/lib/shi/research-workspace.ts");
assert.match(ws, /research-workspace-v1/);
assert.match(ws, /collapsed/);
assert.match(ws, /peek/);
assert.match(ws, /half/);
assert.match(ws, /expanded/);
assert.match(ws, /writeWorkspaceSnapshot/);

const view = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(view, /data-research-workspace/);
assert.match(view, /ShiIntelligenceSheet/);
assert.match(view, /ShiWorkspaceBar/);
assert.match(view, /data-workspace-search/);
assert.match(view, /shiSearch/);
assert.match(view, /shiAnalyzeArea/);
assert.match(view, /shiAddProspect/);
assert.match(view, /ShiResearchAccessDesk/);
assert.match(view, /ShiMarketFramesPanel/);
assert.match(view, /ShiCountyChangeFeed/);
assert.match(view, /ShiMultifamilyRead/);
assert.match(view, /ShiResearchModeBanner/);
assert.match(view, /Find Strongest Sites|onFindStrongest/);
assert.match(view, /canDrawFrames/);
assert.doesNotMatch(view, /xl:grid-cols-\[280px_minmax\(0,1fr\)_340px\]/);

const bar = read(
  "src/components/broker/intelligence/ShiWorkspaceBar.tsx",
);
assert.match(bar, /data-workspace-bar/);
assert.match(bar, /data-workspace-exit/);
assert.match(bar, /Search property or area/);

const sheet = read(
  "src/components/broker/intelligence/ShiIntelligenceSheet.tsx",
);
assert.match(sheet, /data-intelligence-sheet/);
assert.match(sheet, /data-sheet-handle/);

const workspace = read(
  "src/components/broker/intelligence/ShiWorkspace.tsx",
);
assert.match(workspace, /inLiveWorkspace/);
assert.match(workspace, /ShiResearchModeSelector/);
assert.match(workspace, /PropertyIntelligenceView/);

const css = read("src/app/globals.css");
assert.match(css, /--story-workspace-top/);
assert.match(css, /\[data-research-workspace\]/);

const map = read("src/components/broker/intelligence/ShiResearchMap.tsx");
assert.match(map, /rectangle/);
assert.match(map, /freehand/);
assert.match(map, /radius/);
assert.match(map, /Layers/);
assert.match(map, /data-map-locate/);

const pkg = read("package.json");
assert.match(pkg, /test:research-workspace/);

{
  const r = spawnSync(process.execPath, ["scripts/test-research-modes.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, `research-modes\n${r.stdout}\n${r.stderr}`);
}

{
  const r = spawnSync(process.execPath, ["scripts/test-multifamily.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, `multifamily\n${r.stdout}\n${r.stderr}`);
}

console.log("research-workspace armor: ok");
