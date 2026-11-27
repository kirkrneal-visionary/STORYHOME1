import { NextResponse } from "next/server";
import { probeGoogleSatelliteTile } from "@/lib/shi/google-map-tiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Polk / Livingston — launch-7 footprint sample tile. */
const PROBE_Z = 15;
const PROBE_X = 6718;
const PROBE_Y = 13295;

/**
 * Live Google Map Tiles diagnostic (server env + one session + one tile).
 * Never returns secrets.
 */
export async function GET() {
  const report = await probeGoogleSatelliteTile(PROBE_Z, PROBE_X, PROBE_Y);
  return NextResponse.json({ ok: true, ...report });
}