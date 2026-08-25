import { NextResponse } from "next/server";
import { researchLidarTileValid } from "@/lib/shi/research-lidar";
import { getResearchLidarDemTile } from "@/lib/shi/research-lidar-tiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Ctx = { params: Promise<{ z: string; x: string; y: string }> };

/**
 * 3DEP bare-earth heights as Terrarium PNG for MapLibre terrain.
 * All Texas (and the rest of 3DEP). Not a survey.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { z: zs, x: xs, y: ys } = await ctx.params;
  const z = Number(zs);
  const x = Number(xs);
  const y = Number(String(ys).replace(/\.(png|jpg|jpeg)$/i, ""));

  if (!researchLidarTileValid(z, x, y)) {
    return NextResponse.json({ error: "bad tile" }, { status: 400 });
  }

  try {
    const tile = await getResearchLidarDemTile(z, x, y);
    if (!tile) {
      return NextResponse.json(
        { error: "no elevation for this tile" },
        { status: 404 },
      );
    }
    return new NextResponse(new Uint8Array(tile.body), {
      status: 200,
      headers: {
        "Content-Type": tile.contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
        "X-Story-Lidar-Product": "dem",
        "X-Story-Lidar-Cached": tile.cached ? "1" : "0",
        "X-Story-Terrain-Source": tile.source,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "lidar dem";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
