/**
 * CAD overlay abuse caps (Founder Interpreter — build process only).
 * Intent: county ArcGIS proxy is for Story Pro desks, not the open internet.
 * Acceptance: bbox and per-user rate stay cheap even if a Pro session is noisy.
 */

/** Max viewport span in degrees (~40 miles). Wider views skip the proxy. */
export const CAD_OVERLAY_MAX_BBOX_DEG = 0.6;

/** Max features requested from the county server per layer. */
export const CAD_OVERLAY_MAX_FEATURES = 500;

/** Overlay fetches allowed per signed-in Pro user per window. */
export const CAD_OVERLAY_RATE_LIMIT = 48;
export const CAD_OVERLAY_RATE_WINDOW_MS = 60_000;

export type OverlayBbox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export function parseOverlayBbox(sp: {
  get(name: string): string | null;
}): OverlayBbox | null {
  const west = Number(sp.get("west"));
  const south = Number(sp.get("south"));
  const east = Number(sp.get("east"));
  const north = Number(sp.get("north"));
  if (![west, south, east, north].every(Number.isFinite)) return null;
  if (east <= west || north <= south) return null;
  if (
    east - west > CAD_OVERLAY_MAX_BBOX_DEG ||
    north - south > CAD_OVERLAY_MAX_BBOX_DEG
  ) {
    return null;
  }
  return { west, south, east, north };
}

export function overlayBboxTooWide(bbox: OverlayBbox): boolean {
  return (
    bbox.east - bbox.west > CAD_OVERLAY_MAX_BBOX_DEG ||
    bbox.north - bbox.south > CAD_OVERLAY_MAX_BBOX_DEG
  );
}

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Pure check + increment. In-memory per process (Vercel isolate). */
export function takeOverlayRateToken(
  userId: string,
  now = Date.now(),
  store: Map<string, Bucket> = buckets,
): boolean {
  const key = userId.trim();
  if (!key) return false;
  const cur = store.get(key);
  if (!cur || now >= cur.resetAt) {
    store.set(key, {
      count: 1,
      resetAt: now + CAD_OVERLAY_RATE_WINDOW_MS,
    });
    return true;
  }
  if (cur.count >= CAD_OVERLAY_RATE_LIMIT) return false;
  cur.count += 1;
  return true;
}
