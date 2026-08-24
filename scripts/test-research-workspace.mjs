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
assert.match(ws, /research-workspace-v2/);
assert.match(ws, /collapsed/);
assert.match(ws, /peek/);
assert.match(ws, /expanded/);
assert.match(ws, /full/);
assert.doesNotMatch(ws, /"half"/);
assert.match(ws, /WORKSPACE_DRAWER_MIN_PX/);
assert.match(ws, /snapFromRelease/);
assert.match(ws, /workspaceLayout/);
assert.match(ws, /writeWorkspaceSnapshot/);

const view = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(view, /data-research-workspace/);
assert.match(view, /data-workspace-layout/);
assert.match(view, /data-map-pane/);
assert.match(view, /ShiResearchPanelHost/);
assert.match(view, /ShiWorkspaceBar/);
assert.match(view, /data-workspace-search/);
assert.match(view, /sheetCompact/);
assert.match(view, /data-sheet-detail/);
assert.match(view, /shiSearch/);
assert.doesNotMatch(view, /Open study/);
assert.doesNotMatch(
  view,
  /setSearchOpen\(\(v\) => !v\);\s*setSheetSnap\("expanded"\)/,
);
assert.match(view, /shiAnalyzeArea/);
assert.match(view, /shiAddProspect/);
assert.match(view, /ShiResearchAccessDesk/);
assert.match(view, /ShiMarketFramesPanel/);
assert.match(view, /ShiCountyChangeFeed/);
assert.match(view, /ShiMultifamilyRead/);
assert.match(view, /data-multifamily-landing/);
assert.match(view, /Find Strongest Sites|onFindStrongest/);
assert.match(view, /canDrawFrames/);
assert.match(view, /expandedMap/);
assert.match(view, /onToggleExpandedMap/);
assert.match(view, /onViewChange/);
assert.match(view, /data-property-identity/);
assert.doesNotMatch(view, /FIND THE GROUND BEHIND THE DOORS/);
assert.doesNotMatch(view, /xl:grid-cols-\[280px_minmax\(0,1fr\)_340px\]/);

const bar = read(
  "src/components/broker/intelligence/ShiWorkspaceBar.tsx",
);
assert.match(bar, /data-workspace-bar/);
assert.match(bar, /data-workspace-exit/);
assert.match(bar, /data-map-expand-toggle/);
assert.match(bar, /showExpand/);
assert.match(bar, /Search property or area/);
assert.match(bar, /h-11/);
assert.match(bar, /absolute inset-x-0 top-0/);
assert.doesNotMatch(bar, /border-b border-hairline bg-\[color-mix/);

const sheet = read(
  "src/components/broker/intelligence/ShiResearchBottomSheet.tsx",
);
assert.match(sheet, /data-intelligence-sheet/);
assert.match(sheet, /data-sheet-handle/);
assert.match(sheet, /data-sheet-drag/);
assert.match(sheet, /snapFromRelease/);
assert.match(sheet, /visualViewport/);
assert.match(sheet, /setPointerCapture/);
assert.match(sheet, /addEventListener\("pointermove"/);
assert.doesNotMatch(sheet, /onBodyPointerDown/);

const drawer = read(
  "src/components/broker/intelligence/ShiResearchDesktopDrawer.tsx",
);
assert.match(drawer, /data-intelligence-drawer/);
assert.match(drawer, /data-drawer-collapse/);
assert.match(drawer, /ShiResearchPanelHost/);

const frames = read(
  "src/components/broker/intelligence/ShiMarketFramesPanel.tsx",
);
assert.match(frames, /grid-cols-1/);
assert.doesNotMatch(frames, /lg:grid-cols-\[minmax\(220px/);
assert.doesNotMatch(frames, /xl:grid-cols-6/);

const workspace = read(
  "src/components/broker/intelligence/ShiWorkspace.tsx",
);
assert.match(workspace, /inLiveWorkspace/);
assert.match(workspace, /dataset.researchLive/);
assert.match(workspace, /ShiResearchModeSelector/);
assert.match(workspace, /PropertyIntelligenceView/);

const css = read("src/app/globals.css");
assert.match(css, /--story-workspace-top/);
assert.match(css, /\[data-research-workspace\]/);
assert.match(css, /data-research-live/);
assert.match(css, /data-workspace-stage/);
assert.match(css, /data-map-pane/);
assert.match(css, /data-map-expanded/);
assert.match(css, /flex-direction: column/);
assert.match(css, /html\[data-research-live\] \.story-route-page/);
assert.match(css, /will-change: auto/);
assert.match(css, /data-workspace-layout="sheet"/);
assert.match(css, /top: 0 !important/);
assert.match(css, /border-radius: 0 !important/);
assert.match(css, /story-bottom-dock/);
assert.match(css, /display: none !important/);
assert.match(css, /--workspace-bar-h/);
assert.match(css, /safe-area-inset-top/);
assert.match(css, /data-map-bottom-chrome/);
assert.match(css, /data-map-hint-kind="idle"/);
assert.match(css, /data-sheet-snap="peek"/);
assert.match(css, /--sheet-h: 26vh/);
assert.match(css, /calc\(100% - 7\.25rem\)/);
assert.match(css, /\[data-intelligence-drawer\] \[data-sheet-body\]/);
const style = read("src/lib/map-style.ts");
assert.match(style, /RESEARCH_DEM_SOURCE_ID/);
assert.match(style, /raster-dem/);
assert.match(style, /hillshade/);
assert.match(css, /overflow-x: hidden/);
assert.doesNotMatch(css, /top: 5\.35rem/);
assert.doesNotMatch(css, /5\.75rem/);
assert.match(view, /dataset.workspaceLayout/);
assert.match(view, /data-workspace-stage/);
assert.match(view, /data-sheet-snap/);

const map = read("src/components/broker/intelligence/ShiResearchMap.tsx");
assert.match(map, /rectangle/);
assert.match(map, /freehand/);
assert.match(map, /radius/);
assert.match(map, /Layers/);
assert.match(map, /data-map-locate/);
assert.match(map, /data-map-draw-tools/);
assert.match(map, /data-map-basemap/);
assert.match(map, /data-map-camera/);
assert.match(map, /data-map-camera-3d/);
assert.match(map, /applyResearchCamera/);
assert.match(map, /data-map-bottom-chrome/);
assert.match(map, /data-map-hint-kind/);
assert.doesNotMatch(map, /top-\[4\.5rem\]/);
assert.match(map, /resize: \(\) =>/);
assert.match(map, /onViewChange/);
assert.match(map, /moveend/);
assert.match(map, /rounded-none border-0/);
assert.doesNotMatch(map, /xl:right-\[min\(26rem/);

const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /xl:hidden/);
assert.match(nav, /xl:flex/);
assert.match(nav, /overflow-hidden/);

const footer = read("src/components/Footer.tsx");
assert.match(footer, /\/portal\/intelligence/);

const pkg = read("package.json");
assert.match(pkg, /test:research-workspace/);

{
  const r = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/test-research-workspace-math.ts"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(r.status, 0, `workspace-math\n${r.stdout}\n${r.stderr}`);
}

{
  const r = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/test-research-map-camera.ts"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(r.status, 0, `research-map-camera\n${r.stdout}\n${r.stderr}`);
}

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
