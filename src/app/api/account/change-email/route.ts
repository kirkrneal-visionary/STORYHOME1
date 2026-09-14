import { NextResponse } from "next/server";
import { notifySecurityChange } from "@/lib/account/notify-security";
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

  let email = "";
  try {
    const body = (await request.json()) as { email?: string };
    email = (body.email ?? "").trim();
  } catch {
    email = "";
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid email." },
      { status: 400 },
    );
  }

  const { error } = await auth.supabase.auth.updateUser({ email });
  if (error) {
    return NextResponse.json(
      { ok: false, error: "Unable to start that email change." },
      { status: 400 },
    );
  }

  notifySecurityChange("email_change_requested", auth.user.id);
  return NextResponse.json({
    ok: true,
    message: "Check the new inbox to confirm the change.",
  });
}
