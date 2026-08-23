import { NextRequest, NextResponse } from "next/server";
import type { DrawnBoundary } from "@/lib/geo";
import { analyzeArea } from "@/lib/shi/area";
import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
} from "@/lib/shi/corridors";
import {
  rankSitesByCommercialExposure,
  scoreCommercialExposure,
} from "@/lib/shi/corridor-exposure";
import type { CorridorParcelPick } from "@/lib/shi/corridor-parcel-traffic";
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
    lens?: string;
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
  const modeLens = body.lens === "mode";
  const limit =
    typeof body.limit === "number" && body.limit > 0
      ? Math.min(modeLens ? 36 : 24, Math.floor(body.limit))
      : modeLens
        ? 24
        : 12;

  try {
    const area = await analyzeArea(gate.supabase, {
      boundary: body.boundary,
      source: county.source,
    });
    const traffic = modeLens
      ? { stations: [] }
      : await fetchCountyTraffic(fips);

    const mapped = area.parcels.map((p) => ({
      propId: p.propId,
      source: p.source,
      centroidLat: p.centroidLat,
      centroidLng: p.centroidLng,
      situsAddress: p.situsAddress,
      ownerName: p.ownerName,
      legalAcreage: p.legalAcreage,
      marketValue: p.marketValue,
    }));

    const sites = modeLens
      ? [...mapped]
          .filter(
            (p) =>
              Number.isFinite(p.centroidLat) && Number.isFinite(p.centroidLng),
          )
          .sort((a, b) => (b.legalAcreage ?? 0) - (a.legalAcreage ?? 0))
          .slice(0, limit)
          .map((p) => {
            const pick: CorridorParcelPick = {
              propId: p.propId,
              source: p.source,
              lat: p.centroidLat,
              lng: p.centroidLng,
              situsAddress: p.situsAddress ?? null,
              ownerName: p.ownerName ?? null,
              legalAcreage: p.legalAcreage ?? null,
              marketValue: p.marketValue ?? null,
            };
            return {
              propId: p.propId,
              source: p.source,
              lat: p.centroidLat,
              lng: p.centroidLng,
              situsAddress: p.situsAddress ?? null,
              ownerName: p.ownerName ?? null,
              legalAcreage: p.legalAcreage ?? null,
              marketValue: p.marketValue ?? null,
              commercial: scoreCommercialExposure({
                pick,
                stations: [],
                legalAcreage: p.legalAcreage,
              }),
              rank: 0,
            };
          })
      : rankSitesByCommercialExposure({
          parcels: mapped,
          stations: traffic.stations ?? [],
          limit,
        });

    return NextResponse.json({
      county: { fips: county.fips, name: county.name, source: county.source },
      parcelCount: area.parcelCount,
      capped: Boolean(area.capped),
      sites,
      honesty: modeLens
        ? "Candidates for a research-mode review — not a universal 0–100 score. Not zoning, sale, or investment advice."
        : "Ranked by commercial-exposure-v1 (traffic factors + land size). Not zoning, sale, or investment advice. No AI-invented scores.",
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
