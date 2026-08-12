import { NextResponse } from "next/server";
import { requireStoryPro } from "@/lib/shi/require-pro";
import {
  convertProspectToSellerLead,
  getProspect,
  updateProspectStatus,
  updateProspectTags,
} from "@/lib/shi/prospects";

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
    const prospect = await getProspect(gate.supabase, gate.user.id, id);
    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }
    return NextResponse.json({ prospect });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not load prospect" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await ctx.params;
  let body: {
    status?: string;
    tags?: string[];
    convertToSellerLead?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (body.convertToSellerLead) {
      const result = await convertProspectToSellerLead(
        gate.supabase,
        gate.user.id,
        id,
      );
      return NextResponse.json(result);
    }
    if (Array.isArray(body.tags)) {
      const prospect = await updateProspectTags(
        gate.supabase,
        gate.user.id,
        id,
        body.tags,
      );
      return NextResponse.json({ prospect });
    }
    if (!body.status) {
      return NextResponse.json(
        { error: "status, tags, or convertToSellerLead is required" },
        { status: 400 },
      );
    }
    const prospect = await updateProspectStatus(
      gate.supabase,
      gate.user.id,
      id,
      body.status,
    );
    return NextResponse.json({ prospect });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not update prospect" },
      { status: 400 },
    );
  }
}
