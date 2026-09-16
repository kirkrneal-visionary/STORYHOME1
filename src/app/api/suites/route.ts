import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUITES_CAPS } from "@/lib/suites";
import { requireSuitesAccess } from "@/lib/suites-access";
import {
  nextCoverTone,
  rowToSuite,
  type SuiteItemRow,
  type SuiteRow,
} from "@/lib/suites-account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadOwnSuites(supabase: SupabaseClient, userId: string) {
  const { data: rows, error } = await supabase
    .from("suites")
    .select(
      "id, user_id, name, description, cover_tone, cover_url, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const suites = (rows ?? []) as SuiteRow[];
  const ids = suites.map((s) => s.id);
  let items: SuiteItemRow[] = [];
  if (ids.length > 0) {
    const { data: itemRows, error: itemError } = await supabase
      .from("suite_items")
      .select("suite_id, listing_id, sort_order, created_at")
      .in("suite_id", ids);
    if (itemError) throw itemError;
    items = (itemRows ?? []) as SuiteItemRow[];
  }
  return suites.map((row) =>
    rowToSuite(
      row,
      items.filter((i) => i.suite_id === row.id),
    ),
  );
}

export async function GET() {
  const gate = await requireSuitesAccess();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const suites = await loadOwnSuites(gate.supabase, gate.user.id);
    return NextResponse.json({ suites });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Could not load suites.",
        suites: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const gate = await requireSuitesAccess();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: {
    name?: string;
    description?: string;
    coverTone?: string;
    listingIds?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim() || "Untitled Suite";
  const listingIds = (body.listingIds ?? []).filter(Boolean).slice(0, SUITES_CAPS.maxHomes);

  try {
    const existing = await loadOwnSuites(gate.supabase, gate.user.id);
    if (existing.length >= SUITES_CAPS.maxAlbums) {
      return NextResponse.json(
        { error: `Album limit (${SUITES_CAPS.maxAlbums}).` },
        { status: 400 },
      );
    }

    const { data, error } = await gate.supabase
      .from("suites")
      .insert({
        user_id: gate.user.id,
        name,
        description: body.description ?? "",
        cover_tone: body.coverTone || nextCoverTone(existing.length),
      })
      .select(
        "id, user_id, name, description, cover_tone, cover_url, created_at, updated_at",
      )
      .single();
    if (error) throw error;
    const row = data as SuiteRow;

    if (listingIds.length > 0) {
      const { error: itemError } = await gate.supabase.from("suite_items").insert(
        listingIds.map((listingId, i) => ({
          suite_id: row.id,
          listing_id: listingId,
          sort_order: i,
        })),
      );
      if (itemError && !itemError.message.toLowerCase().includes("duplicate")) {
        throw itemError;
      }
    }

    const suites = await loadOwnSuites(gate.supabase, gate.user.id);
    const suite = suites.find((s) => s.id === row.id) ?? rowToSuite(row, []);
    return NextResponse.json({ suite, suites }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create suite." },
      { status: 400 },
    );
  }
}
