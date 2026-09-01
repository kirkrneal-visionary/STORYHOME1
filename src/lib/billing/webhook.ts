import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Payment webhook boundary — provider not chosen yet.
 *
 * secret = SERVER ONLY (BILLING_WEBHOOK_SECRET).
 * Never NEXT_PUBLIC_*.
 * Never process an unsigned body as a trusted payment event.
 * Client checkout redirect is not entitlement.
 */

export type WebhookVerifyOk = { ok: true };
export type WebhookVerifyFail = { ok: false; status: number; error: string };

export function verifyBillingWebhookSignature(opts: {
  payload: string;
  signature: string | null;
  secret: string | null;
}): WebhookVerifyOk | WebhookVerifyFail {
  const secret = opts.secret?.trim() ?? "";
  if (!secret) {
    return {
      ok: false,
      status: 503,
      error: "Payment webhook is not configured",
    };
  }
  const signature = opts.signature?.trim() ?? "";
  if (!signature) {
    return { ok: false, status: 401, error: "Missing webhook signature" };
  }

  const expected = createHmac("sha256", secret)
    .update(opts.payload)
    .digest("hex");

  const provided = signature.replace(/^sha256=/, "");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: "Invalid webhook signature" };
  }
  return { ok: true };
}

export function billingEventId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as { id?: unknown; event_id?: unknown };
  if (typeof rec.id === "string" && rec.id.trim()) return rec.id.trim().slice(0, 200);
  if (typeof rec.event_id === "string" && rec.event_id.trim()) {
    return rec.event_id.trim().slice(0, 200);
  }
  return null;
}
