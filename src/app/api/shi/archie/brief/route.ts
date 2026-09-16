import { NextResponse } from "next/server";
import { buildArchiePropertyBrief } from "@/lib/shi/archie-phase1";
import { requireStoryPro } from "@/lib/shi/require-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * Archie property brief — parcel-specific findings, not the scoring recipe.
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

  const property = (body as { property?: unknown }).property;
  if (!property || typeof property !== "object") {
    return NextResponse.json({ error: "Property is required" }, { status: 400 });
  }

  const brief = buildArchiePropertyBrief({
    property: property as Parameters<typeof buildArchiePropertyBrief>[0]["property"],
    exactOwnerCount: Number((body as { exactOwnerCount?: unknown }).exactOwnerCount) || 0,
    possibleOwnerCount:
      Number((body as { possibleOwnerCount?: unknown }).possibleOwnerCount) || 0,
    matches: Array.isArray((body as { matches?: unknown }).matches)
      ? ((body as { matches: Parameters<typeof buildArchiePropertyBrief>[0]["matches"] })
          .matches)
      : [],
    accessIntel: (body as { accessIntel?: null }).accessIntel ?? null,
    stations: Array.isArray((body as { stations?: unknown }).stations)
      ? ((body as { stations: Parameters<typeof buildArchiePropertyBrief>[0]["stations"] })
          .stations)
      : [],
    parcelNeighbors: (body as { parcelNeighbors?: null }).parcelNeighbors ?? null,
  });

  return NextResponse.json(
    { brief },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
