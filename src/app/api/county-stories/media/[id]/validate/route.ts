import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import {
  supabaseCountyStoryStorage,
  validateCountyStoryMedia,
} from "@/lib/county-stories/media-service";
import { requireCountyStoryPublisher } from "@/lib/county-stories/require-publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const auth = await requireCountyStoryPublisher();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const admin = countyStoryAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unable to validate." }, { status: 503 });
  }
  const { id } = await ctx.params;
  const result = await validateCountyStoryMedia({
    admin,
    storage: supabaseCountyStoryStorage(admin),
    ownerId: auth.user.id,
    mediaId: id,
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({
    ok: true,
    id: result.media.id,
    state: result.media.state,
    publishReady: result.media.state === "valid",
    durationMs: result.media.duration_ms,
    container: result.media.container,
    codec: result.media.codec_video,
  });
}
