/**
 * Mux webhook signature verification for County Stories.
 * Unsigned or invalid callbacks must do nothing.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type MuxWebhookVerifyOk = { ok: true };
export type MuxWebhookVerifyFail = { ok: false; status: number; error: string };

const MAX_SKEW_SEC = 5 * 60;

function parseMuxSignature(header: string): { timestamp: string; signatures: string[] } | null {
  const parts = header.split(",").map((part) => part.trim());
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 1) continue;
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) return null;
  return { timestamp, signatures };
}

export function verifyMuxWebhookSignature(opts: {
  payload: string;
  signature: string | null;
  secret: string | null;
  nowMs?: number;
}): MuxWebhookVerifyOk | MuxWebhookVerifyFail {
  const secret = opts.secret?.trim() ?? "";
  if (!secret) {
    return { ok: false, status: 503, error: "Mux webhook is not configured" };
  }
  const signature = opts.signature?.trim() ?? "";
  if (!signature) {
    return { ok: false, status: 401, error: "Missing webhook signature" };
  }
  const parsed = parseMuxSignature(signature);
  if (!parsed) {
    return { ok: false, status: 401, error: "Invalid webhook signature" };
  }
  const ts = Number(parsed.timestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, status: 401, error: "Invalid webhook signature" };
  }
  const nowSec = Math.floor((opts.nowMs ?? Date.now()) / 1000);
  if (Math.abs(nowSec - ts) > MAX_SKEW_SEC) {
    return { ok: false, status: 401, error: "Invalid webhook signature" };
  }
  const expected = createHmac("sha256", secret)
    .update(`${parsed.timestamp}.${opts.payload}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const matched = parsed.signatures.some((sig) => {
    const provided = Buffer.from(sig, "utf8");
    return (
      provided.length === expectedBuf.length &&
      timingSafeEqual(provided, expectedBuf)
    );
  });
  if (!matched) {
    return { ok: false, status: 401, error: "Invalid webhook signature" };
  }
  return { ok: true };
}

export function muxWebhookEventId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as { id?: unknown; data?: { id?: unknown } };
  if (typeof rec.id === "string" && rec.id.trim()) return rec.id.trim().slice(0, 200);
  return null;
}

export function muxWebhookEventType(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as { type?: unknown };
  return typeof rec.type === "string" ? rec.type : null;
}
