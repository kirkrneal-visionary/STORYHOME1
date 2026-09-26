import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import { readCountyStoryMuxEnv } from "@/lib/county-stories/mux-env";
import { verifyMuxWebhookSignature } from "@/lib/county-stories/mux-webhook";
import { applyCountyStoryMuxWebhook } from "@/lib/county-stories/provider-processing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mux processing callbacks. Signature required.
 * Updates provider/caption processing only. Never publishes, hides,
 * allocates, strikes, or changes ownership.
 */
export async function POST(request: Request) {
  const env = readCountyStoryMuxEnv();
  const payload = await request.text();
  const verified = verifyMuxWebhookSignature({
    payload,
    signature: request.headers.get("mux-signature"),
    secret: env?.webhookSecret ?? null,
  });
  if (!verified.ok) {
    return NextResponse.json({ ok: false, error: verified.error }, { status: verified.status });
  }
  let body: unknown = null;
  try {
    body = payload ? JSON.parse(payload) : null;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const admin = countyStoryAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unable to apply." }, { status: 503 });
  }
  const applied = await applyCountyStoryMuxWebhook({ admin, body });
  return NextResponse.json({
    ok: true,
    applied: applied.applied,
    replay: applied.replay,
    code: applied.code,
  });
}
