import { NextResponse } from "next/server";
import { listCountyChanges } from "@/lib/shi/county-changes";
import { requireStoryPro } from "@/lib/shi/require-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * County observation change feed — Archie-detected CAD diffs between pulls.
 * Not deed history. Not seller probability.
 */
export async function GET(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const url = new URL(request.url);
  const source = url.searchParams.get("source")?.trim() || "";
  const since = url.searchParams.get("since")?.trim() || null;
  const field = url.searchParams.get("field")?.trim() || null;
  const limit = Number(url.searchParams.get("limit") || "40");

  if (!source) {
    return NextResponse.json(
      { error: "source is required (county CAD key)", changes: [] },
      { status: 400 },
    );
  }

  try {
    const changes = await listCountyChanges(gate.supabase, {
      source,
      since,
      field,
      limit,
    });
    return NextResponse.json({
      changes,
      note: "Archie-observed CAD field changes between county file loads — not deed or sale dates.",
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Could not load change feed",
        changes: [],
      },
      { status: 500 },
    );
  }
}
