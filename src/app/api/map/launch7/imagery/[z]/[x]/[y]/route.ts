import { NextResponse } from "next/server";
import { getLaunch7ImageryTile } from "@/lib/shi/launch7-tiles";
import { LAUNCH7_TILE_CACHE_CONTROL } from "@/lib/shi/research-map-paint";

export const runtime = "nodejs";
export const revalidate = 86400;

const FALLBACK_TILE_CACHE_CONTROL = "public, max-age=300, s-maxage=300";

type Ctx = { params: Promise<{ z: string; x: string; y: string }> };

/**
 * L7-2 — owned launch-7 imagery tiles.
 * Close zoom: TOP 2015 50 cm from our PMTiles archive on R2 (LAUNCH7_TOP15_ENABLED),
 * USDA NAIP 60 cm outside it.
 * Far-out: USGS Imagery Only.
 * Serves from disk cache; fills upstream inside the footprint.
 * NAIP served because the archive was unreachable gets a short cache so TOP 2015 replaces it.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { z: zs, x: xs, y: ys } = await ctx.params;
  const z = Number(zs);
  const x = Number(xs);
  const y = Number(String(ys).replace(/\.(jpg|jpeg|png)$/i, ""));
  if (![z, x, y].every((n) => Number.isFinite(n))) {
    return NextResponse.json({ error: "bad tile" }, { status: 400 });
  }

  try {
    const tile = await getLaunch7ImageryTile(z, x, y);
    if (!tile) {
      return new NextResponse(null, { status: 204 });
    }
    return new NextResponse(new Uint8Array(tile.body), {
      status: 200,
      headers: {
        "Content-Type": tile.contentType,
        "Cache-Control": tile.imageryKind?.endsWith("-fallback")
          ? FALLBACK_TILE_CACHE_CONTROL
          : LAUNCH7_TILE_CACHE_CONTROL,
        "X-Launch7-Tile-Source": tile.source,
        "X-Launch7-Tile-Cached": tile.cached ? "1" : "0",
        "X-Launch7-Imagery-Kind": tile.imageryKind ?? "xyz",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "tile error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
