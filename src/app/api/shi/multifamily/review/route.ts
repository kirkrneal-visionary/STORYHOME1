import { NextRequest, NextResponse } from "next/server";
import type { DrawnBoundary } from "@/lib/geo";
import { analyzeArea } from "@/lib/shi/area";
import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
} from "@/lib/shi/corridors";
import { reviewMultifamilyFrame } from "@/lib/shi/multifamily-review";
import { requireStoryPro } from "@/lib/shi/require-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REVIEW_CAP = 120;

/**
 * Multifamily site review for a drawn Market Frame.
 * Evidence groups — not a 0–100 score.
 */
export async function POST(req: NextRequest) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: {
    countyFips?: string;
    boundary?: DrawnBoundary;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fips = (body.countyFips ?? "").trim();
  if (!fips || !isLaunchCorridorFips(fips)) {
    return NextResponse.json(
      { error: "Multifamily research supports the launch 7 counties only." },
      { status: 400 },
    );
  }
  if (!body.boundary) {
    return NextResponse.json(
      { error: "Draw or select a market frame first." },
      { status: 400 },
    );
  }

  const county = resolveCorridorCounty(fips);
  try {
    const area = await analyzeArea(gate.supabase, {
      boundary: body.boundary,
      source: county.source,
    });
    const sorted = [...area.parcels].sort(
      (a, b) => (b.legalAcreage ?? 0) - (a.legalAcreage ?? 0),
    );
    const slice = sorted.slice(0, REVIEW_CAP);
    const review = await reviewMultifamilyFrame({
      sites: slice.map((p) => ({
        propId: p.propId,
        source: p.source,
        label: p.situsAddress,
        acres: p.legalAcreage,
        lat: p.centroidLat,
        lng: p.centroidLng,
        countyFips: fips,
      })),
      parcelCount: area.parcelCount,
      medianAcres: area.medianAcres,
      capped: area.capped || slice.length < area.parcels.length,
    });

    return NextResponse.json({
      review,
      county: { fips: county.fips, name: county.name, source: county.source },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not review this study area for multifamily.",
      },
      { status: 502 },
    );
  }
}
