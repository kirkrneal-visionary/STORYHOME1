import { NextResponse } from "next/server";
import {
  ingestProductAnalyticsEvent,
  isCatalogEvent,
} from "@/lib/analytics/ingest";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * First-party product analytics ingest.
 * Accepts catalog events only. Soft-succeeds when table is not applied yet.
 * Never stores message bodies / CAD PII (server scrub).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const event =
    typeof (body as { event?: unknown }).event === "string"
      ? (body as { event: string }).event.trim()
      : "";
  if (!isCatalogEvent(event)) {
    return NextResponse.json({ ok: false, reason: "unknown_event" }, { status: 400 });
  }

  const propsRaw = (body as { props?: unknown }).props;
  const props =
    propsRaw && typeof propsRaw === "object" && !Array.isArray(propsRaw)
      ? (propsRaw as Record<string, unknown>)
      : {};

  const clientAt =
    typeof (body as { at?: unknown }).at === "string"
      ? (body as { at: string }).at
      : null;

  const supabase = await getServerSupabase();
  if (!supabase) {
    // Demo / unconfigured — acknowledge without storage.
    return NextResponse.json({ ok: true, stored: false, reason: "no_supabase" });
  }

  let userId: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  const result = await ingestProductAnalyticsEvent(supabase, {
    event,
    props,
    clientAt,
    userId,
  });

  if (!result.ok) {
    // Soft success for missing migration — client must never retry-storm UX.
    if (result.reason === "table_missing") {
      return NextResponse.json({
        ok: true,
        stored: false,
        reason: "table_missing",
      });
    }
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, stored: true, id: result.id });
}
