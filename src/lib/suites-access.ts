import { decideReadiness, isEmailConfirmed } from "@/lib/account/assurance";
import { requireSignedIn } from "@/lib/account/require-signed-in";

export async function requireSuitesAccess() {
  const gate = await requireSignedIn();
  if (!gate.ok) return gate;

  const ready = decideReadiness({
    signedIn: true,
    emailConfirmed: isEmailConfirmed(gate.user.email_confirmed_at),
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
