import { NextResponse } from "next/server";
import { notifySecurityChange } from "@/lib/account/notify-security";
import { requireSignedIn } from "@/lib/account/require-signed-in";

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

  await auth.supabase.rpc("stamp_forced_logout");
  await auth.supabase.auth.signOut({ scope: "global" });
  notifySecurityChange("signed_out_everywhere", auth.user.id);
  return NextResponse.json({ ok: true });
}
