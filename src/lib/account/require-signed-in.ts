import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readSessionAssurance } from "@/lib/account/require-account-ready";
import { getServerSupabase } from "@/lib/supabase/server";

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
  return { ok: true, supabase, user };
}

/** Sensitive account writes need AAL2 once an authenticator is on the account. */
export async function requireStepUpIfEnrolled(
  supabase: SupabaseClient,
): Promise<{ ok: true } | { ok: false; status: number; error: string; code: string }> {
  const session = await readSessionAssurance(supabase);
  if (session.enrolled && session.currentAal !== "aal2") {
    return {
      ok: false,
      status: 403,
      error: "Confirm your authenticator code first.",
      code: "needs_mfa",
    };
  }
  return { ok: true };
}
