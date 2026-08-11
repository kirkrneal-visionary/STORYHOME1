import { NextResponse } from "next/server";
import { requireStoryPro } from "@/lib/shi/require-pro";
import { addProspectNote } from "@/lib/shi/prospects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await ctx.params;
  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const note = await addProspectNote(
      gate.supabase,
      gate.user.id,
      id,
      body.body ?? "",
    );
    return NextResponse.json({ note }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not add note" },
      { status: 400 },
    );
  }
}
