/**
 * Links in the Supabase Auth emails (supabase/templates/*.html):
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email|recovery
 * A token hash works in any browser, so a link opened from Mail in Safari
 * still works when the request started in the app (a PKCE code would not).
 * Verify only after a tap: mail scanners open links before people do.
 * This module has no runtime @/ imports so Node tests can load it.
 */

export type EmailLinkType = "email" | "recovery";

export type EmailLink = { tokenHash: string; type: EmailLinkType };

export type EmailLinkFailure = "expired" | "network";

/** Supabase's per-address wait between auth emails. */
export const EMAIL_RESEND_WAIT_MS = 60_000;

const TOKEN_HASH = /^[A-Za-z0-9_-]{16,256}$/;

function firstValue(value: unknown): string | null {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0].trim();
  }
  return null;
}

export function readEmailLink(params: {
  token_hash?: unknown;
  type?: unknown;
}): EmailLink | null {
  const tokenHash = firstValue(params.token_hash);
  if (!tokenHash || !TOKEN_HASH.test(tokenHash)) return null;
  const rawType = firstValue(params.type);
  if (rawType === "recovery") return { tokenHash, type: "recovery" };
  // "signup" is the older name Supabase used for the confirmation type.
  if (rawType === "email" || rawType === "signup") {
    return { tokenHash, type: "email" };
  }
  return null;
}

/** Auth API 4xx means the link is used or expired. Anything else may be retried. */
export function emailLinkFailure(
  error: { status?: number } | null | undefined,
): EmailLinkFailure {
  const status = error?.status ?? 0;
  return status >= 400 && status < 500 ? "expired" : "network";
}
