import {
  decideReadiness,
  isEmailConfirmed,
  type AccountReadiness,
} from "@/lib/account/assurance";
import { getServerSupabase } from "@/lib/supabase/server";

export type { AccountReadiness, ReadyReason } from "@/lib/account/assurance";
export { decideReadiness, redirectForReason } from "@/lib/account/assurance";

export async function getAccountReadiness(opts: {
  nextPath: string;
}): Promise<AccountReadiness> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return decideReadiness({
      signedIn: false,
      emailConfirmed: false,
      nextPath: opts.nextPath,
    });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return decideReadiness({
    signedIn: Boolean(user),
    emailConfirmed: isEmailConfirmed(user?.email_confirmed_at),
    nextPath: opts.nextPath,
  });
}
