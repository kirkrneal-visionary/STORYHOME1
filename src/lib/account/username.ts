/**
 * Username format and v1 change policy.
 * SQL claim_username (service_role) / username_inspect are authoritative.
 * Ordinary claims go through POST /api/account/username/claim.
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

/** Settings input: strip a leading @ and lowercase. Keep other characters. */
export function shapeUsernameInput(raw: string): string {
  let value = raw.replace(/^\s+/, "");
  if (value.startsWith("@")) value = value.slice(1);
  return value.replace(/[A-Z]/g, (ch) => ch.toLowerCase());
}

export type UsernameSyntaxCode =
  | "too_short"
  | "too_long"
  | "bad_chars"
  | "leading_underscore"
  | "trailing_underscore"
  | "double_underscore";

export function usernameSyntax(shaped: string): UsernameSyntaxCode | null {
  if (!shaped) return null;
  if (/[^a-z0-9_]/.test(shaped)) return "bad_chars";
  if (shaped.startsWith("_")) return "leading_underscore";
  if (shaped.endsWith("_")) return "trailing_underscore";
  if (shaped.includes("__")) return "double_underscore";
  if (shaped.length < USERNAME_MIN_LEN) return "too_short";
  if (shaped.length > USERNAME_MAX_LEN) return "too_long";
  return null;
}

export function usernameSyntaxCopy(code: UsernameSyntaxCode): string {
  if (code === "too_short") return "Use at least 4 characters.";
  if (code === "too_long") return "Maximum 20 characters.";
  if (code === "leading_underscore") return "Don't start with an underscore.";
  if (code === "trailing_underscore") return "Don't end with an underscore.";
  if (code === "double_underscore") return "Don't use two underscores in a row.";
  return "Use letters, numbers, and underscores only.";
}
