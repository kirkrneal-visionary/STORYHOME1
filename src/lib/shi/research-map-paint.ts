/**
 * Research first paint — size the canvas, show land, then 3D.
 * Presentation only. Does not change CAD / 3DEP numbers.
 */

export const RESEARCH_MAP_PAINT = "research-map-paint-v1" as const;

/** Same floor as RESEARCH_RELIEF_NATURAL — keep this file Node-testable. */
const RELIEF_NATURAL = 1;

export const MAP_PANE_MIN_W = 64;
export const MAP_PANE_MIN_H = 64;
export const MAP_CANVAS_SIZE_SLOP_PX = 8;

/** How long we wait for the first imagery idle before showing the map anyway. */
export const RESEARCH_LAND_WAIT_MS = 2800;
/** How long we wait for elevation tiles before draping 3D anyway. */
export const RESEARCH_DEM_WAIT_MS = 2400;

/** Extra resize ticks after create — iOS chrome / sheet / PWA settle late. */
export const RESEARCH_RESIZE_TICKS_MS = [0, 50, 250, 700, 1400] as const;

export const RESEARCH_PAPER = "#f8f4f0";

export const RESEARCH_LAND_LOADING_COPY = "Loading land…";

/** Vercel / browser cache for owned photo, street, and elevation tiles. */
export const LAUNCH7_TILE_CACHE_CONTROL =
  "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";

export function mapPaneHasSize(width: number, height: number): boolean {
  return width >= MAP_PANE_MIN_W && height >= MAP_PANE_MIN_H;
}

export function canvasMatchesPane(
  canvasCss: number,
  paneCss: number,
  slop = MAP_CANVAS_SIZE_SLOP_PX,
): boolean {
  if (canvasCss <= 0 || paneCss <= 0) return false;
  return Math.abs(canvasCss - paneCss) <= slop;
}

/**
 * The phone sheet sits on top of a full-screen map.
 * Dragging it must not rebuild the WebGL buffer (black / half-screen).
 */
export function shouldResizeMapForWorkspaceChange(change: {
  layoutChanged?: boolean;
  drawerChanged?: boolean;
  expandedMapChanged?: boolean;
  sheetSnapChanged?: boolean;
}): boolean {
  return Boolean(
    change.layoutChanged ||
      change.drawerChanged ||
      change.expandedMapChanged,
  );
}

export function landPaintReady(opts: {
  styleLoaded: boolean;
  imageryIdle: boolean;
  timedOut: boolean;
}): boolean {
  if (!opts.styleLoaded) return false;
  return opts.imageryIdle || opts.timedOut;
}

export function terrainApplyReady(opts: {
  landPainted: boolean;
  demSourceReady: boolean;
  timedOut: boolean;
}): boolean {
  if (!opts.landPainted) return false;
  return opts.demSourceReady || opts.timedOut;
}

/** First 3D tap stays natural. Relief slider applies after the mesh exists. */
export function reliefFor3dApply(opts: {
  requested: number;
  firstEnable: boolean;
  cap: number;
}): number {
  const floor = RELIEF_NATURAL;
  const want = opts.firstEnable
    ? Math.min(opts.requested, RELIEF_NATURAL)
    : opts.requested;
  return Math.min(opts.cap, Math.max(floor, want));
}

export function maxParallelImageRequestsForTier(
  tier: "high" | "medium" | "low",
): number {
  if (tier === "low") return 6;
  if (tier === "medium") return 8;
  return 12;
}
