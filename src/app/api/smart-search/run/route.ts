import { NextRequest, NextResponse } from "next/server";
import { authorizeSearchInput } from "@/lib/search/interpret";
import { SMART_SEARCH_QUERY_MAX } from "@/lib/search/plan";
import { runAuthorizedPlan } from "@/lib/search/run";
import { clientIp } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rebuilds the plan on the server. Client SearchPlan is not authority.
 * CAD uses bounded text search + Wave 4B search lane. No Pro RPCs.
 */
export async function POST(request: NextRequest) {
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
  const ip = clientIp(request.headers);
  try {
    const result = await runAuthorizedPlan(plan, ip);
    return NextResponse.json(
      {
        explanation: result.plan.explanation,
        unknowns: result.plan.unknowns,
        coverageNote: result.plan.geography.footprintNote,
        lane: result.plan.lane,
        listingCap: result.listingCap,
        recordCap: result.recordCap,
        listings: result.listings,
        records: result.records,
        filters: result.plan.filters,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      { status: 503 },
    );
  }
}
