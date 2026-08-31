import { NextResponse } from "next/server";
import type { DrawnBoundary } from "@/lib/geo";
import { publicError } from "@/lib/security/validate";
import { requireStoryPro } from "@/lib/shi/require-pro";
import { analyzeArea } from "@/lib/shi/area";

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
 * SHI Market Frame analyzer — county-locked, capped, on-demand.
 * Returns individual parcel values + estimated area market total.
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
  const source =
    typeof (body as { source?: unknown }).source === "string"
      ? (body as { source: string }).source.trim()
      : "";

  if (!isBoundary(boundary)) {
    return NextResponse.json(
      { error: "boundary is required (box, freehand, or radius)" },
      { status: 400 },
    );
  }
  if (!source) {
    return NextResponse.json(
      { error: "Pick a county before analyzing" },
      { status: 400 },
    );
  }

  try {
    const analysis = await analyzeArea(gate.supabase, { boundary, source });
    return NextResponse.json({ analysis, metrics: analysis });
  } catch (e) {
    return NextResponse.json(
      { error: publicError(e, "Area analysis failed") },
      { status: 400 },
    );
  }
}
