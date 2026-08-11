import { NextResponse } from "next/server";
import type { DrawnBoundary } from "@/lib/geo";
import { createFarm, listFarms } from "@/lib/shi/farms";
import { requireStoryPro } from "@/lib/shi/require-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const farms = await listFarms(gate.supabase, gate.user.id);
    return NextResponse.json({ farms });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not load farms (apply migration 0026?)",
        farms: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  let body: {
    name?: string;
    countySource?: string;
    countyName?: string;
    boundary?: DrawnBoundary;
    mapCenterLat?: number | null;
    mapCenterLng?: number | null;
    mapZoom?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const farm = await createFarm(gate.supabase, gate.user.id, {
      name: body.name ?? "",
      countySource: body.countySource ?? "",
      countyName: body.countyName,
      boundary: body.boundary as DrawnBoundary,
      mapCenterLat: body.mapCenterLat,
      mapCenterLng: body.mapCenterLng,
      mapZoom: body.mapZoom,
    });
    return NextResponse.json({ farm }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not create farm (apply migration 0026?)",
      },
      { status: 400 },
    );
  }
}
