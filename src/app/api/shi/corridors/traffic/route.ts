import { NextRequest, NextResponse } from "next/server";
import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
} from "@/lib/shi/corridors";
import { softCacheCountyTraffic } from "@/lib/shi/corridor-segment-cache";
import { listCountyChanges } from "@/lib/shi/county-changes";
import { requireStoryPro } from "@/lib/shi/require-pro";
import { fetchCountyTraffic } from "@/lib/shi/traffic-txdot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** TxDOT pagination — allow headroom on Pro plan / Fluid. */
export const maxDuration = 60;

/**
 * Corridors traffic + Growth Watch (Wave 2) for one launch county (Pro only).
 */
export async function GET(req: NextRequest) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const fips =
    req.nextUrl.searchParams.get("countyFips") ||
    req.nextUrl.searchParams.get("fips") ||
    "";

  if (!fips || !isLaunchCorridorFips(fips)) {
    const fallback = resolveCorridorCounty(null);
    return NextResponse.json(
      {
        error: `Corridors supports the launch 7 counties only. Try countyFips=${fallback.fips} (${fallback.name}).`,
      },
      { status: 400 },
    );
  }

  const county = resolveCorridorCounty(fips);

  try {
    let cadRecentEventCount = 0;
    try {
      const since = new Date();
      since.setDate(since.getDate() - 120);
      const events = await listCountyChanges(gate.supabase, {
        source: county.source,
        limit: 40,
        since: since.toISOString(),
      });
      cadRecentEventCount = events.length;
    } catch {
      cadRecentEventCount = 0;
    }

    const payload = await fetchCountyTraffic(fips, { cadRecentEventCount });
    /* C2.0-C — soft-warm segment/obs cache; never block live TxDOT. */
    void softCacheCountyTraffic({
      countyFips: fips,
      segments: payload.segments ?? [],
      stations: payload.stations ?? [],
    });
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not load TxDOT traffic for this county",
      },
      { status: 502 },
    );
  }
}
