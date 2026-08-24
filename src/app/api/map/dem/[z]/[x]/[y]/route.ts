import { NextResponse } from "next/server";
import {
  RESEARCH_DEM_MAX_ZOOM,
  researchDemUpstreamUrl,
} from "@/lib/shi/research-map-camera";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ z: string; x: string; y: string }> };

const UA =
  "StoryHome-ResearchDEM/1.0 (+https://storyhome-1-eqmg.vercel.app)";

/**
 * Public elevation tiles for Research 3D.
 * Proxied so the browser can load them (upstream S3 has no CORS).
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { z: zs, x: xs, y: ys } = await ctx.params;
  const z = Number(zs);
  const x = Number(xs);
  const y = Number(String(ys).replace(/\.(png|jpg|jpeg)$/i, ""));
  if (![z, x, y].every((n) => Number.isInteger(n))) {
    return NextResponse.json({ error: "bad tile" }, { status: 400 });
  }
  if (z < 0 || z > RESEARCH_DEM_MAX_ZOOM) {
    return NextResponse.json({ error: "zoom" }, { status: 400 });
  }
  const max = 2 ** z;
  if (x < 0 || y < 0 || x >= max || y >= max) {
    return NextResponse.json({ error: "tile" }, { status: 400 });
  }

  try {
    const res = await fetch(researchDemUpstreamUrl(z, x, y), {
      headers: { "User-Agent": UA },
    });
    if (!res.ok) {
      return new NextResponse(null, {
        status: res.status === 404 ? 204 : 502,
      });
    }
    const body = await res.arrayBuffer();
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "dem upstream" }, { status: 502 });
  }
}
