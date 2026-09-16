import { NextResponse } from "next/server";
import type { RankedSite } from "@/lib/shi/corridor-exposure";
import {
  modeReviewFromRankedFacts,
  type ModeReviewResult,
} from "@/lib/shi/research-mode-reason";
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

  const mode = (body as { mode?: ResearchModeId }).mode;
  const sites = Array.isArray((body as { sites?: unknown }).sites)
    ? ((body as { sites: RankedSite[] }).sites)
    : [];
  if (!mode) {
    return NextResponse.json({ error: "Research mode is required" }, { status: 400 });
  }

  const review: ModeReviewResult = modeReviewFromRankedFacts(mode, sites, {
    parcelCount: Number((body as { parcelCount?: unknown }).parcelCount) || sites.length,
    totalAcres:
      typeof (body as { totalAcres?: unknown }).totalAcres === "number"
        ? (body as { totalAcres: number }).totalAcres
        : null,
    medianAcres:
      typeof (body as { medianAcres?: unknown }).medianAcres === "number"
        ? (body as { medianAcres: number }).medianAcres
        : null,
  });

  return NextResponse.json(
    { review },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
