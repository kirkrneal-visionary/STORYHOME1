/**
 * Seller-code brute-force limiter (in-memory per isolate).
 * Same response for miss / throttle — do not enumerate codes.
 */

type Bucket = { fails: number; resetAt: number };

const WINDOW_MS = 15 * 60_000;
const MAX_FAILS = 8;

const buckets = new Map<string, Bucket>();

export function sellerAttemptKey(ip: string): string {
  return `seller:${ip.slice(0, 64)}`;
}

export function sellerAttemptsOpen(ip: string, now = Date.now()): boolean {
  const key = sellerAttemptKey(ip);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) return true;
  return existing.fails < MAX_FAILS;
}

export function noteSellerFailure(ip: string, now = Date.now()): void {
  const key = sellerAttemptKey(ip);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { fails: 1, resetAt: now + WINDOW_MS });
    return;
  }
  existing.fails += 1;
}

export function noteSellerSuccess(ip: string): void {
  buckets.delete(sellerAttemptKey(ip));
}

export const SELLER_ATTEMPT_LIMIT = MAX_FAILS;
export const SELLER_ATTEMPT_WINDOW_MS = WINDOW_MS;
