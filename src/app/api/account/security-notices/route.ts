import { NextResponse } from "next/server";
import {
  listSecurityNotices,
  noticeLabel,
  notifySecurityChange,
  type SecurityNoticeKind,
} from "@/lib/account/notify-security";
import { requireSignedIn } from "@/lib/account/require-signed-in";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLIENT_KINDS = new Set<SecurityNoticeKind>([
  "mfa_enrolled",
  "password_reset_requested",
]);

export async function GET() {
  const auth = await requireSignedIn();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }
  const items = listSecurityNotices(auth.user.id).map((n) => ({
    id: n.id,
    kind: n.kind,
    label: noticeLabel(n.kind),
    at: n.at,
  }));
  return NextResponse.json({
    ok: true,
    liveMail: false,
    items,
  });
}

/** Client-only Auth steps (TOTP enroll, reset) can stamp the Labs inbox. */
export async function POST(request: Request) {
  const auth = await requireSignedIn();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }
  let kind: string = "";
  try {
    const body = (await request.json()) as { kind?: string };
    kind = body.kind ?? "";
  } catch {
    kind = "";
  }
  if (!CLIENT_KINDS.has(kind as SecurityNoticeKind)) {
    return NextResponse.json(
      { ok: false, error: "Unknown notice." },
      { status: 400 },
    );
  }
  notifySecurityChange(kind as SecurityNoticeKind, auth.user.id);
  return NextResponse.json({ ok: true, liveMail: false });
}
