import { NextResponse } from "next/server";
import { mfaRequired } from "@/lib/account/assurance";
import { readSessionAssurance } from "@/lib/account/require-account-ready";
import { requireSignedIn } from "@/lib/account/require-signed-in";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSignedIn();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }

  const session = await readSessionAssurance(auth.supabase);
  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("account_kind, account_purpose")
    .eq("id", auth.user.id)
    .maybeSingle();

  const purpose = profile?.account_purpose ?? null;
  const kind = profile?.account_kind ?? null;

  return NextResponse.json({
    ok: true,
    email: auth.user.email ?? "",
    emailConfirmed: session.emailConfirmed,
    currentAal: session.currentAal,
    enrolled: session.enrolled,
    mfaRequired: mfaRequired(purpose, kind),
    lastSignInAt: auth.user.last_sign_in_at ?? null,
    confirmedAt: auth.user.email_confirmed_at ?? null,
  });
}
