import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSuitesAccess } from "@/lib/suites-access";
import { rowToSuite, type SuiteItemRow, type SuiteRow } from "@/lib/suites-account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function loadOne(supabase: SupabaseClient, userId: string, id: string) {
  const { data, error } = await supabase
    .from("suites")
    .select(
      "id, user_id, name, description, cover_tone, cover_url, created_at, updated_at",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: items, error: itemError } = await supabase
    .from("suite_items")
    .select("suite_id, listing_id, sort_order, created_at")
    .eq("suite_id", id);
  if (itemError) throw itemError;
  return rowToSuite(data as SuiteRow, (items ?? []) as SuiteItemRow[]);
}

export async function GET(_request: Request, ctx: Ctx) {
  const gate = await requireSuitesAccess();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await ctx.params;
  try {
    const suite = await loadOne(gate.supabase, gate.user.id, id);
    if (!suite) {
      return NextResponse.json({ error: "Suite not found" }, { status: 404 });
    }
    return NextResponse.json({ suite });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not load suite." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const gate = await requireSuitesAccess();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await ctx.params;
  let body: { name?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const patch: { name?: string; description?: string } = {};
  if (typeof body.name === "string") patch.name = body.name.trim() || "Untitled Suite";
  if (typeof body.description === "string") patch.description = body.description;
  try {
    const { error } = await gate.supabase
      .from("suites")
      .update(patch)
      .eq("id", id)
      .eq("user_id", gate.user.id);
    if (error) throw error;
    const suite = await loadOne(gate.supabase, gate.user.id, id);
    if (!suite) {
      return NextResponse.json({ error: "Suite not found" }, { status: 404 });
    }
    return NextResponse.json({ suite });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not update suite." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const gate = await requireSuitesAccess();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await ctx.params;
  try {
    const { error } = await gate.supabase
      .from("suites")
      .delete()
      .eq("id", id)
      .eq("user_id", gate.user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not delete suite." },
      { status: 400 },
    );
  }
}
