import { NextResponse } from "next/server";
import { answerCorridorAsk } from "@/lib/shi/corridor-ask";
import { requireStoryPro } from "@/lib/shi/require-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * Ask Archie — keyword/intention processing on the server.
 * Client sends desk context already loaded. Recipe stays here.
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

  const q =
    typeof (body as { q?: unknown }).q === "string"
      ? (body as { q: string }).q
      : "";
  const context = (body as { context?: Parameters<typeof answerCorridorAsk>[1] })
    .context;
  if (!q.trim()) {
    return NextResponse.json({ error: "Ask a question first" }, { status: 400 });
  }
  if (!context || typeof context !== "object") {
    return NextResponse.json({ error: "Desk context is required" }, { status: 400 });
  }

  const answer = answerCorridorAsk(q, {
    countyName: context.countyName ?? "",
    stations: Array.isArray(context.stations) ? context.stations : [],
    watchAreas: Array.isArray(context.watchAreas) ? context.watchAreas : [],
    selectedParcel: context.selectedParcel ?? null,
    selectedStation: context.selectedStation ?? null,
    parcelIntel: context.parcelIntel ?? null,
    rankedSites: Array.isArray(context.rankedSites) ? context.rankedSites : [],
    hasAnalysisBoundary: Boolean(context.hasAnalysisBoundary),
    compareCount: Number(context.compareCount) || 0,
    flood: context.flood ?? null,
    utilities: context.utilities ?? null,
    environment: context.environment ?? null,
  });

  return NextResponse.json(
    { answer },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
