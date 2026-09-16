import { NextRequest, NextResponse } from "next/server";
import type { CadSearchField } from "@/lib/cad-layers";
import { CAD_SEARCH_FIELDS } from "@/lib/cad-layers";
import { boundedCadSearch, CAD_SEARCH_MAX } from "@/lib/cad/bounded-search";
import { CAD_SEARCH_MIN_CHARS } from "@/lib/cad/public-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIELDS = new Set(CAD_SEARCH_FIELDS.map((f) => f.id));

/**
 * Bounded public parcel search. Not a warehouse dump.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const source = (req.nextUrl.searchParams.get("source") ?? "").trim();
  const fieldRaw = (req.nextUrl.searchParams.get("field") ?? "all").trim();
  const field = (FIELDS.has(fieldRaw as CadSearchField)
    ? fieldRaw
    : "all") as CadSearchField;
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 25);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 25;

  if (q.length < CAD_SEARCH_MIN_CHARS) {
    return NextResponse.json({ parcels: [] });
  }

  try {
    const parcels = await boundedCadSearch({
      query: q,
      source: source || undefined,
      field,
      limit: Math.min(limit, CAD_SEARCH_MAX),
    });
    return NextResponse.json(
      { parcels },
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Parcel search failed" },
      { status: 503 },
    );
  }
}
