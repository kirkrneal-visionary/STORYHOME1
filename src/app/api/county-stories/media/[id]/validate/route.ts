import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import {
  supabaseCountyStoryStorage,
  validateCountyStoryMedia,
} from "@/lib/county-stories/media-service";
import { maybeStartCountyStoryProviderProcessing } from "@/lib/county-stories/provider-processing";
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
  const storage = supabaseCountyStoryStorage(admin);
  const result = await validateCountyStoryMedia({
    admin,
    storage,
    ownerId: auth.user.id,
    mediaId: id,
  });
  if (result.ok || result.code === "NOT_PLAYBACK_READY") {
    await maybeStartCountyStoryProviderProcessing({
      admin,
      storage,
      ownerId: auth.user.id,
      mediaId: id,
    });
  }
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        error: result.error,
        sourceState: result.code === "NOT_PLAYBACK_READY" ? "needs_normalization" : undefined,
        publishReady: false,
      },
      { status: result.status },
    );
  }
  return NextResponse.json({
    ok: true,
    id: result.media.id,
    state: result.media.state,
    sourceState: result.media.state,
    publishReady: false,
    durationMs: result.media.duration_ms,
    container: result.media.container,
    codec: result.media.codec_video,
  });
}
