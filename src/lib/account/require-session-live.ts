import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseJwtIssuedAtMs,
  shouldForceLocalLogout,
  stampToIso,
} from "./session-liveness";

/**
 * True when this access token was issued before Sign out everywhere.
 * If the stamp helper is missing, do not lock everyone out.
 */
export async function sessionWasForcedOut(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const issuedAtMs = parseJwtIssuedAtMs(sessionData.session?.access_token);
  const { data, error } = await supabase.rpc("my_forced_logout_at");
  if (error) return false;
  return shouldForceLocalLogout(issuedAtMs, stampToIso(data));
}
