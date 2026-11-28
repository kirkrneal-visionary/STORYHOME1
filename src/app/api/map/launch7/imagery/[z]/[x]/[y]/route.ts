import { NextResponse } from "next/server";
import { getLaunch7ImageryTile } from "@/lib/shi/launch7-tiles";
import { LAUNCH7_TILE_CACHE_CONTROL } from "@/lib/shi/research-map-paint";

export const runtime = "nodejs";
export const revalidate = 86400;
/** Esri pass-through + one fast fallback must finish before Vercel’s default 10s cap. */
export const maxDuration = 30;

const FALLBACK_TILE_CACHE_CONTROL = "public, max-age=300, s-maxage=300";
/** Google / Esri license: no server/CDN tile store — browser may cache briefly. */
const LICENSED_TILE_CACHE_CONTROL = "private, max-age=300";

type Ctx = { params: Promise<{ z: string; x: string; y: string }> };

/**
 * L7-2 — Imagery/Hybrid satellite tiles (one vendor per request).
 * Google Maps satellite (world) when LAUNCH7_GOOGLE_IMAGERY_ENABLED + key —
 * miss returns 204 (client retries; no Esri/USGS/NAIP swap).
 * Esri World Imagery only when Google is off (footprint-bounded).
 * NAIP / USGS only when neither paid path is active (local/dev cache).
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
        "Cache-Control":
          tile.imageryKind === "google-satellite" ||
          tile.imageryKind === "esri-world"
            ? LICENSED_TILE_CACHE_CONTROL
            : tile.imageryKind?.endsWith("-fallback")
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
