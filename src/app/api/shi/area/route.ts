import { NextResponse } from "next/server";
import type { DrawnBoundary } from "@/lib/geo";
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
 * SHI-2 — area analysis for a drawn boundary (Story Pro only).
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
      ? ((body as { source: string }).source.trim() || undefined)
      : undefined;

  if (!isBoundary(boundary)) {
    return NextResponse.json(
      { error: "boundary is required (polygon | circle | rectangle | viewport)" },
      { status: 400 },
    );
  }

  try {
    const metrics = await analyzeArea(gate.supabase, { boundary, source });
    return NextResponse.json({ metrics });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Area analysis failed" },
      { status: 400 },
    );
  }
}
