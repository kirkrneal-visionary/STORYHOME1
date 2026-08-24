import { NextResponse } from "next/server";
import {
  metersToFeet,
  RESEARCH_LIDAR_COPY,
} from "@/lib/shi/research-lidar";
import { readResearchLidarElevation } from "@/lib/shi/research-lidar-tiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * Ground elevation at a point from USGS 3DEP (Texas lidar lives here).
 * Meters + feet. Not a survey.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "bad point" }, { status: 400 });
  }

  try {
    const meters = await readResearchLidarElevation(lng, lat);
    if (meters == null) {
      return NextResponse.json({ error: "no elevation" }, { status: 404 });
    }
    return NextResponse.json({
      meters,
      feet: Math.round(metersToFeet(meters) * 10) / 10,
      source: "usgs-3dep",
      honesty: RESEARCH_LIDAR_COPY.honesty,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "lidar identify";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
