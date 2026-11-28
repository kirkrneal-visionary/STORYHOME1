import { NextResponse } from "next/server";
import { ownedTileStats } from "@/lib/shi/launch7-tiles";
import { launch7OpsStatus } from "@/lib/shi/launch7-ops";
import { launch7MapMeta } from "@/lib/shi/launch7-map";
import {
  ensureGoogleMapTileSession,
  launch7GoogleImageryActive,
  probeGoogleSatelliteTile,
} from "@/lib/shi/google-map-tiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * L7-3 — launch-7 map ops status (CDN / R2 readiness + footprint).
 * Maps prefetch this before creating the style — warm the Google session on
 * this isolate so the first imagery tiles skip createSession latency.
 */
export async function GET(req: Request) {
  const ops = launch7OpsStatus();
  const meta = launch7MapMeta();
  let cache = { streetsBytes: 0, imageryBytes: 0, root: "" };
  try {
    cache = ownedTileStats();
  } catch {
    /* ignore */
  }
  if (launch7GoogleImageryActive()) {
    void ensureGoogleMapTileSession();
  }
  const url = new URL(req.url);
  const body: Record<string, unknown> = {
    ok: true,
    ...ops,
    map: meta,
    cache: {
      root: cache.root,
      streetsBytes: cache.streetsBytes,
      imageryBytes: cache.imageryBytes,
    },
  };
  if (url.searchParams.get("googleDiag") === "1") {
    body.googleDiag = await probeGoogleSatelliteTile(15, 6718, 13295);
  }
  return NextResponse.json(body);
}
