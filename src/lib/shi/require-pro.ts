import type { SupabaseClient, User } from "@supabase/supabase-js";
import { decideReadiness } from "@/lib/account/assurance";
import { readSessionAssurance } from "@/lib/account/require-account-ready";
import { mayUseStoryPro } from "@/lib/account/purpose";
import { logSecurityEvent } from "@/lib/security/log-event";
import { getServerSupabase } from "@/lib/supabase/server";

export type ProGateOk = {
  ok: true;
  supabase: SupabaseClient;
  user: User;
  accountKind: string;
  accountPurpose: string;
};

export type ProGateFail = {
  ok: false;
  status: number;
  error: string;
};

/**
 * Story Pro gate for SHI API routes.
 * Individual Pro and office (managing broker) qualify. Other professionals are refused.
 */
export async function requireStoryPro(): Promise<ProGateOk | ProGateFail> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return { ok: false, status: 503, error: "Supabase is not configured" };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    logSecurityEvent({ kind: "authz_denied", status: 401, path: "/api/shi" });
    return { ok: false, status: 401, error: "Sign in required" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_kind, account_purpose")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, status: 500, error: "Unable to verify account" };
  }

  const accountKind = profile?.account_kind ?? "";
  const accountPurpose = profile?.account_purpose ?? "";
  if (!mayUseStoryPro(accountPurpose, accountKind)) {
    logSecurityEvent({ kind: "authz_denied", status: 403, path: "/api/shi" });
    return {
      ok: false,
      status: 403,
      error: "Archie's Intelligence is available to Story Pro accounts",
    };
  }

  const session = await readSessionAssurance(supabase);
  const ready = decideReadiness({
    signedIn: true,
    emailConfirmed: session.emailConfirmed,
    purpose: accountPurpose,
    kind: accountKind,
    enrolled: session.enrolled,
    currentAal: session.currentAal,
    nextPath: "/portal",
  });
  if (!ready.ok) {
    logSecurityEvent({ kind: "authz_denied", status: 403, path: "/api/shi" });
    return {
      ok: false,
      status: 403,
      error: "Finish account security first.",
    };
  }

  return { ok: true, supabase, user, accountKind, accountPurpose };
}
