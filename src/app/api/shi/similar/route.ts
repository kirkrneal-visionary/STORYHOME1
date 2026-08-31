import { NextResponse } from "next/server";
import { publicError } from "@/lib/security/validate";
import { requireStoryPro } from "@/lib/shi/require-pro";
import {
  DEFAULT_SIMILAR_CRITERIA,
  findSimilarProperties,
  type SimilarCriteria,
} from "@/lib/shi/similar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  let body: {
    source?: string;
    propId?: string;
    criteria?: Partial<SimilarCriteria>;
    limit?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.source?.trim() || !body.propId?.trim()) {
    return NextResponse.json(
      { error: "source and propId are required" },
      { status: 400 },
    );
  }
  try {
    const result = await findSimilarProperties(gate.supabase, {
      source: body.source,
      propId: body.propId,
      criteria: { ...DEFAULT_SIMILAR_CRITERIA, ...body.criteria },
      limit: body.limit,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: publicError(e, "Find Similar failed") },
      { status: 400 },
    );
  }
}
