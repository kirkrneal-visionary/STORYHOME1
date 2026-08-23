/**
 * Research Workspace — map-first session + layout math.
 * Presentation only. Parcel truth stays in existing Research state.
 *
 * Rule version: research-workspace-v2
 */

export const RESEARCH_WORKSPACE_VERSION = "research-workspace-v2" as const;
export const RESEARCH_WORKSPACE_STORAGE_KEY = "archie-research-workspace-v2";

/** Sheet below this width. Drawer at or above — usable workspace, not a device name. */
export const WORKSPACE_DRAWER_MIN_PX = 1080;

export const WORKSPACE_SHEET_SNAPS = [
  "collapsed",
  "peek",
  "expanded",
  "full",
] as const;

export type WorkspaceSheetSnap = (typeof WORKSPACE_SHEET_SNAPS)[number];

export type WorkspaceLayout = "sheet" | "drawer";

export type WorkspaceSheetContext =
  | "idle"
  | "property"
  | "frame"
  | "analysis"
  | "archie";

export type ResearchWorkspaceSnapshot = {
  version: typeof RESEARCH_WORKSPACE_VERSION;
  source: string;
  field?: string;
  query?: string;
  mapCenterLat?: number;
  mapCenterLng?: number;
  mapZoom?: number;
  expandedMap?: boolean;
  drawerOpen?: boolean;
  sheetSnap?: WorkspaceSheetSnap;
};

export const WORKSPACE_COPY = {
  searchHint: "Address, owner, Property ID…",
  idleTitle: "Search or tap a parcel",
  idleBody: "Search an address or tap a parcel on the map.",
  frameReady: "Area drawn",
  analyzeCta: "Analyze this area",
  expandMap: "Expand map",
  exitMap: "Exit map",
  openResearch: "Open research",
  collapseResearch: "Hide research",
} as const;

/** Peek is a deal card, not a half-page essay. Keep in sync with --sheet-h in globals.css. */
const SNAP_VH: Record<WorkspaceSheetSnap, number> = {
  collapsed: 0.12,
  peek: 0.26,
  expanded: 0.62,
  full: 0.92,
};

export function workspaceLayout(widthPx: number): WorkspaceLayout {
  return widthPx >= WORKSPACE_DRAWER_MIN_PX ? "drawer" : "sheet";
}

export function drawerWidthPx(widthPx: number): number {
  return Math.round(Math.min(420, Math.max(340, widthPx * 0.28)));
}

export function sheetHeightPx(
  snap: WorkspaceSheetSnap,
  viewportH: number,
): number {
  const h = Math.max(320, viewportH);
  const raw = Math.round(h * SNAP_VH[snap]);
  const min = snap === "collapsed" ? 56 : 72;
  const max = Math.round(h * 0.94);
  return Math.min(max, Math.max(min, raw));
}

export function nearestSheetSnap(
  heightPx: number,
  viewportH: number,
): WorkspaceSheetSnap {
  let best: WorkspaceSheetSnap = "peek";
  let bestDist = Number.POSITIVE_INFINITY;
  for (const snap of WORKSPACE_SHEET_SNAPS) {
    const d = Math.abs(sheetHeightPx(snap, viewportH) - heightPx);
    if (d < bestDist) {
      best = snap;
      bestDist = d;
    }
  }
  return best;
}

/** Live drag release — velocity wins over nearest when the flick is clear. */
export function snapFromRelease(opts: {
  heightPx: number;
  viewportH: number;
  velocityY: number;
}): WorkspaceSheetSnap {
  const nearest = nearestSheetSnap(opts.heightPx, opts.viewportH);
  const order = WORKSPACE_SHEET_SNAPS;
  const i = order.indexOf(nearest);
  if (opts.velocityY > 0.55) {
    return order[Math.max(0, i - 1)]!;
  }
  if (opts.velocityY < -0.55) {
    return order[Math.min(order.length - 1, i + 1)]!;
  }
  return nearest;
}

export function snapFromDelta(
  current: WorkspaceSheetSnap,
  deltaY: number,
): WorkspaceSheetSnap {
  const order = WORKSPACE_SHEET_SNAPS;
  const i = order.indexOf(current);
  if (deltaY > 48) return order[Math.max(0, i - 1)]!;
  if (deltaY < -48) return order[Math.min(order.length - 1, i + 1)]!;
  return current;
}

export function readWorkspaceSnapshot(): ResearchWorkspaceSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(RESEARCH_WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResearchWorkspaceSnapshot;
    if (parsed?.version !== RESEARCH_WORKSPACE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeWorkspaceSnapshot(
  next: Partial<ResearchWorkspaceSnapshot>,
): void {
  if (typeof window === "undefined") return;
  try {
    const prev = readWorkspaceSnapshot() ?? {
      version: RESEARCH_WORKSPACE_VERSION,
      source: "",
    };
    window.sessionStorage.setItem(
      RESEARCH_WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        ...prev,
        ...next,
        version: RESEARCH_WORKSPACE_VERSION,
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function workspaceContext(opts: {
  hasProperty: boolean;
  hasFrame: boolean;
  hasAnalysis: boolean;
  askOpen: boolean;
}): WorkspaceSheetContext {
  if (opts.askOpen) return "archie";
  if (opts.hasAnalysis) return "analysis";
  if (opts.hasProperty) return "property";
  if (opts.hasFrame) return "frame";
  return "idle";
}
