/**
 * Normalize a pasted Supabase URL to the bare project origin. Guards against a
 * common setup mistake: pasting the RESTful endpoint
 * (https://xxxx.supabase.co/rest/v1/) or a trailing slash into the env var,
 * which otherwise produces "Invalid path" errors on auth requests.
 */
export function normalizeSupabaseUrl(raw?: string): string | undefined {
  if (!raw) return raw;
  return raw
    .trim()
    .replace(/\/(rest|auth|storage|realtime|functions)\/v1\/?$/i, "")
    .replace(/\/+$/, "");
}
