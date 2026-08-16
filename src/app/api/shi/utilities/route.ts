import { NextRequest, NextResponse } from "next/server";
import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
} from "@/lib/shi/corridors";
import { requireStoryPro } from "@/lib/shi/require-pro";
import {
  fetchUtilitiesAtPoint,
  isUtilitiesCoverageReady,
} from "@/lib/shi/utilities-ccn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * DC-2 — PUCT water/sewer CCN at a point (launch 7 only).
 * Returns userReveal:false when the owned dataset cannot be read.
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
        error: `Utilities desk supports the launch 7 counties only. Try countyFips=${fallback.fips}.`,
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

  const utilities = await fetchUtilitiesAtPoint({ countyFips, lat, lng });

  return NextResponse.json({
    utilities,
    coverageReady: isUtilitiesCoverageReady(countyFips),
    county: {
      fips: countyFips,
      name: resolveCorridorCounty(countyFips).name,
    },
  });
}
