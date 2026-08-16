import { NextRequest, NextResponse } from "next/server";
import {
  fetchDeedsForParcel,
  isClerkCoverageReady,
} from "@/lib/shi/deeds-clerk";
import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
} from "@/lib/shi/corridors";
import { requireStoryPro } from "@/lib/shi/require-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * DC-5 — Clerk deeds dark store (launch 7 only).
 * Always returns userReveal:false until clerk-grade coverage opens.
 * Clients must show nothing when retracted — no teaser, no upsell.
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
  const propId = (sp.get("propId") ?? "").trim() || null;
  const latRaw = sp.get("lat");
  const lngRaw = sp.get("lng");
  const lat = latRaw != null && latRaw !== "" ? Number(latRaw) : null;
  const lng = lngRaw != null && lngRaw !== "" ? Number(lngRaw) : null;

  if (!isLaunchCorridorFips(countyFips)) {
    const fallback = resolveCorridorCounty(null);
    return NextResponse.json(
      {
        error: `Deeds desk supports the launch 7 counties only. Try countyFips=${fallback.fips}.`,
      },
      { status: 400 },
    );
  }

  if (!propId && (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng))) {
    return NextResponse.json(
      { error: "propId or lat+lng required" },
      { status: 400 },
    );
  }

  const deeds = await fetchDeedsForParcel({
    countyFips,
    propId,
    lat: lat != null && Number.isFinite(lat) ? lat : null,
    lng: lng != null && Number.isFinite(lng) ? lng : null,
  });

  return NextResponse.json({
    deeds,
    coverageReady: isClerkCoverageReady(countyFips),
    dark: !deeds.userReveal,
    county: {
      fips: countyFips,
      name: resolveCorridorCounty(countyFips).name,
    },
  });
}
