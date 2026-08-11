import { NextResponse } from "next/server";
import { requireStoryPro } from "@/lib/shi/require-pro";
import { findOwnerMatches } from "@/lib/shi/owner-matches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SHI-2 — owner relationships (EXACT Owner ID / POSSIBLE name).
 */
export async function GET(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { searchParams } = new URL(request.url);
  const source = (searchParams.get("source") ?? "").trim();
  const propId = (searchParams.get("propId") ?? "").trim();
  if (!source || !propId) {
    return NextResponse.json(
      { error: "source and propId are required", matches: [] },
      { status: 400 },
    );
  }

  try {
    const result = await findOwnerMatches(gate.supabase, {
      source,
      propId,
      cadOwnerId: searchParams.get("cadOwnerId"),
      ownerName: searchParams.get("ownerName"),
      limit: Number(searchParams.get("limit") ?? 40),
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Owner match failed",
        matches: [],
      },
      { status: 500 },
    );
  }
}
