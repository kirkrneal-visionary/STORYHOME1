import { NextRequest, NextResponse } from "next/server";
import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
} from "@/lib/shi/corridors";
import { fetchEnvironmentAtPoint } from "@/lib/shi/environment-desk";
import { requireStoryPro } from "@/lib/shi/require-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

/**
 * DC-3 — Environment desk: NWI wetlands · TIGER place/ISD · zoning context.
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
        error: `Environment desk supports the launch 7 counties only. Try countyFips=${fallback.fips}.`,
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

  const environment = await fetchEnvironmentAtPoint({
    countyFips,
    lat,
    lng,
  });

  return NextResponse.json({
    environment,
    county: {
      fips: countyFips,
      name: resolveCorridorCounty(countyFips).name,
    },
  });
}
