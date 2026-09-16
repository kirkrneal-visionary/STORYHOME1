import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUITES_CAPS } from "@/lib/suites";
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

export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireSuitesAccess();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await ctx.params;
  let body: { listingId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const listingId = (body.listingId ?? "").trim();
  if (!listingId) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  try {
    const current = await loadOne(gate.supabase, gate.user.id, id);
    if (!current) {
      return NextResponse.json({ error: "Suite not found" }, { status: 404 });
    }
    if (current.listingIds.includes(listingId)) {
      return NextResponse.json({ suite: current });
    }
    if (current.listingIds.length >= SUITES_CAPS.maxHomes) {
      return NextResponse.json(
        { error: `Home limit for this album (${SUITES_CAPS.maxHomes}).` },
        { status: 400 },
      );
    }
    const { error } = await gate.supabase.from("suite_items").insert({
      suite_id: id,
      listing_id: listingId,
      sort_order:
        current.listingIds.length === 0 ? 0 : -current.listingIds.length,
    });
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      throw error;
    }
    await gate.supabase
      .from("suites")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", gate.user.id);
    const suite = await loadOne(gate.supabase, gate.user.id, id);
    return NextResponse.json({ suite });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not add home." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const gate = await requireSuitesAccess();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await ctx.params;
  const listingId = new URL(request.url).searchParams.get("listingId") ?? "";
  if (!listingId) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }
  try {
    const { error } = await gate.supabase
      .from("suite_items")
      .delete()
      .eq("suite_id", id)
      .eq("listing_id", listingId);
    if (error) throw error;
    const suite = await loadOne(gate.supabase, gate.user.id, id);
    if (!suite) {
      return NextResponse.json({ error: "Suite not found" }, { status: 404 });
    }
    return NextResponse.json({ suite });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not remove home." },
      { status: 400 },
    );
  }
}
