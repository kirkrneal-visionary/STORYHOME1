import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  billingEventId,
  verifyBillingWebhookSignature,
} from "@/lib/billing/webhook";
import { logSecurityEvent } from "@/lib/security/log-event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Future payment webhook.
 * Rejects unsigned bodies. Does not grant Story Pro.
 * Does not delete user data. Provider not connected yet.
 */
export async function POST(request: Request) {
  const secret = process.env.BILLING_WEBHOOK_SECRET ?? null;
  const payload = await request.text();
  const signature =
    request.headers.get("x-webhook-signature") ||
    request.headers.get("stripe-signature");

  const verified = verifyBillingWebhookSignature({
    payload,
    signature,
    secret,
  });
  if (!verified.ok) {
    logSecurityEvent({
      kind:
        verified.status === 503
          ? "billing_webhook_unconfigured"
          : "billing_webhook_rejected",
      path: "/api/billing/webhook",
      status: verified.status,
    });
    return NextResponse.json(
      { error: verified.error },
      { status: verified.status },
    );
  }

  let body: unknown = null;
  try {
    body = payload ? JSON.parse(payload) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventId = billingEventId(body);
  if (eventId) {
    const stored = await recordWebhookEvent(eventId);
    if (stored === "duplicate") {
      return NextResponse.json({
        received: true,
        applied: false,
        reason: "duplicate_event",
      });
    }
  }

  return NextResponse.json({
    received: true,
    applied: false,
    reason: "provider_not_connected",
  });
}

async function recordWebhookEvent(
  eventId: string,
): Promise<"ok" | "duplicate" | "skip"> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return "skip";
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await sb.from("billing_webhook_events").insert({
    provider: "unset",
    provider_event_id: eventId,
    event_type: "unprocessed",
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message || "")) return "duplicate";
    return "skip";
  }
  return "ok";
}
