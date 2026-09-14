import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  decideReadiness,
  parseAssuranceLevel,
  type AccountReadiness,
  type AssuranceLevel,
} from "@/lib/account/assurance";
import type { AccountPurpose } from "@/lib/account/purpose";
import { getServerSupabase } from "@/lib/supabase/server";

export type { AccountReadiness, ReadyReason } from "@/lib/account/assurance";
export { decideReadiness, redirectForReason } from "@/lib/account/assurance";

export async function readSessionAssurance(supabase: SupabaseClient): Promise<{
  user: User | null;
  emailConfirmed: boolean;
  enrolled: boolean;
  currentAal: AssuranceLevel | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      emailConfirmed: false,
      enrolled: false,
      currentAal: null,
    };
  }

  let enrolled = false;
  let currentAal: AssuranceLevel | null = null;
  try {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    enrolled = Boolean(factors?.totp?.some((f) => f.status === "verified"));
  } catch {
    enrolled = false;
  }
  try {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    currentAal = parseAssuranceLevel(aal?.currentLevel);
  } catch {
    currentAal = "aal1";
  }

  return {
    user,
    emailConfirmed: Boolean(user.email_confirmed_at),
    enrolled,
    currentAal,
  };
}

export async function getAccountReadiness(opts: {
  purpose: AccountPurpose | string | null | undefined;
  kind: string | null | undefined;
  nextPath: string;
}): Promise<AccountReadiness> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return decideReadiness({
      signedIn: false,
      emailConfirmed: false,
      purpose: opts.purpose,
      kind: opts.kind,
      enrolled: false,
      currentAal: null,
      nextPath: opts.nextPath,
    });
  }
  const session = await readSessionAssurance(supabase);
  return decideReadiness({
    signedIn: Boolean(session.user),
    emailConfirmed: session.emailConfirmed,
    purpose: opts.purpose,
    kind: opts.kind,
    enrolled: session.enrolled,
    currentAal: session.currentAal,
    nextPath: opts.nextPath,
  });
}
