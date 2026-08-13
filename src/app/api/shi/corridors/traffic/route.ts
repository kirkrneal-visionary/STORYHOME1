import { NextRequest, NextResponse } from "next/server";
import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
} from "@/lib/shi/corridors";
import { requireStoryPro } from "@/lib/shi/require-pro";
import { fetchCountyTraffic } from "@/lib/shi/traffic-txdot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** TxDOT pagination — allow headroom on Pro plan / Fluid. */
export const maxDuration = 60;

/**
 * ARCHIE-CORRIDORS-TRAFFIC — TxDOT AADT stations + corridor segments
 * for one launch county (Pro only).
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
        error: `Corridors Wave 1 supports the launch 7 counties only. Try countyFips=${fallback.fips} (${fallback.name}).`,
      },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchCountyTraffic(fips);
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
