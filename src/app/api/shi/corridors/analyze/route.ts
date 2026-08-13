import { NextResponse } from "next/server";
import type { DrawnBoundary } from "@/lib/geo";
import { composeCorridorAnalysis } from "@/lib/shi/corridor-analysis";
import { isLaunchCorridorFips, resolveCorridorCounty } from "@/lib/shi/corridors";
import { analyzeArea } from "@/lib/shi/area";
import { requireStoryPro } from "@/lib/shi/require-pro";
import { fetchCountyTraffic } from "@/lib/shi/traffic-txdot";
import { fetchTxdotProjectsNear } from "@/lib/shi/txdot-projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isBoundary(v: unknown): v is DrawnBoundary {
  if (!v || typeof v !== "object") return false;
  const t = (v as { type?: string }).type;
  return (
    t === "polygon" ||
    t === "circle" ||
    t === "rectangle" ||
    t === "viewport"
  );
}

/**
 * Corridors V.1 — Draw an Area → geographic development intelligence.
 * Reuses bounded analyzeArea + TxDOT traffic. Never mutates CAD.
 */
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

  const boundary = (body as { boundary?: unknown }).boundary;
  const countyFipsRaw =
    typeof (body as { countyFips?: unknown }).countyFips === "string"
      ? (body as { countyFips: string }).countyFips.trim()
      : "";

  if (!isBoundary(boundary)) {
    return NextResponse.json(
      { error: "Draw an area on the map first" },
      { status: 400 },
    );
  }
  if (!countyFipsRaw || !isLaunchCorridorFips(countyFipsRaw)) {
    return NextResponse.json(
      { error: "Pick a launch county before analyzing" },
      { status: 400 },
    );
  }

  const county = resolveCorridorCounty(countyFipsRaw);

  let area;
  try {
    area = await analyzeArea(gate.supabase, {
      boundary,
      source: county.source,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Could not analyze property in this area",
      },
      { status: 400 },
    );
  }

  let stations: Awaited<ReturnType<typeof fetchCountyTraffic>>["stations"] = [];
  let watchAreas: NonNullable<
    Awaited<ReturnType<typeof fetchCountyTraffic>>["watch"]
  >["areas"] = [];
  let cadPulseAvailable = false;
  let cadPulseNote: string | null = null;
  let trafficError: string | null = null;
  try {
    const traffic = await fetchCountyTraffic(county.fips, {
      cadRecentEventCount: 0,
    });
    stations = traffic.stations;
    watchAreas = traffic.watch?.areas ?? [];
    cadPulseAvailable = Boolean(traffic.watch?.cadPulse?.available);
    cadPulseNote = traffic.watch?.cadPulse?.note ?? null;
  } catch (e) {
    trafficError =
      e instanceof Error ? e.message : "Traffic history temporarily unavailable";
  }

  let projectCount = 0;
  let projectsAvailable = true;
  try {
    const proj = await fetchTxdotProjectsNear({
      bbox: county.bbox,
      county,
      limit: 40,
    });
    projectCount = proj.projectCount;
  } catch {
    projectsAvailable = false;
  }

  const result = composeCorridorAnalysis({
    countyName: county.name,
    countyFips: county.fips,
    boundary,
    area,
    stations,
    watchAreas,
    trafficAvailable: !trafficError,
    trafficError,
    projectCount,
    projectsAvailable,
    cadPulseAvailable,
    cadPulseNote,
  });

  return NextResponse.json({ analysis: result });
}
