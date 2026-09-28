import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import { markCountyStorySegmentStored } from "@/lib/county-stories/composition-service";
import { requireCountyStoryPublisher } from "@/lib/county-stories/require-publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; segmentId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireCountyStoryPublisher();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const admin = countyStoryAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "Unable to save." }, { status: 503 });
  const { id, segmentId } = await ctx.params;
  let body: { byteSize?: number } = {};
  try {
    body = (await request.json()) as { byteSize?: number };
  } catch {
    body = {};
  }
  const result = await markCountyStorySegmentStored({
    admin,
    ownerId: auth.user.id,
    mediaId: id,
    segmentId,
    byteSize: Number(body.byteSize ?? 0),
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
