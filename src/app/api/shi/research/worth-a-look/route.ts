import { NextRequest, NextResponse } from "next/server";
import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
} from "@/lib/shi/corridors";
import {
  AREA_POSITION_SCAN_CAP,
  PARCEL_POSITION_AREA_ENGINE,
  WORTH_A_LOOK_DISCLAIMER,
  WORTH_A_LOOK_LIMIT,
} from "@/lib/shi/parcel-position-area";
import {
  PARCEL_POSITION_OBJECTIVE_ENGINE,
  isPositionObjective,
  pickWorthALookForObjective,
  toLookCandidate,
  type PositionObjective,
} from "@/lib/shi/parcel-position-objective";
import {
  loadCountyScanContext,
  scanAreaPositions,
  type AreaScanInputParcel,
} from "@/lib/shi/parcel-position-scan";
import { emptyAreaSnapshot } from "@/lib/shi/parcel-position-profile";
import { requireStoryPro } from "@/lib/shi/require-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const hits = new Map<string, number[]>();

function allowLook(userId: string, max = 8, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) return false;
  arr.push(now);
  hits.set(userId, arr);
  return true;
}

function asInputParcels(raw: unknown): AreaScanInputParcel[] {
  if (!Array.isArray(raw)) return [];
  const out: AreaScanInputParcel[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const propId = (row as { propId?: unknown }).propId;
    if (typeof propId !== "string" || !propId.trim()) continue;
    const lat = (row as { lat?: unknown }).lat;
    const lng = (row as { lng?: unknown }).lng;
    const acres = (row as { acres?: unknown }).acres;
    out.push({
      propId: propId.trim(),
      lat: typeof lat === "number" ? lat : Number(lat),
      lng: typeof lng === "number" ? lng : Number(lng),
      acres: typeof acres === "number" ? acres : Number(acres),
    });
  }
  return out.slice(0, AREA_POSITION_SCAN_CAP);
}

/**
 * After Analyze This Area — short "worth a look" list from parcel position.
 * Not Find Strongest Sites. Not a 0–100 score. Launch 7 · Story Pro.
 */
export async function POST(req: NextRequest) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  if (!allowLook(gate.user.id)) {
    return NextResponse.json(
      { error: "Give that a moment — too many area looks just now." },
      { status: 429 },
    );
  }

  let body: {
    countyFips?: string;
    parcels?: unknown;
    objective?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fips = (body.countyFips ?? "").trim();
  if (!fips || !isLaunchCorridorFips(fips)) {
    const fallback = resolveCorridorCounty(null);
    return NextResponse.json(
      {
        error: `Worth a look works in the launch 7 counties. Try countyFips=${fallback.fips}.`,
      },
      { status: 400 },
    );
  }

  const parcels = asInputParcels(body.parcels);
  if (parcels.length === 0) {
    return NextResponse.json(
      { error: "Analyze an area first — no parcels to look at." },
      { status: 400 },
    );
  }

  const county = resolveCorridorCounty(fips);

  try {
    const context = await loadCountyScanContext({
      supabase: gate.supabase,
      countyFips: county.fips,
      countyName: county.name,
      source: county.source,
    });
    const scanned = await scanAreaPositions({
      supabase: gate.supabase,
      context,
      parcels,
    });
    const objective: PositionObjective = isPositionObjective(body.objective)
      ? body.objective
      : "road_position";
    const candidates = scanned.map(toLookCandidate);
    const worthALook = pickWorthALookForObjective(scanned, {
      limit: WORTH_A_LOOK_LIMIT,
      objective,
    });
    const frame = emptyAreaSnapshot();
    frame.parcelCount = scanned.length;
    frame.note =
      "Area counts belong to the study — not to any one property. Worth a look is a short list, not a ranking.";

    return NextResponse.json({
      engine: PARCEL_POSITION_AREA_ENGINE,
      pickEngine: PARCEL_POSITION_OBJECTIVE_ENGINE,
      objective,
      scanned: scanned.length,
      worthALook,
      candidates,
      frame,
      disclaimer: WORTH_A_LOOK_DISCLAIMER,
      county: { fips: county.fips, name: county.name, source: county.source },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Could not pick properties worth a look",
      },
      { status: 502 },
    );
  }
}
