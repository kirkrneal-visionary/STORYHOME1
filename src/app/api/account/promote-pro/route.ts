import { NextResponse } from "next/server";
import { promoteSignedInPro } from "@/lib/account/promote-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server TREC promotion. Signup cannot set agent/broker.
 */
export async function POST() {
  const result = await promoteSignedInPro();
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({
    ok: true,
    accountKind: result.accountKind,
    promoted: result.promoted,
  });
}
