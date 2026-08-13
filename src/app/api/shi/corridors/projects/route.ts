import { NextRequest, NextResponse } from "next/server";
import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
} from "@/lib/shi/corridors";
import { requireStoryPro } from "@/lib/shi/require-pro";
import { fetchTxdotProjectsNear } from "@/lib/shi/txdot-projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * TxDOT projects near a Corridors watch bbox (or full county bbox).
 */
export async function GET(req: NextRequest) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const fips = req.nextUrl.searchParams.get("countyFips") || "";
  if (!fips || !isLaunchCorridorFips(fips)) {
    return NextResponse.json(
      { error: "Launch county FIPS required" },
      { status: 400 },
    );
  }
  const county = resolveCorridorCounty(fips);

  const bboxRaw = req.nextUrl.searchParams.get("bbox") || "";
  let bbox: readonly [number, number, number, number] = county.bbox;
  if (bboxRaw) {
    const parts = bboxRaw.split(",").map(Number);
    if (
      parts.length === 4 &&
      parts.every((n) => Number.isFinite(n))
    ) {
      bbox = [parts[0], parts[1], parts[2], parts[3]] as const;
    }
  }

  try {
    const payload = await fetchTxdotProjectsNear({
      bbox,
      county,
      limit: 40,
    });
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not load TxDOT projects",
      },
      { status: 502 },
    );
  }
}
