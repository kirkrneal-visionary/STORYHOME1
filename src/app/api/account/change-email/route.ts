import { NextResponse } from "next/server";
import { notifySecurityChange } from "@/lib/account/notify-security";
import {
  checkCurrentPassword,
  requireSignedIn,
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

  let email = "";
  let currentPassword = "";
  try {
    const body = (await request.json()) as {
      email?: string;
      currentPassword?: string;
    };
    email = (body.email ?? "").trim();
    currentPassword = body.currentPassword ?? "";
  } catch {
    email = "";
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid email." },
      { status: 400 },
    );
  }

  const password = await checkCurrentPassword(auth.user.email, currentPassword);
  if (password !== "ok") {
    return NextResponse.json(
      {
        ok: false,
        error:
          password === "wrong"
            ? "Current password is incorrect."
            : "Unable to start that email change.",
      },
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
