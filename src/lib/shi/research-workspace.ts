/**
 * Research Workspace — map-first session helpers.
 * Presentation only. Parcel truth stays in existing Research state.
 *
 * Rule version: research-workspace-v1
 */

export const RESEARCH_WORKSPACE_VERSION = "research-workspace-v1" as const;
export const RESEARCH_WORKSPACE_STORAGE_KEY = "archie-research-workspace-v1";

export const WORKSPACE_SHEET_SNAPS = [
  "collapsed",
  "peek",
  "half",
  "expanded",
] as const;

export type WorkspaceSheetSnap = (typeof WORKSPACE_SHEET_SNAPS)[number];

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
};

export const WORKSPACE_COPY = {
  searchHint: "Address, owner, Property ID…",
  idleTitle: "Select a property or draw an area",
  idleBody:
    "Search a property, tap a parcel, or draw on the map to begin. The map stays with you.",
  frameReady: "Area drawn",
  analyzeCta: "Analyze this area",
} as const;

const SNAP_VH: Record<WorkspaceSheetSnap, number> = {
  collapsed: 0.11,
  peek: 0.22,
  half: 0.46,
  expanded: 0.86,
};

export function sheetHeightPx(
  snap: WorkspaceSheetSnap,
  viewportH: number,
): number {
  const h = Math.max(320, viewportH);
  return Math.round(h * SNAP_VH[snap]);
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
