import { NextResponse } from "next/server";
import { canOpenOfficeAccount } from "@/lib/account/purpose";
import { notifySecurityChange } from "@/lib/account/notify-security";
import { readSessionAssurance } from "@/lib/account/require-account-ready";
import {
  requireSignedIn,
  requireStepUpIfEnrolled,
} from "@/lib/account/require-signed-in";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireSignedIn();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }

  const session = await readSessionAssurance(auth.supabase);
  if (!session.emailConfirmed) {
    return NextResponse.json(
      { ok: false, error: "Confirm your email first." },
      { status: 403 },
    );
  }

  const step = await requireStepUpIfEnrolled(auth.supabase);
  if (!step.ok) {
    return NextResponse.json(
      { ok: false, error: step.error, code: step.code },
      { status: step.status },
    );
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("account_kind, account_purpose")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (
    !canOpenOfficeAccount(profile?.account_purpose, profile?.account_kind)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Only a Story Pro broker login can become the office account.",
      },
      { status: 403 },
    );
  }

  const { error } = await auth.supabase.rpc("open_office_account");
  if (error) {
    return NextResponse.json(
      { ok: false, error: "Unable to open the office account." },
      { status: 400 },
    );
  }

  notifySecurityChange("office_opened", auth.user.id);
  return NextResponse.json({ ok: true, accountPurpose: "managing_broker" });
}
