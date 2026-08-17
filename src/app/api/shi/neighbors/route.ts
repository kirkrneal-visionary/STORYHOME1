import { NextRequest, NextResponse } from "next/server";
import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
} from "@/lib/shi/corridors";
import {
  fetchParcelNeighbors,
  PARCEL_NEIGHBORS_BUFFER_M,
  PARCEL_NEIGHBORS_VERSION,
} from "@/lib/shi/parcel-neighbors";
import { requireStoryPro } from "@/lib/shi/require-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * ARCHIE-NEIGHBORS N1 — CAD polygon neighbors (touches / near buffer).
 * Launch 7 · Story Pro. Soft-fails empty — never invents boundaries.
 */
export async function GET(req: NextRequest) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const sp = req.nextUrl.searchParams;
  const propId = (sp.get("propId") ?? "").trim();
  const source = (sp.get("source") ?? "").trim();
  const countyFips =
    (sp.get("countyFips") ?? sp.get("fips") ?? "").trim() ||
    resolveCorridorCounty(null).fips;
  const subjectCadOwnerId = (sp.get("cadOwnerId") ?? "").trim() || null;
  const bufferRaw = sp.get("bufferM");
  const bufferM =
    bufferRaw != null && bufferRaw !== "" && Number.isFinite(Number(bufferRaw))
      ? Math.min(Math.max(Number(bufferRaw), 0), 20)
      : PARCEL_NEIGHBORS_BUFFER_M;

  if (!propId || !source) {
    return NextResponse.json(
      { error: "propId and source are required" },
      { status: 400 },
    );
  }

  if (!isLaunchCorridorFips(countyFips)) {
    const fallback = resolveCorridorCounty(null);
    return NextResponse.json(
      {
        error: `Neighbors desk supports the launch 7 counties only. Try countyFips=${fallback.fips}.`,
      },
      { status: 400 },
    );
  }

  const result = await fetchParcelNeighbors({
    supabase: gate.supabase,
    propId,
    source,
    subjectCadOwnerId,
    bufferM,
  });

  return NextResponse.json({
    version: PARCEL_NEIGHBORS_VERSION,
    neighbors: result,
    county: {
      fips: countyFips,
      name: resolveCorridorCounty(countyFips).name,
    },
  });
}
