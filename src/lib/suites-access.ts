import { decideReadiness } from "@/lib/account/assurance";
import { requireSignedIn } from "@/lib/account/require-signed-in";
import { readSessionAssurance } from "@/lib/account/require-account-ready";

export async function requireSuitesAccess() {
  const gate = await requireSignedIn();
  if (!gate.ok) return gate;

  const { data: profile } = await gate.supabase
    .from("profiles")
    .select("account_kind, account_purpose")
    .eq("id", gate.user.id)
    .maybeSingle();

  const session = await readSessionAssurance(gate.supabase);
  const ready = decideReadiness({
    signedIn: true,
    emailConfirmed: session.emailConfirmed,
    purpose: profile?.account_purpose ?? "",
    kind: profile?.account_kind ?? "",
    enrolled: session.enrolled,
    currentAal: session.currentAal,
    nextPath: "/saved",
  });
  if (!ready.ok) {
    return {
      ok: false as const,
      status: 403,
      error: "Finish account security first.",
    };
  }
  return gate;
}
