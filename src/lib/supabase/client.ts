import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True when real Supabase credentials are present. When false the app falls
 * back to demo mode so the prototype/preview keeps working without a backend.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

let browserClient: SupabaseClient | null = null;

/** Singleton browser Supabase client, or null when not configured. */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(url, anonKey);
  }
  return browserClient;
}
