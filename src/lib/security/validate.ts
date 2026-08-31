/** Runtime input checks. TypeScript types are not security. */

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Seller access codes are short tokens, not free text. */
export function normalizeSellerCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  if (code.length < 3 || code.length > 64) return null;
  if (!/^[A-Z0-9][A-Z0-9-]{2,63}$/.test(code)) return null;
  return code;
}

/**
 * Safe client error. Keep short product/cap messages.
 * Strip SQL, table names, filesystem paths, and provider internals.
 */
export function publicError(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : "";
  if (!msg) return fallback;
  if (
    /select |insert |update |delete |relation |column |permission denied|PGRST|postgres|supabase|service.role|stack|\/[\w.-]+\.(ts|js|sql)/i.test(
      msg,
    )
  ) {
    return fallback;
  }
  if (msg.length > 160) return fallback;
  return msg;
}
