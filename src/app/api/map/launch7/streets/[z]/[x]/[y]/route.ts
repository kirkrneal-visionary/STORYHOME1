import { NextResponse } from "next/server";
import { getLaunch7StreetsTile } from "@/lib/shi/launch7-tiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ z: string; x: string; y: string }> };

/**
 * L7-2 — owned launch-7 street vector tiles.
 * Serves from disk cache; fills from OpenFreeMap inside the footprint.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { z: zs, x: xs, y: ys } = await ctx.params;
  const z = Number(zs);
  const x = Number(xs);
  const y = Number(String(ys).replace(/\.pbf$/i, ""));
  if (![z, x, y].every((n) => Number.isFinite(n))) {
    return NextResponse.json({ error: "bad tile" }, { status: 400 });
  }

  try {
    const tile = await getLaunch7StreetsTile(z, x, y);
    if (!tile) {
      return new NextResponse(null, { status: 204 });
    }
    return new NextResponse(new Uint8Array(tile.body), {
      status: 200,
      headers: {
        "Content-Type": tile.contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Launch7-Tile-Source": tile.source,
        "X-Launch7-Tile-Cached": tile.cached ? "1" : "0",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "tile error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
