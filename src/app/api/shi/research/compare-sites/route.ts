import { NextResponse } from "next/server";
import {
  comparePropertySites,
  type PropertyCompareSite,
} from "@/lib/shi/corridor-property-compare";
import type { TrafficStation } from "@/lib/shi/corridors";
import type { ResearchModeId } from "@/lib/shi/research-modes";
import { requireStoryPro } from "@/lib/shi/require-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sites = Array.isArray((body as { sites?: unknown }).sites)
    ? ((body as { sites: PropertyCompareSite[] }).sites)
    : [];
  const stations = Array.isArray((body as { stations?: unknown }).stations)
    ? ((body as { stations: TrafficStation[] }).stations)
    : [];
  const mode = (body as { mode?: ResearchModeId }).mode;

  if (sites.length < 2) {
    return NextResponse.json(
      { error: "Pick at least two properties to compare" },
      { status: 400 },
    );
  }

  const compare = comparePropertySites(sites, stations, mode);
  return NextResponse.json(
    { compare },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
