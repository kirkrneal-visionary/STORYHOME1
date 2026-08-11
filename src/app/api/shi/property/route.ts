import { NextResponse } from "next/server";
import { requireStoryPro } from "@/lib/shi/require-pro";
import { getProperty } from "@/lib/shi/server-properties";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SHI — single Property Intelligence record (Story Pro only).
 * Disambiguates colliding prop_ids via source / preferredSource / click lat-lng.
 */
export async function GET(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { searchParams } = new URL(request.url);
  const propId = (searchParams.get("propId") ?? "").trim();
  if (!propId) {
    return NextResponse.json(
      { error: "propId is required", property: null },
      { status: 400 },
    );
  }

  const source = searchParams.get("source")?.trim() || undefined;
  const countyFips = searchParams.get("countyFips")?.trim() || undefined;
  const preferredSource =
    searchParams.get("preferredSource")?.trim() || undefined;
  const nearLat = Number(searchParams.get("nearLat"));
  const nearLng = Number(searchParams.get("nearLng"));

  try {
    const property = await getProperty(gate.supabase, {
      propId,
      source,
      countyFips,
      preferredSource,
      nearLat: Number.isFinite(nearLat) ? nearLat : undefined,
      nearLng: Number.isFinite(nearLng) ? nearLng : undefined,
    });
    if (!property) {
      return NextResponse.json({ property: null }, { status: 404 });
    }
    return NextResponse.json({ property });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Lookup failed",
        property: null,
      },
      { status: 500 },
    );
  }
}
