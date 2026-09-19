import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { confirmMatches } from "@/lib/account/delete-account";
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
  let confirm = "";
  try {
    const body = (await request.json()) as {
      currentPassword?: string;
      confirm?: string;
    };
    currentPassword = body.currentPassword ?? "";
    confirm = body.confirm ?? "";
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to delete this account." },
      { status: 400 },
    );
  }

  if (!confirmMatches(confirm)) {
    return NextResponse.json(
      { ok: false, error: "Type DELETE to confirm." },
      { status: 400 },
    );
  }

  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const email = auth.user.email;
  if (!url || !anon || !service || !email) {
    return NextResponse.json(
      { ok: false, error: "Unable to delete this account." },
      { status: 503 },
    );
  }

  const probe = createClient(url, anon, { auth: { persistSession: false } });
  const { error: check } = await probe.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (check) {
    return NextResponse.json(
      { ok: false, error: "Password is incorrect." },
      { status: 400 },
    );
  }

  const admin = createClient(url, service, { auth: { persistSession: false } });
  await admin.rpc("tombstone_account_usernames", { p_uid: auth.user.id });
  const { error } = await admin.auth.admin.deleteUser(auth.user.id);
  if (error) {
    return NextResponse.json(
      { ok: false, error: "Unable to delete this account." },
      { status: 400 },
    );
  }

  notifySecurityChange("account_deleted", auth.user.id);
  return NextResponse.json({ ok: true });
}
