/**
 * Username format and v1 change policy.
 * SQL claim_username / username_inspect are authoritative.
 * This module mirrors those rules for tests and later API layers.
 * Username is a public alias. It is not authorization.
 */

export const USERNAME_MIN_LEN = 4;
export const USERNAME_MAX_LEN = 20;
export const USERNAME_COOLDOWN_DAYS = 30;
export const USERNAME_MAX_CHANGES_12M = 2;

export type UsernameInspectStatus = "invalid" | "ok";
export type UsernameInspectCode =
  | "too_short"
  | "too_long"
  | "bad_chars"
  | "ok";

export type UsernameInspect = {
  normalized: string | null;
  status: UsernameInspectStatus;
  code: UsernameInspectCode;
};

function stripLeadingAt(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

export function inspectUsername(raw: string | null | undefined): UsernameInspect {
  const stripped = stripLeadingAt(raw ?? "");
  if (!stripped) {
    return { normalized: null, status: "invalid", code: "too_short" };
  }
  if (/[^A-Za-z0-9_]/.test(stripped)) {
    return { normalized: null, status: "invalid", code: "bad_chars" };
  }
  const normalized = stripped.toLowerCase();
  if (normalized.length < USERNAME_MIN_LEN) {
    return { normalized, status: "invalid", code: "too_short" };
  }
  if (normalized.length > USERNAME_MAX_LEN) {
    return { normalized, status: "invalid", code: "too_long" };
  }
  if (
    normalized.startsWith("_") ||
    normalized.endsWith("_") ||
    normalized.includes("__")
  ) {
    return { normalized, status: "invalid", code: "bad_chars" };
  }
  return { normalized, status: "ok", code: "ok" };
}

export function normalizeUsername(
  raw: string | null | undefined,
): string | null {
  const inspected = inspectUsername(raw);
  return inspected.status === "ok" ? inspected.normalized : null;
}
