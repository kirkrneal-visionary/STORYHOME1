import { NextResponse } from "next/server";
import { RESEARCH_LIDAR_COPY } from "@/lib/shi/research-lidar";
import { readResearchLidarProfile } from "@/lib/shi/research-lidar-tiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function point(lngRaw: string | null, latRaw: string | null) {
  const lng = Number(lngRaw);
  const lat = Number(latRaw);
  if (
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }
  return { lng, lat };
}

/**
 * Elevation slice between two points from USGS 3DEP getSamples.
 * 1-meter ground. Not a survey.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const a = point(url.searchParams.get("lng1"), url.searchParams.get("lat1"));
  const b = point(url.searchParams.get("lng2"), url.searchParams.get("lat2"));
  if (!a || !b) {
    return NextResponse.json({ error: "bad cut" }, { status: 400 });
  }

  try {
    const profile = await readResearchLidarProfile(a, b);
    if (!profile) {
      return NextResponse.json({ error: "no slice" }, { status: 404 });
    }
    return NextResponse.json({
      ...profile,
      honesty: RESEARCH_LIDAR_COPY.honesty,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "lidar profile";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
