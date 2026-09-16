import { NextResponse } from "next/server";
import {
  DEFAULT_INTELLIGENCE_SCENARIO_ASSUMPTIONS,
  runIntelligenceScenario,
  type IntelligenceScenarioAssumptions,
} from "@/lib/shi/intelligence-scenarios";
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

  const assumptions = {
    ...DEFAULT_INTELLIGENCE_SCENARIO_ASSUMPTIONS,
    ...((body as { assumptions?: Partial<IntelligenceScenarioAssumptions> })
      .assumptions ?? {}),
  };

  const result = runIntelligenceScenario({
    subjectCadValue:
      typeof (body as { subjectCadValue?: unknown }).subjectCadValue === "number"
        ? (body as { subjectCadValue: number }).subjectCadValue
        : null,
    taxYearCount: Number((body as { taxYearCount?: unknown }).taxYearCount) || 0,
    lookalike: (body as { lookalike?: null }).lookalike ?? null,
    assumptions,
  });

  return NextResponse.json(
    { result },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
