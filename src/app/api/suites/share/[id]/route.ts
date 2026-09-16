import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  }
  const { id } = await ctx.params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    return NextResponse.json({ error: "Suite not found" }, { status: 404 });
  }
  try {
    const { data, error } = await supabase.rpc("suite_share", { p_id: id });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return NextResponse.json({ error: "Suite not found" }, { status: 404 });
    }
    return NextResponse.json({
      suite: {
        id: row.id,
        name: row.name,
        description: "",
        coverTone: "",
        listingIds: (row.listing_ids ?? []).filter(Boolean),
        createdAt: "",
        updatedAt: "",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Suite not found" },
      { status: 404 },
    );
  }
}
