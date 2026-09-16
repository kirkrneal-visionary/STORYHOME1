import { NextResponse } from "next/server";
import type { CorridorAnalysisResult } from "@/lib/shi/corridor-analysis";
import { compareCorridorAnalyses } from "@/lib/shi/corridor-compare";
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

  const left = (body as { left?: CorridorAnalysisResult }).left;
  const right = (body as { right?: CorridorAnalysisResult }).right;
  const labels = (body as { labels?: { left?: string; right?: string } }).labels;
  if (!left || !right) {
    return NextResponse.json(
      { error: "Two analyses are required to compare" },
      { status: 400 },
    );
  }

  const compare = compareCorridorAnalyses(left, right, labels);
  return NextResponse.json(
    { compare },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
