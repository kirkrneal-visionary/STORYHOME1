import { NextRequest, NextResponse } from "next/server";
import type { DrawnBoundary } from "@/lib/geo";
import { analyzeArea } from "@/lib/shi/area";
import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
} from "@/lib/shi/corridors";
import { rankSitesByCommercialExposure } from "@/lib/shi/corridor-exposure";
import { requireStoryPro } from "@/lib/shi/require-pro";
import { fetchCountyTraffic } from "@/lib/shi/traffic-txdot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * C2.0-D — Find Strongest Sites in a drawn/selected area.
 * Deterministic commercial-exposure ranking — no LLM scores.
 */
export async function POST(req: NextRequest) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: {
    countyFips?: string;
    boundary?: DrawnBoundary;
    limit?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fips = (body.countyFips ?? "").trim();
  if (!fips || !isLaunchCorridorFips(fips)) {
    const fallback = resolveCorridorCounty(null);
    return NextResponse.json(
      {
        error: `Corridors supports the launch 7 counties only. Try countyFips=${fallback.fips}.`,
      },
      { status: 400 },
    );
  }
  if (!body.boundary) {
    return NextResponse.json(
      { error: "boundary is required (draw or select an area first)" },
      { status: 400 },
    );
  }

  const county = resolveCorridorCounty(fips);
  const limit =
    typeof body.limit === "number" && body.limit > 0
      ? Math.min(24, Math.floor(body.limit))
      : 12;

  try {
    const [area, traffic] = await Promise.all([
      analyzeArea(gate.supabase, {
        boundary: body.boundary,
        source: county.source,
      }),
      fetchCountyTraffic(fips),
    ]);

    const sites = rankSitesByCommercialExposure({
      parcels: area.parcels.map((p) => ({
        propId: p.propId,
        source: p.source,
        centroidLat: p.centroidLat,
        centroidLng: p.centroidLng,
        situsAddress: p.situsAddress,
        ownerName: p.ownerName,
        legalAcreage: p.legalAcreage,
        marketValue: p.marketValue,
      })),
      stations: traffic.stations ?? [],
      limit,
    });

    return NextResponse.json({
      county: { fips: county.fips, name: county.name, source: county.source },
      parcelCount: area.parcelCount,
      capped: Boolean(area.capped),
      sites,
      honesty:
        "Ranked by commercial-exposure-v1 (traffic factors + land size). Not zoning, sale, or investment advice. No AI-invented scores.",
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Could not rank strongest sites",
      },
      { status: 502 },
    );
  }
}
