import { NextResponse } from "next/server";
import { getOwnerPortfolio } from "@/lib/shi/portfolio";
import { requireStoryPro } from "@/lib/shi/require-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const url = new URL(request.url);
  const source = url.searchParams.get("source")?.trim() || "";
  const propId = url.searchParams.get("propId")?.trim() || "";
  if (!source || !propId) {
    return NextResponse.json(
      { error: "source and propId are required" },
      { status: 400 },
    );
  }
  try {
    const portfolio = await getOwnerPortfolio(gate.supabase, {
      source,
      propId,
      cadOwnerId: url.searchParams.get("cadOwnerId"),
      ownerName: url.searchParams.get("ownerName"),
    });
    return NextResponse.json({ portfolio });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not load portfolio" },
      { status: 400 },
    );
  }
}
