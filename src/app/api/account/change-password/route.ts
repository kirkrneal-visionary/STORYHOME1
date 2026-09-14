import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { notifySecurityChange } from "@/lib/account/notify-security";
import {
  requireSignedIn,
  requireStepUpIfEnrolled,
} from "@/lib/account/require-signed-in";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

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

  if (newPassword.length < 6) {
    return NextResponse.json(
      { ok: false, error: "Choose a longer password." },
      { status: 400 },
    );
  }

  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const email = auth.user.email;
  if (!url || !anon || !email) {
    return NextResponse.json(
      { ok: false, error: "Unable to update password." },
      { status: 400 },
    );
  }

  const probe = createClient(url, anon, { auth: { persistSession: false } });
  const { error: check } = await probe.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (check) {
    return NextResponse.json(
      { ok: false, error: "Current password is incorrect." },
      { status: 400 },
    );
  }

  const { error } = await auth.supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return NextResponse.json(
      { ok: false, error: "Unable to update password." },
      { status: 400 },
    );
  }

  await auth.supabase.auth.signOut({ scope: "others" });
  notifySecurityChange("password_changed", auth.user.id);
  return NextResponse.json({ ok: true });
}
