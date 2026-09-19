import { NextResponse } from "next/server";
import { authorizeSearchInput } from "@/lib/search/interpret";
import { SMART_SEARCH_QUERY_MAX } from "@/lib/search/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * First-party query interpretation. No model. No CAD rows.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const q =
    body && typeof body === "object"
      ? String(
          (body as { q?: unknown }).q ??
            (body as { query?: unknown }).query ??
            "",
        )
      : "";
  if (q.length > SMART_SEARCH_QUERY_MAX) {
    return NextResponse.json(
      { error: "Search is too long." },
      { status: 400 },
    );
  }
  const plan = authorizeSearchInput(body);
  return NextResponse.json(
    {
      plan: {
        rawQuery: plan.rawQuery,
        route: plan.route,
        lane: plan.lane,
        geography: {
          labels: plan.geography.labels,
          kind: plan.geography.kind,
          inFootprint: plan.geography.inFootprint,
          footprintNote: plan.geography.footprintNote,
        },
        filters: plan.filters,
        unknowns: plan.unknowns,
        explanation: plan.explanation,
        recordsEligible: plan.recordsEligible,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
