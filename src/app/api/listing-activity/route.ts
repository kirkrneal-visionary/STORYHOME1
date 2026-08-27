import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_UA =
  /bot|crawler|spider|crawling|preview|slurp|wget|curl|python-requests|httpclient|headless|lighthouse|pagespeed|uptime|monitor|vercel-screenshot|healthcheck/i;

function isObviousBot(ua: string): boolean {
  return BOT_UA.test(ua);
}

function visitorHash(
  listingId: string,
  kind: string,
  ip: string,
  ua: string,
  day: string,
): string {
  return createHash("sha256")
    .update(`${listingId}|${kind}|${day}|${ip}|${ua}`)
    .digest("hex")
    .slice(0, 48);
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "0.0.0.0";
}

function serviceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Record a measured seller listing view or save.
 * Daily visitor-hash dedupe. Obvious bots skipped.
 * Soft-succeeds when DB is unavailable — never blocks the product.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const listingId =
    typeof (body as { listing_id?: unknown }).listing_id === "string"
      ? (body as { listing_id: string }).listing_id.trim()
      : "";
  const kind =
    typeof (body as { kind?: unknown }).kind === "string"
      ? (body as { kind: string }).kind.trim()
      : "";
  if (!listingId || (kind !== "view" && kind !== "save")) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const ua = request.headers.get("user-agent") || "";
  if (isObviousBot(ua)) {
    return NextResponse.json({ ok: true, stored: false, reason: "bot_skipped" });
  }

  const sb = serviceRole();
  if (!sb) {
    return NextResponse.json({ ok: true, stored: false, reason: "no_supabase" });
  }

  const day = new Date().toISOString().slice(0, 10);
  const fingerprint = visitorHash(listingId, kind, clientIp(request), ua, day);
  const since = `${day}T00:00:00.000Z`;

  try {
    const { data: existing } = await sb
      .from("listing_analytics_events")
      .select("id")
      .eq("listing_id", listingId)
      .eq("event_type", kind)
      .eq("viewer_fingerprint", fingerprint)
      .gte("created_at", since)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true, stored: false, reason: "deduped" });
    }

    const { error: evErr } = await sb.from("listing_analytics_events").insert({
      listing_id: listingId,
      event_type: kind,
      viewer_fingerprint: fingerprint,
    });
    if (evErr) {
      return NextResponse.json({
        ok: true,
        stored: false,
        reason: "event_write_failed",
      });
    }

    const { data: row } = await sb
      .from("listing_analytics")
      .select("views, saves, views_this_week, saves_this_week")
      .eq("listing_id", listingId)
      .maybeSingle();

    const next = {
      listing_id: listingId,
      views: Number(row?.views ?? 0) + (kind === "view" ? 1 : 0),
      saves: Number(row?.saves ?? 0) + (kind === "save" ? 1 : 0),
      views_this_week:
        Number(row?.views_this_week ?? 0) + (kind === "view" ? 1 : 0),
      saves_this_week:
        Number(row?.saves_this_week ?? 0) + (kind === "save" ? 1 : 0),
      updated_at: new Date().toISOString(),
    };

    const { error: upErr } = await sb
      .from("listing_analytics")
      .upsert(next, { onConflict: "listing_id" });
    if (upErr) {
      return NextResponse.json({
        ok: true,
        stored: true,
        reason: "aggregate_write_failed",
      });
    }

    return NextResponse.json({ ok: true, stored: true });
  } catch {
    return NextResponse.json({ ok: true, stored: false, reason: "soft_fail" });
  }
}
