import { NextResponse } from "next/server";
import {
  DEFAULT_SCENARIO_ASSUMPTIONS,
  runGrowthScenario,
  type ScenarioAssumptions,
} from "@/lib/shi/growth-scenarios";
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

  const countyName =
    typeof (body as { countyName?: unknown }).countyName === "string"
      ? (body as { countyName: string }).countyName
      : "";
  if (!countyName) {
    return NextResponse.json({ error: "County is required" }, { status: 400 });
  }

  const assumptions = {
    ...DEFAULT_SCENARIO_ASSUMPTIONS,
    ...((body as { assumptions?: Partial<ScenarioAssumptions> }).assumptions ??
      {}),
  };

  const result = runGrowthScenario({
    countyName,
    assumptions,
    watch: (body as { watch?: null }).watch ?? null,
    station: (body as { station?: null }).station ?? null,
    countyStations: Array.isArray((body as { countyStations?: unknown }).countyStations)
      ? ((body as { countyStations: Parameters<typeof runGrowthScenario>[0]["countyStations"] })
          .countyStations)
      : [],
  });

  return NextResponse.json(
    { result },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
