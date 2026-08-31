import { NextResponse } from "next/server";
import { publicError } from "@/lib/security/validate";
import { CAD_SEARCH_FIELDS, type CadSearchField } from "@/lib/cad-layers";
import { requireStoryPro } from "@/lib/shi/require-pro";
import { searchProperties } from "@/lib/shi/server-properties";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIELDS = new Set<string>(CAD_SEARCH_FIELDS.map((f) => f.id));

/**
 * SHI-1 — Property Intelligence search (Story Pro only).
 * Lean rows (no geojson). Prefer county-scoped queries.
 */
export async function GET(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ results: [], indexNote: null });
  }
  if (q.length < 2) {
    return NextResponse.json(
      { error: "Enter at least 2 characters", results: [] },
      { status: 400 },
    );
  }

  const fieldRaw = searchParams.get("field") ?? "all";
  const field: CadSearchField = FIELDS.has(fieldRaw)
    ? (fieldRaw as CadSearchField)
    : "all";
  const source = searchParams.get("source")?.trim() || undefined;
  const limit = Number(searchParams.get("limit") ?? 30);

  try {
    const { results, indexNote } = await searchProperties(gate.supabase, {
      q,
      source,
      field,
      limit: Number.isFinite(limit) ? limit : 30,
    });
    return NextResponse.json({ results, indexNote });
  } catch (e) {
    return NextResponse.json(
      {
        error: publicError(e, "Search failed"),
        results: [],
      },
      { status: 500 },
    );
  }
}
