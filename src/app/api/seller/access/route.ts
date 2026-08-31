import { NextResponse } from "next/server";
import { clientIp } from "@/lib/security/rate-limit";
import { lookupSellerPortal } from "@/lib/seller/lookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC = "Unable to open this portal. Check the code and try again.";

/**
 * Seller access-code lookup. Attempt-limited.
 * Same message for miss, throttle, and expired — no enumeration.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: GENERIC }, { status: 404 });
  }

  const code =
    typeof (body as { code?: unknown }).code === "string"
      ? (body as { code: string }).code
      : "";

  const result = await lookupSellerPortal({
    code,
    ip: clientIp(request.headers),
    path: "/api/seller/access",
  });

  if (!result.ok) {
    if (result.status === 503) {
      return NextResponse.json({ ok: false, error: GENERIC }, { status: 503 });
    }
    if (result.status === 429) {
      return NextResponse.json({ ok: false, error: GENERIC }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: GENERIC }, { status: 404 });
  }

  const accessCode = result.portal.listing.accessCode.toLowerCase();
  return NextResponse.json({
    ok: true,
    path: `/seller/portal/${accessCode}`,
    addressLabel: result.portal.listing.addressSerif,
    accessCode: result.portal.listing.accessCode,
    status: result.portal.listing.status,
  });
}
