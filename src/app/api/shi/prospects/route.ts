import { NextResponse } from "next/server";
import { isShiProspectStatus } from "@/lib/shi/prospect-statuses";
import { requireStoryPro } from "@/lib/shi/require-pro";
import {
  ensureProspect,
  listProspects,
  prospectSummaryCounts,
} from "@/lib/shi/prospects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim() || undefined;
  const q = url.searchParams.get("q")?.trim() || undefined;
  try {
    const [prospects, summary] = await Promise.all([
      listProspects(gate.supabase, gate.user.id, { status, q }),
      prospectSummaryCounts(gate.supabase, gate.user.id),
    ]);
    return NextResponse.json({ prospects, summary });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not load prospects (apply migration 0025?)",
        prospects: [],
        summary: { total: 0, byStatus: {} },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  let body: {
    source?: string;
    propId?: string;
    countyFips?: string | null;
    countyName?: string;
    label?: string | null;
    ownerName?: string | null;
    situsAddress?: string | null;
    situsCity?: string | null;
    legalAcreage?: number | null;
    marketValue?: number | null;
    centroidLat?: number | null;
    centroidLng?: number | null;
    status?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await ensureProspect(gate.supabase, gate.user.id, {
      source: body.source ?? "",
      propId: body.propId ?? "",
      countyFips: body.countyFips,
      countyName: body.countyName ?? "",
      label: body.label,
      ownerName: body.ownerName,
      situsAddress: body.situsAddress,
      situsCity: body.situsCity,
      legalAcreage: body.legalAcreage,
      marketValue: body.marketValue,
      centroidLat: body.centroidLat,
      centroidLng: body.centroidLng,
      status:
        body.status && isShiProspectStatus(body.status)
          ? body.status
          : undefined,
    });
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not save prospect (apply migration 0025?)",
      },
      { status: 400 },
    );
  }
}
