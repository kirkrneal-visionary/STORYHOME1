import { NextResponse } from "next/server";
import { isEmailConfirmed } from "@/lib/account/assurance";
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

  return NextResponse.json({
    ok: true,
    email: auth.user.email ?? "",
    emailConfirmed: isEmailConfirmed(auth.user.email_confirmed_at),
    lastSignInAt: auth.user.last_sign_in_at ?? null,
    confirmedAt: auth.user.email_confirmed_at ?? null,
  });
}
