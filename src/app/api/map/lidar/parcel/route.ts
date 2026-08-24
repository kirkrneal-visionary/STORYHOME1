import { NextResponse } from "next/server";
import { wgs84BboxTo3857 } from "@/lib/shi/research-lidar";
import { readResearchLidarParcelRaster } from "@/lib/shi/research-lidar-tiles";
import {
  RESEARCH_TERRAIN_COPY,
  buildResearchParcelTerrainStats,
  parcelBbox,
  pointInParcel,
} from "@/lib/shi/research-terrain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

type Body = {
  type?: "Polygon" | "MultiPolygon";
  coordinates?: number[][][] | number[][][][];
};

/**
 * Parcel terrain evidence from 3DEP raster sampling.
 * Visual relief / view height never enter this path.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (
    (body.type !== "Polygon" && body.type !== "MultiPolygon") ||
    !Array.isArray(body.coordinates)
  ) {
    return NextResponse.json({ error: "bad parcel" }, { status: 400 });
  }

  const geojson = {
    type: body.type,
    coordinates: body.coordinates,
  };
  const [west, south, east, north] = parcelBbox(geojson);
  if (![west, south, east, north].every(Number.isFinite) || east <= west || north <= south) {
    return NextResponse.json({ error: "empty parcel" }, { status: 400 });
  }

  try {
    const meters = await readResearchLidarParcelRaster(
      wgs84BboxTo3857(west, south, east, north),
      64,
    );
    if (!meters) {
      return NextResponse.json({ error: "no elevation" }, { status: 404 });
    }
    const size = Math.round(Math.sqrt(meters.length));
    if (size * size !== meters.length) {
      return NextResponse.json({ error: "bad raster" }, { status: 502 });
    }
    const stats = buildResearchParcelTerrainStats({
      meters,
      width: size,
      height: size,
      west,
      south,
      east,
      north,
      inside: (lng, lat) => pointInParcel(lng, lat, geojson),
    });
    if (!stats) {
      return NextResponse.json({ error: "too few samples" }, { status: 404 });
    }
    return NextResponse.json({
      ...stats,
      sourceLabel: RESEARCH_TERRAIN_COPY.source,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "parcel terrain";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
