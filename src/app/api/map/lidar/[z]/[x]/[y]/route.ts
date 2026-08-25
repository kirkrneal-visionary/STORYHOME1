import { NextResponse } from "next/server";
import {
  parseResearchLidarProduct,
  researchLidarTileValid,
} from "@/lib/shi/research-lidar";
import { getResearchLidarTile } from "@/lib/shi/research-lidar-tiles";
import { LAUNCH7_TILE_CACHE_CONTROL } from "@/lib/shi/research-map-paint";

export const runtime = "nodejs";
export const revalidate = 86400;
export const maxDuration = 30;

type Ctx = { params: Promise<{ z: string; x: string; y: string }> };

/**
 * Research LiDAR surfaces — ground / slope / aspect / contours from USGS 3DEP
 * (Texas StratMap lidar lives in 3DEP).
 * ?p=ground|slope|aspect|contours
 */
export async function GET(req: Request, ctx: Ctx) {
  const { z: zs, x: xs, y: ys } = await ctx.params;
  const product =
    parseResearchLidarProduct(new URL(req.url).searchParams.get("p")) ??
    "ground";
  const z = Number(zs);
  const x = Number(xs);
  const y = Number(String(ys).replace(/\.(png|jpg|jpeg)$/i, ""));

  if (!researchLidarTileValid(z, x, y)) {
    return NextResponse.json({ error: "bad tile" }, { status: 400 });
  }

  try {
    const tile = await getResearchLidarTile(product, z, x, y);
    if (!tile) {
      return new NextResponse(null, { status: 204 });
    }
    return new NextResponse(new Uint8Array(tile.body), {
      status: 200,
      headers: {
        "Content-Type": tile.contentType,
        "Cache-Control": LAUNCH7_TILE_CACHE_CONTROL,
        "Access-Control-Allow-Origin": "*",
        "X-Story-Lidar-Product": product,
        "X-Story-Lidar-Cached": tile.cached ? "1" : "0",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "lidar upstream";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
