import { NextRequest, NextResponse } from "next/server";
import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
} from "@/lib/shi/corridors";
import { buildMultifamilyRead } from "@/lib/shi/multifamily-read";
import { requireStoryPro } from "@/lib/shi/require-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Multifamily evidence read for one parcel (launch 7).
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
  const propId = (sp.get("propId") ?? "").trim();
  const source = (sp.get("source") ?? "").trim();
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const acresRaw = sp.get("acres");
  const acres =
    acresRaw != null && acresRaw !== "" ? Number(acresRaw) : null;

  if (!isLaunchCorridorFips(countyFips)) {
    return NextResponse.json(
      { error: "Multifamily research supports the launch 7 counties only." },
      { status: 400 },
    );
  }
  if (!propId || !source) {
    return NextResponse.json(
      { error: "propId and source are required" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 },
    );
  }

  const read = await buildMultifamilyRead({
    propId,
    source,
    countyFips,
    lat,
    lng,
    acres: acres != null && Number.isFinite(acres) ? acres : null,
    address: sp.get("address"),
    ownerName: sp.get("ownerName"),
    frontageFt: sp.get("frontageFt") ? Number(sp.get("frontageFt")) : null,
    primaryRoad: sp.get("primaryRoad"),
    secondaryRoad: sp.get("secondaryRoad"),
  });

  return NextResponse.json({ read });
}
