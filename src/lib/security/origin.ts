/**
 * Same-origin check for cookie-authenticated state changes.
 * Webhooks use signatures instead — skip those paths.
 */

const SKIP_ORIGIN = ["/api/billing/webhook"];

export function shouldCheckOrigin(pathname: string, method: string): boolean {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return false;
  if (!pathname.startsWith("/api/")) return false;
  return !SKIP_ORIGIN.some((p) => pathname.startsWith(p));
}

export function originAllowed(request: {
  headers: Headers;
  nextUrl: { host: string };
}): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}
