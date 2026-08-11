import { NextResponse } from "next/server";
import {
  deleteFarm,
  getFarmDetail,
  markFarmReviewed,
  renameFarm,
} from "@/lib/shi/farms";
import { requireStoryPro } from "@/lib/shi/require-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await ctx.params;
  try {
    const farm = await getFarmDetail(gate.supabase, gate.user.id, id);
    return NextResponse.json({ farm });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load farm";
    const status = msg === "Farm not found" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await ctx.params;
  let body: { name?: string; markReviewed?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    if (body.markReviewed) {
      const farm = await markFarmReviewed(gate.supabase, gate.user.id, id);
      return NextResponse.json({ farm });
    }
    if (body.name != null) {
      const farm = await renameFarm(
        gate.supabase,
        gate.user.id,
        id,
        body.name,
      );
      return NextResponse.json({ farm });
    }
    return NextResponse.json(
      { error: "name or markReviewed is required" },
      { status: 400 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not update farm" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await ctx.params;
  try {
    await deleteFarm(gate.supabase, gate.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not delete farm" },
      { status: 400 },
    );
  }
}
