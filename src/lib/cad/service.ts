import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

/** Service-role CAD reader. Never import from a client component. */
export function cadService(): SupabaseClient | null {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function requireCadService(): SupabaseClient {
  const sb = cadService();
  if (!sb) {
    throw new Error("CAD service is not configured");
  }
  return sb;
}

/**
 * Prefer the service-role warehouse reader. Fall back to the caller client
 * only when the service key is missing (isolated tests / local without env).
 */
export function cadReader(fallback?: SupabaseClient | null): SupabaseClient {
  return cadService() ?? fallback ?? requireCadService();
}
