import { NextResponse } from "next/server";
import { GENERIC_AUTH_SENT } from "@/lib/account/assurance";
import { notifySecurityChange } from "@/lib/account/notify-security";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: true, message: GENERIC_AUTH_SENT });
  }

  let email = "";
  try {
    const body = (await request.json()) as { email?: string };
    email = (body.email ?? "").trim();
  } catch {
    email = "";
  }

  if (!email) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? "";
  }

  if (email) {
    await supabase.auth.resend({ type: "signup", email });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    notifySecurityChange("confirmation_resent", user?.id);
  }

  return NextResponse.json({ ok: true, message: GENERIC_AUTH_SENT });
}
