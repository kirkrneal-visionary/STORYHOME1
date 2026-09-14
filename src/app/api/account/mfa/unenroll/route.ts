import { NextResponse } from "next/server";
import { mfaRequired } from "@/lib/account/assurance";
import { notifySecurityChange } from "@/lib/account/notify-security";
import { readSessionAssurance } from "@/lib/account/require-account-ready";
import {
  requireSignedIn,
  requireStepUpIfEnrolled,
} from "@/lib/account/require-signed-in";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireSignedIn();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }

  const step = await requireStepUpIfEnrolled(auth.supabase);
  if (!step.ok) {
    return NextResponse.json(
      { ok: false, error: step.error, code: step.code },
      { status: step.status },
    );
  }

  let factorId = "";
  try {
    const body = (await request.json()) as { factorId?: string };
    factorId = (body.factorId ?? "").trim();
  } catch {
    factorId = "";
  }
  if (!factorId) {
    return NextResponse.json(
      { ok: false, error: "Authenticator is missing." },
      { status: 400 },
    );
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("account_kind, account_purpose")
    .eq("id", auth.user.id)
    .maybeSingle();

  const session = await readSessionAssurance(auth.supabase);
  if (mfaRequired(profile?.account_purpose, profile?.account_kind)) {
    const { data: factors } = await auth.supabase.auth.mfa.listFactors();
    const verified = factors?.totp?.filter((f) => f.status === "verified") ?? [];
    if (verified.length <= 1) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This account type needs an authenticator. Add a new one before removing this one.",
        },
        { status: 400 },
      );
    }
  }

  const { error } = await auth.supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    return NextResponse.json(
      { ok: false, error: "Unable to remove that authenticator." },
      { status: 400 },
    );
  }

  notifySecurityChange("mfa_removed", auth.user.id);
  return NextResponse.json({ ok: true, enrolled: session.enrolled });
}
