/**
 * Public CAD search/lookup access policy.
 *
 * Short burst windows are enforced now.
 * Longer windows are recorded so a future layer can distinguish a person
 * who bursts a few times from a scraper that sits on the cap for hours.
 * Flip `enforce` on a longer window later — do not rewrite the parcel routes.
 *
 * Map tiles are not a lane. `/api/parcels/{z}/{x}/{y}` stays unclassified.
 */

export type CadAccessLane = "search" | "lookup";

export type CadAccessWindow = {
  id: string;
  windowMs: number;
  limit: number;
  /** When false, count is stored but never 429s. */
  enforce: boolean;
};

export const CAD_ACCESS_POLICY: Record<CadAccessLane, readonly CadAccessWindow[]> =
  {
    search: [
      { id: "burst", windowMs: 60_000, limit: 24, enforce: true },
      { id: "day", windowMs: 24 * 60 * 60 * 1000, limit: 400, enforce: false },
    ],
    lookup: [
      { id: "burst", windowMs: 60_000, limit: 30, enforce: true },
      { id: "day", windowMs: 24 * 60 * 60 * 1000, limit: 500, enforce: false },
    ],
  } as const;

export const CAD_SEARCH_MIN_CHARS = 2;
export const CAD_SEQUENTIAL_ID_MIN = 4;
export const CAD_SEQUENTIAL_MAX_STEP = 10;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function classifyCadPublicPath(
  pathname: string,
): CadAccessLane | null {
  if (pathname === "/api/parcels/search" || pathname.startsWith("/api/parcels/search?")) {
    return "search";
  }
  if (pathname === "/api/parcels/lookup" || pathname.startsWith("/api/parcels/lookup?")) {
    return "lookup";
  }
  return null;
}

export function cadAccessKey(lane: CadAccessLane, windowId: string, ip: string): string {
  return `${lane}:${windowId}:${ip}`;
}

function touchBucket(key: string, windowMs: number, now: number): Bucket {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    buckets.set(key, next);
    if (buckets.size > 20_000) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
      }
    }
    return next;
  }
  existing.count += 1;
  return existing;
}

export function consumeCadAccess(opts: {
  lane: CadAccessLane;
  ip: string;
  now?: number;
}): { ok: true } | { ok: false; retryAfterSec: number; windowId: string } {
  const now = opts.now ?? Date.now();
  let denied: { retryAfterSec: number; windowId: string } | null = null;
  for (const win of CAD_ACCESS_POLICY[opts.lane]) {
    const bucket = touchBucket(
      cadAccessKey(opts.lane, win.id, opts.ip),
      win.windowMs,
      now,
    );
    if (bucket.count > win.limit && win.enforce && !denied) {
      denied = {
        windowId: win.id,
        retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      };
    }
  }
  if (denied) return { ok: false, ...denied };
  return { ok: true };
}

/** Test helper — not used by production routes. */
export function resetCadAccessForTests(): void {
  buckets.clear();
}

export function cadAccessCount(
  lane: CadAccessLane,
  windowId: string,
  ip: string,
): number {
  return buckets.get(cadAccessKey(lane, windowId, ip))?.count ?? 0;
}

export function isNumericCadId(id: string): boolean {
  return /^\d+$/.test(id.trim());
}

/**
 * True when a lookup batch is an obvious incrementing walk
 * (4+ numeric ids in a straight sequence).
 */
export function isSequentialNumericIdBatch(ids: string[]): boolean {
  const nums = ids
    .map((id) => id.trim())
    .filter(isNumericCadId)
    .map((id) => Number(id))
    .filter((n) => Number.isSafeInteger(n));
  const uniq = [...new Set(nums)].sort((a, b) => a - b);
  if (uniq.length < CAD_SEQUENTIAL_ID_MIN) return false;
  const step = uniq[1]! - uniq[0]!;
  if (step < 1 || step > CAD_SEQUENTIAL_MAX_STEP) return false;
  for (let i = 2; i < uniq.length; i++) {
    if (uniq[i]! - uniq[i - 1]! !== step) return false;
  }
  return true;
}
