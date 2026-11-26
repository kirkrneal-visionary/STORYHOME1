import { NextResponse } from "next/server";
import { notifySecurityChange } from "@/lib/account/notify-security";
import {
  meetsPasswordRule,
  passwordRejectedMessage,
  passwordTooShortCopy,
  passwordUpdatePublicMessage,
} from "@/lib/account/password-rule";
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

  let currentPassword = "";
  let newPassword = "";
  try {
    const body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };
    currentPassword = body.currentPassword ?? "";
    newPassword = body.newPassword ?? "";
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to update password." },
      { status: 400 },
    );
  }

  if (!meetsPasswordRule(newPassword)) {
    return NextResponse.json(
      { ok: false, error: passwordTooShortCopy(), code: "password_rejected" },
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
            : "Unable to update password.",
      },
      { status: 400 },
    );
  }

  const { error } = await auth.supabase.auth.updateUser({ password: newPassword });
  if (error) {
    const rejected = passwordRejectedMessage(error);
    if (rejected) {
      return NextResponse.json(
        { ok: false, error: rejected, code: "password_rejected" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: passwordUpdatePublicMessage(error) },
      { status: 400 },
    );
  }

  await auth.supabase.auth.signOut({ scope: "others" });
  notifySecurityChange("password_changed", auth.user.id);
  return NextResponse.json({ ok: true });
}
