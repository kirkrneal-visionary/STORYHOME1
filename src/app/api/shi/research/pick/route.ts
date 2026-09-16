import { NextResponse } from "next/server";
import {
  pickFromCandidates,
  type LookCandidate,
  type PositionObjective,
} from "@/lib/shi/parcel-position-objective";
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

  const candidates = Array.isArray((body as { candidates?: unknown }).candidates)
    ? ((body as { candidates: LookCandidate[] }).candidates)
    : [];
  const objective = (body as { objective?: PositionObjective }).objective;

  const worthALook = pickFromCandidates(candidates, { objective });
  return NextResponse.json(
    { worthALook },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
