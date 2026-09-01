/**
 * Application rate limits — burst + window.
 * In-memory per isolate. Vercel WAF is the durable edge layer.
 * Tiles are NOT limited here (pan/zoom would break).
 */

export type RateCost = "low" | "medium" | "high";

export const RATE_WINDOWS: Record<
  RateCost,
  { limit: number; windowMs: number }
> = {
  low: { limit: 90, windowMs: 60_000 },
  medium: { limit: 30, windowMs: 60_000 },
  high: { limit: 10, windowMs: 60_000 },
};

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (fwd) return fwd.slice(0, 64);
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimitKey(
  cost: RateCost,
  ip: string,
  userId?: string | null,
): string {
  return `${cost}:${userId || ip}`;
}

export function consumeRateLimit(
  key: string,
  cost: RateCost,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfterSec: number } {
  const spec = RATE_WINDOWS[cost];
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + spec.windowMs });
    if (buckets.size > 20_000) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
      }
    }
    return { ok: true };
  }
  if (existing.count >= spec.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true };
}

export function classifyApiPath(pathname: string): RateCost | null {
  return classifyRequestPath(pathname);
}

/** API + seller-portal page paths. Tiles stay unclassified (no 429). */
export function classifyRequestPath(pathname: string): RateCost | null {
  if (pathname.startsWith("/seller/portal/")) return "medium";
  if (!pathname.startsWith("/api/")) return null;
  // Expensive lidar analytics live under /api/map/ — classify before the tile exemption.
  if (
    pathname.startsWith("/api/map/lidar/parcel") ||
    pathname.startsWith("/api/map/lidar/profile")
  ) {
    return "high";
  }
  if (pathname.startsWith("/api/map/lidar/read")) {
    return "medium";
  }
  if (pathname.startsWith("/api/map/launch7/status")) {
    return "low";
  }
  // Tiles: pan/zoom volume is high; do not 429.
  if (
    pathname.startsWith("/api/map/") ||
    pathname.startsWith("/api/parcels/")
  ) {
    return null;
  }
  if (
    pathname.startsWith("/api/shi/area") ||
    pathname.startsWith("/api/shi/similar") ||
    pathname.startsWith("/api/shi/portfolio") ||
    pathname.startsWith("/api/shi/owner-matches") ||
    pathname.startsWith("/api/shi/corridors/analyze") ||
    pathname.startsWith("/api/shi/corridors/strongest-sites") ||
    pathname.startsWith("/api/shi/multifamily/review") ||
    pathname.startsWith("/api/shi/research/worth-a-look")
  ) {
    return "high";
  }
  if (
    pathname.startsWith("/api/shi/") ||
    pathname.startsWith("/api/cad/overlay") ||
    pathname.startsWith("/api/verify-trec") ||
    pathname.startsWith("/api/analytics") ||
    pathname.startsWith("/api/listing-activity") ||
    pathname.startsWith("/api/seller/")
  ) {
    return "medium";
  }
  if (pathname.startsWith("/api/")) return "low";
  return null;
}

export function tooManyRequests(retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Wait a moment and try again.",
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(retryAfterSec),
        "cache-control": "no-store",
      },
    },
  );
}
