import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";

export type ProGateOk = {
  ok: true;
  supabase: SupabaseClient;
  user: User;
  accountKind: string;
};

export type ProGateFail = {
  ok: false;
  status: number;
  error: string;
};

/**
 * Story Pro gate for SHI API routes (agent / broker account_kind).
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
    return { ok: false, status: 401, error: "Sign in required" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_kind")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, status: 500, error: profileError.message };
  }

  const accountKind = profile?.account_kind ?? "";
  if (accountKind !== "agent" && accountKind !== "broker") {
    return {
      ok: false,
      status: 403,
      error: "Story Home Intelligence is available to Story Pro accounts",
    };
  }

  return { ok: true, supabase, user, accountKind };
}
