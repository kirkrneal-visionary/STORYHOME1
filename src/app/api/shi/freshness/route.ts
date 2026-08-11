import { NextResponse } from "next/server";
import { requireStoryPro } from "@/lib/shi/require-pro";
import { getCountyFreshness } from "@/lib/shi/server-properties";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SHI-1 — pro-safe county freshness chips (no internal source URLs / keys).
 */
export async function GET() {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const counties = await getCountyFreshness(gate.supabase);
    return NextResponse.json({
      refreshIntervalHours: 72,
      counties,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Freshness lookup failed",
        counties: [],
      },
      { status: 500 },
    );
  }
}
