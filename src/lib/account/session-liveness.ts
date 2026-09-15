/**
 * Other devices must notice Sign out everywhere.
 * This module has no runtime @/ imports so Node tests can load it.
 */

export const SESSION_LIVENESS_MS = 20_000;

export function parseJwtIssuedAtMs(
  accessToken: string | null | undefined,
): number | null {
  if (!accessToken) return null;
  const part = accessToken.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? atob(pad)
        : Buffer.from(pad, "base64").toString("utf8");
    const payload = JSON.parse(json) as { iat?: number };
    return typeof payload.iat === "number" ? payload.iat * 1000 : null;
  } catch {
    return null;
  }
}

/** Stamp newer than this login means this device must sign out. */
export function shouldForceLocalLogout(
  issuedAtMs: number | null,
  forcedLogoutAt: string | null | undefined,
): boolean {
  if (issuedAtMs == null || !forcedLogoutAt) return false;
  const stamp = Date.parse(forcedLogoutAt);
  if (Number.isNaN(stamp)) return false;
  return stamp > issuedAtMs;
}
