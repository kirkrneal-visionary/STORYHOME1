import { NextRequest, NextResponse } from "next/server";
import {
  fetchFloodAtPoint,
  isFloodCoverageReady,
} from "@/lib/shi/flood-fema";
import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
} from "@/lib/shi/corridors";
import { requireStoryPro } from "@/lib/shi/require-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * DC-1 — FEMA flood fact at a point (launch 7 only).
 * Returns userReveal:false on failure so clients show nothing.
 */
export async function GET(req: NextRequest) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const sp = req.nextUrl.searchParams;
  const countyFips =
    (sp.get("countyFips") ?? sp.get("fips") ?? "").trim() ||
    resolveCorridorCounty(null).fips;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));

  if (!isLaunchCorridorFips(countyFips)) {
    const fallback = resolveCorridorCounty(null);
    return NextResponse.json(
      {
        error: `Flood desk supports the launch 7 counties only. Try countyFips=${fallback.fips}.`,
      },
      { status: 400 },
    );
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 },
    );
  }

  const flood = await fetchFloodAtPoint({ countyFips, lat, lng });

  return NextResponse.json({
    flood,
    coverageReady: isFloodCoverageReady(countyFips),
    county: {
      fips: countyFips,
      name: resolveCorridorCounty(countyFips).name,
    },
  });
}
