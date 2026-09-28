import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import { stageCountyStorySegment } from "@/lib/county-stories/composition-service";
import { supabaseCountyStoryStorage } from "@/lib/county-stories/media-service";
import { requireCountyStoryPublisher } from "@/lib/county-stories/require-publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireCountyStoryPublisher();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const admin = countyStoryAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "Unable to stage." }, { status: 503 });
  const { id } = await ctx.params;
  let body: {
    position?: number;
    contentType?: string;
    byteSize?: number;
    durationMs?: number;
    facing?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const facing = body.facing === "user" || body.facing === "environment" || body.facing === "upload" ? body.facing : "upload";
  const result = await stageCountyStorySegment({
    admin,
    storage: supabaseCountyStoryStorage(admin),
    ownerId: auth.user.id,
    mediaId: id,
    position: Number(body.position ?? 0),
    declaredType: body.contentType ?? "",
    byteSize: Number(body.byteSize ?? 0),
    durationMs: Number(body.durationMs ?? 0),
    facing,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
