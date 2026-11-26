import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { sessionWasForcedOut } from "@/lib/account/require-session-live";
import { getServerSupabase } from "@/lib/supabase/server";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

export async function requireSignedIn(): Promise<
  | { ok: true; supabase: SupabaseClient; user: User }
  | { ok: false; status: number; error: string }
> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return { ok: false, status: 503, error: "Auth is not configured." };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "Sign in required." };
  }
  if (await sessionWasForcedOut(supabase)) {
    return { ok: false, status: 401, error: "Sign in required." };
  }
  return { ok: true, supabase, user };
}

export type CurrentPasswordCheck = "ok" | "wrong" | "unavailable";

/**
 * Email change, password change, and account deletion re-check the password.
 * A throwaway client keeps this probe away from the caller's session cookie.
 */
export async function checkCurrentPassword(
  email: string | null | undefined,
  password: string,
): Promise<CurrentPasswordCheck> {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon || !email) return "unavailable";
  if (!password) return "wrong";
  const probe = createClient(url, anon, { auth: { persistSession: false } });
  const { error } = await probe.auth.signInWithPassword({ email, password });
  return error ? "wrong" : "ok";
}
